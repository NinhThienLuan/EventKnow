package com.eventknow.backend.common.permission;

import com.eventknow.backend.modules.ingestion.service.DriveFileContentService;

import com.eventknow.backend.modules.auth.DriveTokenService;
import com.eventknow.backend.modules.auth.UserDriveConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

/**
 * Shared RLS service — resolves which raw_event IDs a given viewer is permitted
 * to read,
 * using Google Drive permissions.list as the authoritative ACL source (FR-6.2
 * Zero-Config Inheritance).
 *
 * <p>
 * NO cross-request cache by design. Callers must memoize the result once per
 * request
 * as a local variable and pass it to all downstream query methods.
 * </p>
 *
 * <p>
 * Reusable across Module 4 (Dashboard), Module 6, Module 8, Module 9.
 * </p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionFilterService {

    private final NamedParameterJdbcTemplate jdbc;
    private final UserDriveConnectionRepository connectionRepo;
    private final DriveTokenService driveTokenService;
    private final RestClient.Builder restClientBuilder;

    private static final String DRIVE_PERMISSIONS_URL = "https://www.googleapis.com/drive/v3/files/{fileId}/permissions"
            + "?fields=permissions(type,emailAddress,domain)";

    /**
     * Returns null for ADMIN (bypass RLS — sees all raw_events).
     * Returns List&lt;UUID&gt; of visible raw_event IDs for non-admin users.
     * An empty list means the viewer has no Drive access to any ingested file.
     *
     * @param viewerEmail email of the currently authenticated user
     * @param isAdmin     whether the user holds the ADMIN role
     */
    public List<UUID> getVisibleRawEventIds(String viewerEmail, boolean isAdmin) {
        if (isAdmin) {
            log.debug("RLS bypass: ADMIN user {}", viewerEmail);
            return null;
        }

        String viewerDomain = extractDomain(viewerEmail);

        // Fetch all (id, google_drive_file_id, drive_owner_email) from raw_events
        List<RawEventFileRef> refs = jdbc.query(
                "SELECT id, google_drive_file_id, drive_owner_email FROM raw_events" +
                        " WHERE google_drive_file_id IS NOT NULL",
                new MapSqlParameterSource(),
                (rs, i) -> new RawEventFileRef(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("google_drive_file_id"),
                        rs.getString("drive_owner_email")));

        List<UUID> visible = new ArrayList<>();
        for (RawEventFileRef ref : refs) {
            try {
                if (isFileVisibleToViewer(ref.fileId(), ref.uploaderEmail(), viewerEmail, viewerDomain)) {
                    visible.add(ref.rawEventId());
                }
            } catch (Exception e) {
                log.warn("Permission check failed for raw_event={} file={}: {}",
                        ref.rawEventId(), ref.fileId(), e.getMessage());
                // Fail-closed: skip file if check errors
            }
        }
        return visible;
    }

    /**
     * Checks if viewerEmail can see the given Drive file by calling
     * permissions.list
     * using the uploader's stored OAuth token (viewer need not have their own Drive
     * connection).
     */
    private boolean isFileVisibleToViewer(
            String fileId, String uploaderEmail, String viewerEmail, String viewerDomain) {

        // Use uploader's token — viewer does not need their own Drive connection
        // (FR-6.2)
        Optional<com.eventknow.backend.model.entity.Audit.UserDriveConnectionEntity> connOpt = connectionRepo
                .findByEmailAndRevokedAtIsNull(uploaderEmail);

        if (connOpt.isEmpty()) {
            log.warn("Permission check skipped: uploader {} has no active Drive connection for file {}",
                    uploaderEmail, fileId);
            return false; // Fail-closed
        }

        String refreshToken = driveTokenService.decryptToken(connOpt.get().getRefreshTokenEncrypted());
        String accessToken;
        try {
            accessToken = refreshAccessToken(refreshToken, uploaderEmail);
        } catch (Exception e) {
            log.warn("Failed to refresh Drive token for permission check, using decrypted token directly: {}",
                    e.getMessage());
            accessToken = refreshToken;
        }

        // Call Drive permissions.list
        Map<?, ?> response;
        try {
            response = restClientBuilder.build()
                    .get()
                    .uri(DRIVE_PERMISSIONS_URL, fileId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Drive permissions.list call failed for file={}: {}", fileId, e.getMessage());
            return false;
        }

        if (response == null || !response.containsKey("permissions")) {
            return false;
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> permissions = (List<Map<String, Object>>) response.get("permissions");

        for (Map<String, Object> perm : permissions) {
            String type = (String) perm.get("type");
            if (type == null)
                continue;

            switch (type) {
                case "user" -> {
                    String email = (String) perm.get("emailAddress");
                    if (viewerEmail.equalsIgnoreCase(email))
                        return true;
                }
                case "domain" -> {
                    // Must match viewer's actual domain — not "any authenticated user"
                    String permDomain = (String) perm.get("domain");
                    if (viewerDomain != null && viewerDomain.equalsIgnoreCase(permDomain))
                        return true;
                }
                case "anyone" -> {
                    // Technically visible, but log governance warning for admin awareness
                    log.warn("SECURITY [DATA-GOVERNANCE]: file {} (raw_event ref) has type=anyone permission. " +
                            "This file is publicly accessible via link. Admin should review and revoke. " +
                            "Treating as visible for viewer {}", fileId, viewerEmail);
                    return true;
                }
                // type=group: future scope — conservatively skip (not visible without explicit
                // email match)
                default -> log.debug("Unhandled permission type '{}' for file {}", type, fileId);
            }
        }
        return false;
    }

    private String extractDomain(String email) {
        if (email == null || !email.contains("@"))
            return null;
        return email.substring(email.indexOf('@') + 1);
    }

    private String refreshAccessToken(String refreshToken, String ownerEmail) {
        org.springframework.util.LinkedMultiValueMap<String, String> body = new org.springframework.util.LinkedMultiValueMap<>();
        // Client ID/secret injected via environment — reuse same pattern as
        // DriveFileContentService
        // This service is intended to be used in an environment where
        // google.client.id/secret are set
        body.add("refresh_token", refreshToken);
        body.add("grant_type", "refresh_token");

        // Delegate to a shared token exchange — replicates DriveFileContentService
        // pattern
        // TODO: extract token exchange into a shared utility to avoid duplication
        // (technical debt)
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restClientBuilder.build()
                    .post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            if (resp == null || !resp.containsKey("access_token")) {
                throw new RuntimeException("Token refresh returned no access_token for " + ownerEmail);
            }
            return (String) resp.get("access_token");
        } catch (Exception e) {
            throw new RuntimeException("Cannot refresh Drive token for uploader " + ownerEmail + ": " + e.getMessage(),
                    e);
        }
    }

    /** Projection record for raw_event permission check batch. */
    private record RawEventFileRef(UUID rawEventId, String fileId, String uploaderEmail) {
    }
}