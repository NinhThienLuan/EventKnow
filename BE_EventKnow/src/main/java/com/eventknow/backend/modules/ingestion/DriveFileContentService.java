package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.UserDriveConnectionEntity;
import com.eventknow.backend.modules.auth.DriveTokenService;
import com.eventknow.backend.modules.auth.UserDriveConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DriveFileContentService {

    private final UserDriveConnectionRepository connectionRepository;
    private final DriveTokenService driveTokenService;
    private final RestClient restClient = RestClient.builder().build();

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    public byte[] downloadFileContent(String googleDriveFileId, String ownerEmail) {
        log.info("Starting download of Google Drive file: {} for owner: {}", googleDriveFileId, ownerEmail);

        if (googleDriveFileId == null || googleDriveFileId.trim().isEmpty()) {
            throw new IllegalArgumentException("Google Drive File ID cannot be null or empty");
        }

        UserDriveConnectionEntity conn = connectionRepository.findByEmailAndRevokedAtIsNull(ownerEmail)
                .orElseThrow(() -> new DriveConnectionExpiredException(
                        "Google Drive connection credentials not found or revoked for email: " + ownerEmail));

        String decryptedRefreshToken = driveTokenService.decryptToken(conn.getRefreshTokenEncrypted());
        if (decryptedRefreshToken == null || decryptedRefreshToken.trim().isEmpty()) {
            throw new DriveConnectionExpiredException("Decrypted refresh token is empty for email: " + ownerEmail);
        }

        String accessToken;
        try {
            accessToken = refreshAccessToken(decryptedRefreshToken, ownerEmail);
        } catch (DriveConnectionExpiredException e) {
            log.warn("Failed to refresh Google token (might be a short-lived access token). Using it directly: {}",
                    e.getMessage());
            accessToken = decryptedRefreshToken;
        }
        return downloadContent(googleDriveFileId, accessToken);
    }

    private String refreshAccessToken(String refreshToken, String ownerEmail) {
        log.info("Refreshing Google API access token using refresh token for email: {}", ownerEmail);
        try {
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("client_id", clientId);
            body.add("client_secret", clientSecret);
            body.add("refresh_token", refreshToken);
            body.add("grant_type", "refresh_token");

            Map<?, ?> response = restClient.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, responseEntity) -> {
                        throw new DriveConnectionExpiredException(
                                "Google OAuth token refresh failed: " + responseEntity.getStatusCode());
                    })
                    .body(Map.class);

            if (response == null || !response.containsKey("access_token")) {
                throw new DriveConnectionExpiredException(
                        "Null or invalid access token response from Google OAuth server for " + ownerEmail);
            }

            return (String) response.get("access_token");
        } catch (Exception e) {
            log.error("Google token refresh failed for owner: {}", ownerEmail, e);
            if (e instanceof DriveConnectionExpiredException) {
                throw (DriveConnectionExpiredException) e;
            }
            throw new DriveConnectionExpiredException(
                    "Exception encountered while exchanging refresh token: " + e.getMessage(), e);
        }
    }

    private byte[] downloadContent(String googleDriveFileId, String accessToken) {
        log.info("Downloading file media from Drive API: {}", googleDriveFileId);
        try {
            String uri = "https://www.googleapis.com/drive/v3/files/" + googleDriveFileId + "?alt=media";
            return restClient.get()
                    .uri(uri)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, response) -> {
                        if (response.getStatusCode().equals(HttpStatus.UNAUTHORIZED)
                                || response.getStatusCode().equals(HttpStatus.FORBIDDEN)) {
                            throw new DriveConnectionExpiredException(
                                    "Unauthorized access to Drive file (check scopes): " + response.getStatusCode());
                        }
                        throw new RuntimeException("Drive API download error status: " + response.getStatusCode());
                    })
                    .body(byte[].class);
        } catch (Exception e) {
            log.error("Drive download failed for file: {}", googleDriveFileId, e);
            if (e instanceof DriveConnectionExpiredException) {
                throw (DriveConnectionExpiredException) e;
            }
            throw new RuntimeException("Failed to download file from Google Drive: " + e.getMessage(), e);
        }
    }
}
