package com.eventknow.backend.modules.search;

import com.eventknow.backend.modules.ingestion.service.ExtractionResultProcessor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.eventknow.backend.common.permission.PermissionFilterService;
import com.eventknow.backend.modules.search.dto.SearchAttendeeDto;
import com.eventknow.backend.modules.search.dto.SearchEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchService {

    private final NamedParameterJdbcTemplate jdbc;
    private final PermissionFilterService permissionFilterService;
    private final ObjectMapper objectMapper;

    public Page<SearchAttendeeDto> searchAttendees(
            String query,
            LocalDate startDate,
            LocalDate endDate,
            List<String> researchDomains,
            List<String> expertiseTags,
            String academicTitle,
            String role,
            String department,
            int page,
            int size,
            String viewerEmail,
            boolean isAdmin) {
        log.info("Advanced Search triggered. query={}, role={}, dept={}, page={}, size={}", query, role, department,
                page, size);

        // 1. RLS verification
        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
        if (visibleRawEventIds != null && visibleRawEventIds.isEmpty()) {
            log.info("RLS short-circuit: viewer has no access to any event.");
            return new PageImpl<>(List.of(), PageRequest.of(page, size), 0);
        }

        // 2. Prepare query binding parameters
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("startDate", startDate);
        params.addValue("endDate", endDate);
        params.addValue("department", department);
        params.addValue("role", role);
        params.addValue("academicTitle", academicTitle);
        params.addValue("limit", size);
        params.addValue("offset", page * size);

        if (visibleRawEventIds != null) {
            params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
        }

        // Research domains array mapping
        if (researchDomains != null && !researchDomains.isEmpty()) {
            params.addValue("researchDomains", researchDomains.toArray(String[]::new));
        } else {
            params.addValue("researchDomains", null);
        }

        // Expertise tags array mapping
        if (expertiseTags != null && !expertiseTags.isEmpty()) {
            params.addValue("expertiseTags", expertiseTags.toArray(String[]::new));
        } else {
            params.addValue("expertiseTags", null);
        }

        // Fuzzy query binding pattern pre-building (no direct string concat into SQL
        // texts)
        String queryPattern = null;
        if (query != null && !query.trim().isEmpty()) {
            String normalizedQuery = ExtractionResultProcessor
                    .normalizeString(query.trim());
            queryPattern = "%" + normalizedQuery
                    .replace("\\", "\\\\")
                    .replace("%", "\\%")
                    .replace("_", "\\_") + "%";
        }
        params.addValue("queryPattern", queryPattern);

        // 3. Build WHERE criteria
        StringBuilder filterCriteria = new StringBuilder();
        if (visibleRawEventIds != null) {
            filterCriteria.append(" AND re.id = ANY(:visibleRawEventIds::uuid[])");
        }
        if (startDate != null) {
            filterCriteria.append(" AND e.event_date >= :startDate");
        }
        if (endDate != null) {
            filterCriteria.append(" AND e.event_date <= :endDate");
        }
        if (department != null) {
            filterCriteria.append(" AND e.department = :department");
        }
        if (role != null) {
            filterCriteria.append(" AND ap.attendee_role = :role");
        }
        if (academicTitle != null) {
            filterCriteria.append(" AND :academicTitle = ANY(ap.academic_title_normalized)");
        }
        if (researchDomains != null && !researchDomains.isEmpty()) {
            filterCriteria.append(" AND ap.research_domains && :researchDomains::varchar[]");
        }
        if (expertiseTags != null && !expertiseTags.isEmpty()) {
            filterCriteria.append(" AND ap.expertise_tags && :expertiseTags::varchar[]");
        }
        if (queryPattern != null) {
            filterCriteria.append(
                    " AND (ap.normalized_name ILIKE :queryPattern OR ap.email ILIKE :queryPattern OR o.normalized_name ILIKE :queryPattern)");
        }

        String criteria = filterCriteria.toString();

        // 4. Count Query
        String countSql = "SELECT COUNT(DISTINCT ap.id) " +
                "FROM attendee_profiles ap " +
                "LEFT JOIN attendee_profiles ap_orig ON COALESCE(ap_orig.merged_into_id, ap_orig.id) = ap.id " +
                "LEFT JOIN event_attendance ea ON ap_orig.id = ea.attendee_profile_id AND ea.is_deleted_in_source = false "
                +
                "LEFT JOIN raw_events re ON ea.raw_event_id = re.id " +
                "LEFT JOIN events e ON re.event_id = e.id " +
                "LEFT JOIN organizations o ON ap.organization_id = o.id " +
                "WHERE ap.is_active = true AND ap.merged_into_id IS NULL" +
                criteria;

        Long totalLong = jdbc.queryForObject(countSql, params, Long.class);
        long total = totalLong != null ? totalLong : 0;

        if (total == 0) {
            return new PageImpl<>(List.of(), PageRequest.of(page, size), 0);
        }

        // 5. Data Content Query
        String dataSql = "SELECT " +
                "  ap.id AS resolved_person_id, " +
                "  ap.full_name, " +
                "  ap.email, " +
                "  ap.academic_title_normalized, " +
                "  ap.attendee_role, " +
                "  ap.position, " +
                "  o.org_name AS organization_name, " +
                "  ap.research_domains, " +
                "  ap.expertise_tags, " +
                "  COUNT(DISTINCT re.event_id) AS total_events_attended, " +
                "  COALESCE( " +
                "    json_agg(DISTINCT jsonb_build_object( " +
                "      'eventId', e.id, " +
                "      'eventName', e.event_name, " +
                "      'eventDate', e.event_date, " +
                "      'department', e.department, " +
                "      'attendeeRole', ap_orig.attendee_role " +
                "    )) FILTER (WHERE e.id IS NOT NULL), " +
                "    '[]'::json " +
                "  ) AS events " +
                "FROM attendee_profiles ap " +
                "LEFT JOIN attendee_profiles ap_orig ON COALESCE(ap_orig.merged_into_id, ap_orig.id) = ap.id " +
                "LEFT JOIN event_attendance ea ON ap_orig.id = ea.attendee_profile_id AND ea.is_deleted_in_source = false "
                +
                "LEFT JOIN raw_events re ON ea.raw_event_id = re.id " +
                "LEFT JOIN events e ON re.event_id = e.id " +
                "LEFT JOIN organizations o ON ap.organization_id = o.id " +
                "WHERE ap.is_active = true AND ap.merged_into_id IS NULL" +
                criteria + " " +
                "GROUP BY ap.id, o.org_name " +
                "ORDER BY ap.full_name ASC " +
                "LIMIT :limit OFFSET :offset";

        List<SearchAttendeeDto> content = jdbc.query(dataSql, params, (rs, rowNum) -> {
            try {
                return mapRowToAttendee(rs);
            } catch (Exception e) {
                log.error("Failed to map search row to DTO", e);
                throw new SQLException("Deserialization failed", e);
            }
        });

        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    private SearchAttendeeDto mapRowToAttendee(ResultSet rs) throws SQLException, Exception {
        UUID resolvedPersonId = rs.getObject("resolved_person_id", UUID.class);
        String fullName = rs.getString("full_name");
        String email = rs.getString("email");
        String organizationName = rs.getString("organization_name");
        String attendeeRole = rs.getString("attendee_role");
        String position = rs.getString("position");
        long totalEvents = rs.getLong("total_events_attended");

        List<String> academicTitles = convertSqlArrayToList(rs.getArray("academic_title_normalized"));
        List<String> researchDomains = convertSqlArrayToList(rs.getArray("research_domains"));
        List<String> expertiseTags = convertSqlArrayToList(rs.getArray("expertise_tags"));

        // Deserialize json_agg events payload
        String eventsJson = rs.getString("events");
        List<SearchEventDto> eventsList = new ArrayList<>();
        if (eventsJson != null && !eventsJson.trim().isEmpty()) {
            eventsList = objectMapper.readValue(eventsJson, new TypeReference<List<SearchEventDto>>() {
            });
        }

        // Techdebt note: If new domains are introduced to research_domain_master, we
        // must keep this classification matching updated.
        Boolean isCrossDomain = checkIsCrossDomain(organizationName, eventsList);

        log.debug("Mapped attendee={} org='{}' -> isCrossDomain={}", fullName, organizationName, isCrossDomain);

        return SearchAttendeeDto.builder()
                .resolvedPersonId(resolvedPersonId)
                .fullName(fullName)
                .email(email)
                .organizationName(organizationName)
                .academicTitle(academicTitles)
                .attendeeRole(attendeeRole)
                .position(position)
                .researchDomains(researchDomains)
                .expertiseTags(expertiseTags)
                .totalEventsAttended(totalEvents)
                .isCrossDomain(isCrossDomain)
                .events(eventsList)
                .build();
    }

    /**
     * Strict domain classification checks. Mismatches map to true, matches map to
     * false, otherwise null (N/A).
     */
    private Boolean checkIsCrossDomain(String orgName, List<SearchEventDto> events) {
        if (orgName == null || orgName.trim().isEmpty() || events == null || events.isEmpty()) {
            return null;
        }
        String cleanOrg = orgName.toLowerCase();

        // Classify Organization
        String orgDomain = null;
        if (cleanOrg.contains("y dược") || cleanOrg.contains("y tế") || cleanOrg.contains("bệnh viện")
                || cleanOrg.contains("sức khỏe") || cleanOrg.contains("medical")) {
            orgDomain = "MED";
        } else if (cleanOrg.contains("nông nghiệp") || cleanOrg.contains("lâm nghiệp") || cleanOrg.contains("agri")) {
            orgDomain = "AGRI";
        } else if (cleanOrg.contains("bách khoa") || cleanOrg.contains("công nghệ") || cleanOrg.contains("tin học")
                || cleanOrg.contains("hust") || cleanOrg.contains("cntt") || cleanOrg.contains("tech")) {
            orgDomain = "TECH";
        }

        if (orgDomain == null) {
            return null; // Return N/A if org domain is not identifiable
        }

        for (SearchEventDto event : events) {
            String dept = event.getDepartment();
            String name = event.getEventName();
            if (dept == null)
                dept = "";
            if (name == null)
                name = "";

            String cleanEvent = (dept + " " + name).toLowerCase();

            // Classify Event
            String eventDomain = null;
            if (cleanEvent.contains("y khoa") || cleanEvent.contains("y tế") || cleanEvent.contains("dược")
                    || cleanEvent.contains("medical") || cleanEvent.contains("sức khỏe")) {
                eventDomain = "MED";
            } else if (cleanEvent.contains("nông nghiệp") || cleanEvent.contains("agri")
                    || cleanEvent.contains("nông thôn") || cleanEvent.contains("trồng trọt")) {
                eventDomain = "AGRI";
            } else if (cleanEvent.contains("ai") || cleanEvent.contains("trí tuệ nhân tạo")
                    || cleanEvent.contains("computer science") || cleanEvent.contains("cs")
                    || cleanEvent.contains("công nghệ") || cleanEvent.contains("cntt") || cleanEvent.contains("tech")) {
                eventDomain = "TECH";
            }

            if (eventDomain != null && !orgDomain.equals(eventDomain)) {
                return true; // Match found mismatch!
            }
        }
        return false;
    }

    private List<String> convertSqlArrayToList(Array pgArray) throws SQLException {
        if (pgArray == null) {
            return List.of();
        }
        String[] arr = (String[]) pgArray.getArray();
        return arr != null ? Arrays.asList(arr) : List.of();
    }
}