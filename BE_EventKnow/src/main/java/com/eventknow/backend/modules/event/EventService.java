package com.eventknow.backend.modules.event;

import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.modules.identity.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final NamedParameterJdbcTemplate jdbc;
    private final EventRepository eventRepository;

    public static final String UNCLASSIFIED_DEPARTMENT = "Chưa phân loại";

    /**
     * Get Source Tree Structure
     */
    public Map<String, Object> getSourceTree(List<UUID> visibleRawEventIds) {
        log.info("Fetching Source Tree hierarchy. RLS scope size: {}",
                visibleRawEventIds != null ? visibleRawEventIds.size() : "UNRESTRICTED (ADMIN)");

        // If not admin and RLS visible list is empty, return empty tree
        if (visibleRawEventIds != null && visibleRawEventIds.isEmpty()) {
            return Map.of("departments", List.of());
        }

        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ");
        sql.append("  e.department, ");
        sql.append("  EXTRACT(YEAR FROM e.event_date) AS event_year, ");
        sql.append("  EXTRACT(QUARTER FROM e.event_date) AS event_quarter, ");
        sql.append("  e.id AS event_id, ");
        sql.append("  e.event_name, ");
        sql.append("  e.event_date ");
        sql.append("FROM events e ");
        sql.append("JOIN raw_events re ON re.event_id = e.id ");
        sql.append("WHERE e.is_active = true ");

        if (visibleRawEventIds != null) {
            params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
            sql.append("  AND re.id = ANY(:visibleRawEventIds::uuid[]) ");
        }

        sql.append("GROUP BY e.id, e.department, e.event_date ");
        sql.append("ORDER BY e.department ASC, event_year DESC, event_quarter DESC, e.event_date DESC");

        List<TreeEventRow> rows = jdbc.query(sql.toString(), params, (rs, rowNum) -> {
            TreeEventRow row = new TreeEventRow();
            row.department = rs.getString("department");
            if (row.department == null || row.department.trim().isEmpty()
                    || row.department.equalsIgnoreCase("UNMAPPED")) {
                row.department = UNCLASSIFIED_DEPARTMENT;
            }
            double yrVal = rs.getDouble("event_year");
            row.year = rs.wasNull() ? null : (int) yrVal;

            double qtrVal = rs.getDouble("event_quarter");
            row.quarter = rs.wasNull() ? null : (int) qtrVal;

            row.eventId = rs.getObject("event_id", UUID.class);
            row.eventName = rs.getString("event_name");
            row.eventDate = rs.getDate("event_date") != null ? rs.getDate("event_date").toString() : null;
            return row;
        });

        return buildTreeFromRows(rows);
    }

    /**
     * Get Aggregated Event Details
     */
    public Map<String, Object> getEventDetail(UUID eventId, List<UUID> visibleRawEventIds) {
        log.info("Fetching Event Details for eventId={}", eventId);

        EventEntity event = eventRepository.findByIdAndIsActiveTrue(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        // 1. Fetch raw events
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("eventId", eventId);

        StringBuilder reSql = new StringBuilder();
        reSql.append("SELECT ");
        reSql.append("  re.id AS raw_event_id, ");
        reSql.append("  re.event_name, ");
        reSql.append("  re.source_type, ");
        reSql.append("  re.source_file_name, ");
        reSql.append("  re.sheet_name, ");
        reSql.append("  re.drive_folder_path ");
        reSql.append("FROM raw_events re ");
        reSql.append("WHERE re.event_id = :eventId ");

        if (visibleRawEventIds != null) {
            params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
            reSql.append("  AND re.id = ANY(:visibleRawEventIds::uuid[])");
        }

        List<Map<String, Object>> rawEvents = jdbc.query(reSql.toString(), params, (rs, rowNum) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("rawEventId", rs.getObject("raw_event_id", UUID.class).toString());
            map.put("eventName", rs.getString("event_name"));
            map.put("sourceType", rs.getString("source_type"));
            map.put("sourceFileName", rs.getString("source_file_name"));
            map.put("sheetName", rs.getString("sheet_name") != null ? rs.getString("sheet_name") : "");
            map.put("driveFolderPath",
                    rs.getString("drive_folder_path") != null ? rs.getString("drive_folder_path") : "");
            return map;
        });

        // Deduplicate raw events list keying by sourceFileName and sheetName
        List<Map<String, Object>> uniqueRawEvents = new ArrayList<>();
        Set<String> seenSources = new HashSet<>();
        for (Map<String, Object> re : rawEvents) {
            String key = re.get("sourceFileName") + "::" + re.get("sheetName");
            if (seenSources.add(key)) {
                uniqueRawEvents.add(re);
            }
        }
        rawEvents = uniqueRawEvents;

        // If normal user has no access to any raw event under this canonical event,
        // throw Forbidden
        if (visibleRawEventIds != null && rawEvents.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access to this event is restricted");
        }

        // 2. Fetch attendee attendance details
        StringBuilder eaSql = new StringBuilder();
        eaSql.append("SELECT ");
        eaSql.append("  ap.id AS attendee_profile_id, ");
        eaSql.append("  ap.full_name, ");
        eaSql.append("  ap.email, ");
        eaSql.append("  o.org_name AS organization_name, ");
        eaSql.append("  COALESCE(MAX(ap_orig.attendee_role), 'GUEST') AS attendee_role, ");
        eaSql.append("  MAX(re.source_type) AS source_type, ");
        eaSql.append("  COALESCE(BOOL_OR(ea.is_deleted_in_source), false) AS is_deleted_in_source ");
        eaSql.append("FROM event_attendance ea ");
        eaSql.append("JOIN raw_events re ON ea.raw_event_id = re.id ");
        eaSql.append("LEFT JOIN attendee_profiles ap_orig ON ea.attendee_profile_id = ap_orig.id ");
        eaSql.append("LEFT JOIN attendee_profiles ap ON ap.id = COALESCE(ap_orig.merged_into_id, ap_orig.id) ");
        eaSql.append("LEFT JOIN organizations o ON ap.organization_id = o.id ");
        eaSql.append("WHERE re.event_id = :eventId ");
        eaSql.append("  AND ap.is_active = true ");

        if (visibleRawEventIds != null) {
            eaSql.append("  AND re.id = ANY(:visibleRawEventIds::uuid[])");
        }

        eaSql.append("GROUP BY ap.id, ap.full_name, ap.email, o.org_name ");
        eaSql.append("ORDER BY ap.full_name ASC");

        List<Map<String, Object>> attendees = jdbc.query(eaSql.toString(), params, (rs, rowNum) -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("attendeeProfileId", rs.getObject("attendee_profile_id", UUID.class).toString());
            map.put("fullName", rs.getString("full_name"));
            map.put("email", rs.getString("email") != null ? rs.getString("email") : "");
            map.put("organizationName",
                    rs.getString("organization_name") != null ? rs.getString("organization_name") : "");
            map.put("attendeeRole", rs.getString("attendee_role"));
            map.put("sourceType", rs.getString("source_type"));
            map.put("isDeletedInSource", rs.getBoolean("is_deleted_in_source"));
            return map;
        });

        // Assemble canonical details
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("eventId", event.getId().toString());
        result.put("eventName", event.getEventName());
        result.put("eventDate", event.getEventDate() != null ? event.getEventDate().toString() : "Chưa xác định");
        result.put("department", (event.getDepartment() != null && !event.getDepartment().equalsIgnoreCase("UNMAPPED"))
                ? event.getDepartment()
                : UNCLASSIFIED_DEPARTMENT);
        result.put("topicTags", event.getTopicTags() != null ? event.getTopicTags() : Collections.emptyList());
        result.put("rawEvents", rawEvents);
        result.put("attendees", attendees);

        return result;
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateTopicTags(UUID eventId, List<String> topicTags, List<UUID> visibleRawEventIds) {
        if (topicTags == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topicTags body is required");
        }

        EventEntity event = eventRepository.findByIdAndIsActiveTrue(eventId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));

        // RLS Check: enforce visibleRawEventIds scope
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("eventId", eventId);
        StringBuilder reSql = new StringBuilder("SELECT COUNT(*) FROM raw_events WHERE event_id = :eventId");
        if (visibleRawEventIds != null) {
            params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
            reSql.append(" AND id = ANY(:visibleRawEventIds::uuid[])");
        }
        Integer count = jdbc.queryForObject(reSql.toString(), params, java.lang.Integer.class);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access to this event is restricted");
        }

        // Tag deduplication, trimming, constraint validation
        List<String> cleanedTags = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String tag : topicTags) {
            if (tag == null)
                continue;
            String clean = tag.trim();
            if (clean.isEmpty())
                continue;
            if (seen.add(clean.toLowerCase())) {
                cleanedTags.add(clean);
            }
        }

        if (cleanedTags.size() > 20) {
            cleanedTags = cleanedTags.subList(0, 20);
        }

        if (cleanedTags.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "topicTags cannot be empty");
        }

        event.setTopicTags(cleanedTags);
        eventRepository.save(event);
    }

    public List<String> getPopularTags() {
        String sql = "SELECT tag, COUNT(*) AS cnt FROM (" +
                "  SELECT unnest(expertise_tags) AS tag " +
                "  FROM attendee_profiles " +
                "  WHERE is_active = true" +
                ") t " +
                "GROUP BY tag " +
                "ORDER BY cnt DESC " +
                "LIMIT 30";
        return jdbc.query(sql, new MapSqlParameterSource(), (rs, rowNum) -> rs.getString("tag"));
    }

    private Map<String, Object> buildTreeFromRows(List<TreeEventRow> rows) {
        // Group by Department -> Year -> Quarter
        Map<String, Map<String, Map<String, List<Map<String, Object>>>>> treeStructure = new LinkedHashMap<>();

        for (TreeEventRow row : rows) {
            String deptKey = row.department;
            String yearKey = row.year != null ? row.year.toString() : "Chưa xác định";
            String quarterKey = row.quarter != null ? "Q" + row.quarter : "Chưa xác định";

            treeStructure
                    .computeIfAbsent(deptKey, k -> new LinkedHashMap<>())
                    .computeIfAbsent(yearKey, k -> new LinkedHashMap<>())
                    .computeIfAbsent(quarterKey, k -> new ArrayList<>());

            Map<String, Object> evtInfo = new LinkedHashMap<>();
            evtInfo.put("eventId", row.eventId.toString());
            evtInfo.put("eventName", row.eventName);
            evtInfo.put("eventDate", row.eventDate != null ? row.eventDate : "Chưa xác định");

            treeStructure.get(deptKey).get(yearKey).get(quarterKey).add(evtInfo);
        }

        // Project to requested JSON shape:
        // {
        // "departments": [
        // {
        // "department": "...",
        // "eventCount": X,
        // "years": [
        // {
        // "year": "...",
        // "eventCount": Y,
        // "quarters": [
        // {
        // "quarter": "...",
        // "eventCount": Z,
        // "events": [...]
        // }
        // ]
        // }
        // ]
        // }
        // ]
        // }
        List<Map<String, Object>> departmentsList = new ArrayList<>();

        for (Map.Entry<String, Map<String, Map<String, List<Map<String, Object>>>>> deptEntry : treeStructure
                .entrySet()) {
            Map<String, Object> deptNode = new LinkedHashMap<>();
            deptNode.put("department", deptEntry.getKey());

            List<Map<String, Object>> yearsList = new ArrayList<>();
            int deptEventCount = 0;

            for (Map.Entry<String, Map<String, List<Map<String, Object>>>> yearEntry : deptEntry.getValue()
                    .entrySet()) {
                Map<String, Object> yearNode = new LinkedHashMap<>();
                yearNode.put("year", yearEntry.getKey());

                List<Map<String, Object>> quartersList = new ArrayList<>();
                int yearEventCount = 0;

                for (Map.Entry<String, List<Map<String, Object>>> quarterEntry : yearEntry.getValue().entrySet()) {
                    Map<String, Object> quarterNode = new LinkedHashMap<>();
                    quarterNode.put("quarter", quarterEntry.getKey());
                    int quarterEventCount = quarterEntry.getValue().size();
                    quarterNode.put("eventCount", quarterEventCount);
                    quarterNode.put("events", quarterEntry.getValue());

                    quartersList.add(quarterNode);
                    yearEventCount += quarterEventCount;
                }

                yearNode.put("eventCount", yearEventCount);
                yearNode.put("quarters", quartersList);
                yearsList.add(yearNode);

                deptEventCount += yearEventCount;
            }

            deptNode.put("eventCount", deptEventCount);
            deptNode.put("years", yearsList);
            departmentsList.add(deptNode);
        }

        Map<String, Object> wrapper = new LinkedHashMap<>();
        wrapper.put("departments", departmentsList);
        return wrapper;
    }

    private static class TreeEventRow {
        String department;
        Integer year;
        Integer quarter;
        UUID eventId;
        String eventName;
        String eventDate;
    }
}
