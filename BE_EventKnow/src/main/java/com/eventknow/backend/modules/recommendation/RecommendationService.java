package com.eventknow.backend.modules.recommendation;

import com.eventknow.backend.common.permission.PermissionFilterService;
import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.modules.identity.EventRepository;
import com.eventknow.backend.modules.recommendation.dto.RecommendGuestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Array;
import java.sql.SQLException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final NamedParameterJdbcTemplate jdbc;
    private final EventRepository eventRepository;
    private final PermissionFilterService permissionFilterService;

    /**
     * Finds recommended guests for a target event based on content-based tag
     * overlap.
     * Enforces event-level RLS.
     */
    public Page<RecommendGuestDto> getRecommendedGuests(
            UUID eventId,
            int minOverlapCount,
            int page,
            int size,
            String viewerEmail,
            boolean isAdmin) {

        log.info("Fetching recommendations for eventId={}, minOverlap={}, page={}, size={}",
                eventId, minOverlapCount, page, size);

        // 1. Fetch Event and verify existence
        EventEntity event = eventRepository.findByIdAndIsActiveTrue(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        // 2. Event-level RLS validation
        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
        if (visibleRawEventIds != null) {
            if (visibleRawEventIds.isEmpty()) {
                log.info("RLS denial: User has no visible raw events.");
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to target event");
            }

            // Check if this event contains at least one raw event file visible to user
            String checkSql = "SELECT EXISTS(SELECT 1 FROM raw_events WHERE event_id = :eventId AND id = ANY(:visibleRawEventIds::uuid[]))";
            MapSqlParameterSource checkParams = new MapSqlParameterSource()
                    .addValue("eventId", eventId)
                    .addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
            Boolean isEventVisible = jdbc.queryForObject(checkSql, checkParams, Boolean.class);
            if (isEventVisible == null || !isEventVisible) {
                log.info("RLS denial: Target event={} has no raw events visible to user={}.", eventId, viewerEmail);
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to target event");
            }
        }

        // 3. Exposing empty warn if no topic tags present on the target event
        List<String> topicTags = event.getTopicTags();
        if (topicTags == null || topicTags.isEmpty()) {
            log.info("Event {} has empty topic tags. Returning dry page result.", eventId);
            // Return empty PageImpl with specific dry warning
            return new PageImpl<>(List.of(), PageRequest.of(page, size), 0);
        }

        // 4. Build bind parameters
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("eventId", eventId);
        params.addValue("eventTopicTags", topicTags.toArray(String[]::new));
        params.addValue("minOverlapCount", minOverlapCount);
        params.addValue("size", size);
        params.addValue("offset", page * size);

        // 5. Query Count
        // Note: expertise_tags column is text[] in PostgreSQL — bind param must cast to
        // text[], not varchar[],
        // so that the && overlap operator is satisfied without a type mismatch error.
        String countSql = "SELECT COUNT(DISTINCT ap.id) " +
                "FROM attendee_profiles ap " +
                "CROSS JOIN LATERAL ( " +
                "  SELECT ARRAY( " +
                "    SELECT unnest(ap.expertise_tags) " +
                "    INTERSECT " +
                "    SELECT unnest(:eventTopicTags::text[]) " +
                "  ) AS tags " +
                ") mt " +
                "WHERE ap.is_active = true " +
                "  AND ap.merged_into_id IS NULL " +
                "  AND ap.expertise_tags && :eventTopicTags::text[] " +
                "  AND NOT EXISTS ( " +
                "      SELECT 1 " +
                "      FROM event_attendance ea_ex " +
                "      JOIN raw_events re_ex ON ea_ex.raw_event_id = re_ex.id " +
                "      JOIN attendee_profiles ap_orig_ex ON ea_ex.attendee_profile_id = ap_orig_ex.id " +
                "      WHERE re_ex.event_id = :eventId " +
                "        AND COALESCE(ap_orig_ex.merged_into_id, ap_orig_ex.id) = ap.id " +
                "        AND ea_ex.is_deleted_in_source = false " +
                "  ) " +
                "  AND cardinality(mt.tags) >= :minOverlapCount";

        Long totalLong = jdbc.queryForObject(countSql, params, Long.class);
        long total = totalLong != null ? totalLong : 0L;

        if (total == 0L) {
            return new PageImpl<>(List.of(), PageRequest.of(page, size), 0);
        }

        // 6. Query Content
        String contentSql = "SELECT " +
                "  ap.id AS resolved_person_id, " +
                "  ap.full_name, " +
                "  o.org_name AS organization_name, " +
                "  mt.tags AS matched_tags, " +
                "  cardinality(mt.tags) AS match_count, " +
                "  (SELECT COUNT(DISTINCT re_ea.event_id) " +
                "   FROM event_attendance ea " +
                "   JOIN raw_events re_ea ON ea.raw_event_id = re_ea.id " +
                "   JOIN attendee_profiles ap_orig ON ea.attendee_profile_id = ap_orig.id " +
                "   WHERE COALESCE(ap_orig.merged_into_id, ap_orig.id) = ap.id " +
                "     AND ea.is_deleted_in_source = false) AS total_events_attended " +
                "FROM attendee_profiles ap " +
                "LEFT JOIN organizations o ON ap.organization_id = o.id " +
                "CROSS JOIN LATERAL ( " +
                "  SELECT ARRAY( " +
                "    SELECT unnest(ap.expertise_tags) " +
                "    INTERSECT " +
                "    SELECT unnest(:eventTopicTags::text[]) " +
                "  ) AS tags " +
                ") mt " +
                "WHERE ap.is_active = true " +
                "  AND ap.merged_into_id IS NULL " +
                "  AND ap.expertise_tags && :eventTopicTags::text[] " +
                "  AND NOT EXISTS ( " +
                "      SELECT 1 " +
                "      FROM event_attendance ea_ex " +
                "      JOIN raw_events re_ex ON ea_ex.raw_event_id = re_ex.id " +
                "      JOIN attendee_profiles ap_orig_ex ON ea_ex.attendee_profile_id = ap_orig_ex.id " +
                "      WHERE re_ex.event_id = :eventId " +
                "        AND COALESCE(ap_orig_ex.merged_into_id, ap_orig_ex.id) = ap.id " +
                "        AND ea_ex.is_deleted_in_source = false " +
                "  ) " +
                "  AND cardinality(mt.tags) >= :minOverlapCount " +
                "ORDER BY match_count DESC, ap.full_name ASC " +
                "LIMIT :size OFFSET :offset";

        List<RecommendGuestDto> content = jdbc.query(contentSql, params, (rs, rowNum) -> {
            try {
                UUID resolvedPersonId = rs.getObject("resolved_person_id", UUID.class);
                String fullName = rs.getString("full_name");
                String organizationName = rs.getString("organization_name");
                int matchCount = rs.getInt("match_count");
                long totalEvents = rs.getLong("total_events_attended");

                List<String> matchedTags = convertSqlArrayToList(rs.getArray("matched_tags"));
                // Sort for deterministic ordering in reason string and API response
                List<String> sortedMatchedTags = new ArrayList<>(matchedTags);
                Collections.sort(sortedMatchedTags);

                // Build warning reason message in Java service layer
                String reason = "Trúng tag: " + String.join(", ", sortedMatchedTags);

                return RecommendGuestDto.builder()
                        .resolvedPersonId(resolvedPersonId)
                        .fullName(fullName)
                        .organizationName(organizationName != null ? organizationName : "")
                        .matchedTags(sortedMatchedTags)
                        .matchCount(matchCount)
                        .reason(reason)
                        .totalEventsAttended(totalEvents)
                        .build();
            } catch (Exception e) {
                log.error("Failed to map recommendation row to DTO", e);
                throw new SQLException("Mapping failed", e);
            }
        });

        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    private List<String> convertSqlArrayToList(Array pgArray) throws SQLException {
        if (pgArray == null) {
            return List.of();
        }
        String[] arr = (String[]) pgArray.getArray();
        return arr != null ? Arrays.asList(arr) : List.of();
    }
}
