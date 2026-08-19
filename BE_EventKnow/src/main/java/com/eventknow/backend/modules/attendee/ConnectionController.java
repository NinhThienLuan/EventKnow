package com.eventknow.backend.modules.attendee;

import com.eventknow.backend.common.permission.PermissionFilterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Array;
import java.util.*;

@RestController
@RequestMapping("/api/connections")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Slf4j
public class ConnectionController {

    private final NamedParameterJdbcTemplate jdbc;
    private final PermissionFilterService permissionFilterService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getConnections(Authentication auth) {
        String email = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        log.info("getConnections REST endpoint called: user={}, isAdmin={}", email, isAdmin);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        boolean hasNoRlsConstraint = (visibleRawEventIds == null);

        // If not admin and RLS visible list is empty, return empty list immediately
        if (visibleRawEventIds != null && visibleRawEventIds.isEmpty()) {
            return ResponseEntity.ok(Map.of("status", "success", "data", List.of()));
        }

        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("hasNoRlsConstraint", hasNoRlsConstraint);
        if (!hasNoRlsConstraint) {
            params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
        }

        List<ConnectionDto> connections = new ArrayList<>();

        // 1. Person ↔ Organization Connections (Trực thuộc)
        StringBuilder sqlOrg = new StringBuilder();
        sqlOrg.append("SELECT ");
        sqlOrg.append("  ap.id AS source_id, ");
        sqlOrg.append("  ap.full_name AS source_name, ");
        sqlOrg.append("  ap.organization_id AS target_id, ");
        sqlOrg.append("  o.org_name AS target_name, ");
        sqlOrg.append("  COUNT(DISTINCT ea.id) AS interaction_count, ");
        sqlOrg.append(
                "  COALESCE(ARRAY_AGG(DISTINCT re.event_name) FILTER (WHERE re.event_name IS NOT NULL), '{}') AS shared_event_names, ");
        sqlOrg.append("  ap.follow_up_status AS follow_up_status ");
        sqlOrg.append("FROM attendee_profiles ap ");
        sqlOrg.append("JOIN organizations o ON ap.organization_id = o.id ");
        sqlOrg.append(
                "LEFT JOIN event_attendance ea ON ea.attendee_profile_id = ap.id AND ea.is_deleted_in_source = false ");
        sqlOrg.append("LEFT JOIN raw_events re ON re.id = ea.raw_event_id ");
        sqlOrg.append("WHERE ap.is_active = true ");
        if (!hasNoRlsConstraint) {
            sqlOrg.append("  AND (re.id = ANY(:visibleRawEventIds::uuid[]) OR re.id IS NULL) ");
        }
        sqlOrg.append("GROUP BY ap.id, ap.full_name, ap.organization_id, o.org_name, ap.follow_up_status ");
        sqlOrg.append("ORDER BY interaction_count DESC ");
        sqlOrg.append("LIMIT 50");

        List<ConnectionDto> personOrgList = jdbc.query(sqlOrg.toString(), params, (rs, rowNum) -> {
            String sourceId = rs.getObject("source_id", UUID.class).toString();
            String targetId = rs.getObject("target_id", UUID.class).toString();
            String id = "po-" + sourceId.substring(0, 8) + "-" + targetId.substring(0, 8);

            List<String> sharedEventNames = new ArrayList<>();
            Array sqlArray = rs.getArray("shared_event_names");
            if (sqlArray != null) {
                String[] arr = (String[]) sqlArray.getArray();
                if (arr != null) {
                    sharedEventNames = Arrays.asList(arr);
                }
            }

            return new ConnectionDto(
                    id,
                    sourceId,
                    rs.getString("source_name"),
                    "PERSON",
                    targetId,
                    rs.getString("target_name"),
                    "ORG",
                    "Trực thuộc",
                    rs.getInt("interaction_count"),
                    sharedEventNames,
                    rs.getString("follow_up_status"));
        });
        connections.addAll(personOrgList);

        // 2. Person ↔ Person Connections (Đồng tham dự)
        StringBuilder sqlPerson = new StringBuilder();
        sqlPerson.append("SELECT ");
        sqlPerson.append("  ea1.attendee_profile_id AS source_id, ");
        sqlPerson.append("  ap1.full_name AS source_name, ");
        sqlPerson.append("  ea2.attendee_profile_id AS target_id, ");
        sqlPerson.append("  ap2.full_name AS target_name, ");
        sqlPerson.append("  COUNT(DISTINCT ea1.raw_event_id) AS interaction_count, ");
        sqlPerson.append("  ARRAY_AGG(DISTINCT re.event_name) AS shared_event_names, ");
        sqlPerson.append("  ap1.follow_up_status AS follow_up_status ");
        sqlPerson.append("FROM event_attendance ea1 ");
        sqlPerson.append("JOIN event_attendance ea2 ON ea1.raw_event_id = ea2.raw_event_id ");
        sqlPerson.append("  AND ea1.attendee_profile_id < ea2.attendee_profile_id ");
        sqlPerson.append("  AND ea1.is_deleted_in_source = false ");
        sqlPerson.append("  AND ea2.is_deleted_in_source = false ");
        sqlPerson.append("JOIN attendee_profiles ap1 ON ap1.id = ea1.attendee_profile_id AND ap1.is_active = true ");
        sqlPerson.append("JOIN attendee_profiles ap2 ON ap2.id = ea2.attendee_profile_id AND ap2.is_active = true ");
        sqlPerson.append("JOIN raw_events re ON re.id = ea1.raw_event_id ");
        sqlPerson.append("WHERE 1=1 ");
        if (!hasNoRlsConstraint) {
            sqlPerson.append("  AND re.id = ANY(:visibleRawEventIds::uuid[]) ");
        }
        sqlPerson.append(
                "GROUP BY ea1.attendee_profile_id, ap1.full_name, ap1.follow_up_status, ea2.attendee_profile_id, ap2.full_name ");
        sqlPerson.append("ORDER BY interaction_count DESC ");
        sqlPerson.append("LIMIT 50");

        List<ConnectionDto> personPersonList = jdbc.query(sqlPerson.toString(), params, (rs, rowNum) -> {
            String sourceId = rs.getObject("source_id", UUID.class).toString();
            String targetId = rs.getObject("target_id", UUID.class).toString();
            String id = "pp-" + sourceId.substring(0, 8) + "-" + targetId.substring(0, 8);

            List<String> sharedEventNames = new ArrayList<>();
            Array sqlArray = rs.getArray("shared_event_names");
            if (sqlArray != null) {
                String[] arr = (String[]) sqlArray.getArray();
                if (arr != null) {
                    sharedEventNames = Arrays.asList(arr);
                }
            }

            return new ConnectionDto(
                    id,
                    sourceId,
                    rs.getString("source_name"),
                    "PERSON",
                    targetId,
                    rs.getString("target_name"),
                    "PERSON",
                    "Đồng tham dự",
                    rs.getInt("interaction_count"),
                    sharedEventNames,
                    rs.getString("follow_up_status"));
        });
        connections.addAll(personPersonList);

        // Sort by interaction count desc (strongest first)
        connections.sort((c1, c2) -> Integer.compare(c2.interactionCount(), c1.interactionCount()));

        return ResponseEntity.ok(Map.of("status", "success", "data", connections));
    }
}
