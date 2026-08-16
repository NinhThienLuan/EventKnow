package com.eventknow.backend.modules.dashboard;

import com.eventknow.backend.modules.dashboard.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Module 4 — Deterministic Analytics Service.
 *
 * <p>
 * 100% SQL via NamedParameterJdbcTemplate. No JPA entities or repositories.
 * Avoids Hibernate dirty-checking overhead for pure read/aggregate queries.
 * </p>
 *
 * <p>
 * RLS contract: all event-linked queries accept {@code visibleRawEventIds}:
 * <ul>
 * <li>{@code null} — ADMIN path, no filter applied (sees all data)</li>
 * <li>empty list — user with no Drive access, all event counts return 0</li>
 * <li>non-empty — filter: {@code AND re.id = ANY(:visibleRawEventIds)}</li>
 * </ul>
 * Callers must call PermissionFilterService once per request and pass the
 * result here.
 * </p>
 *
 * <p>
 * Invariant: all COUNT DISTINCT on attendee_profile_id / organization_id MUST
 * wrap
 * resolve_entity_id() before counting — event_attendance FK rows are not
 * migrated on merge
 * (Module 3 decision), so raw ID counting double-counts merged identities.
 * </p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardAggregateService {

    private final NamedParameterJdbcTemplate jdbc;

    // ─────────────────────────────────────────────────────────────────────────
    // Public entry points
    // ─────────────────────────────────────────────────────────────────────────

    public DashboardAggregateResponse getAggregate(
            DashboardFilterParams filters, List<UUID> visibleRawEventIds) {

        if (isEmptyAccess(visibleRawEventIds)) {
            return DashboardAggregateResponse.builder()
                    .summary(SummaryDto.builder()
                            .totalEvents(0L)
                            .totalAttendees(0L)
                            .uniqueOrganizations(0L)
                            .totalReports(0L)
                            .academicTitleBreakdown(Map.of())
                            .attendeeRoleBreakdown(Map.of())
                            .followUpFunnel(queryFollowUpFunnel())
                            .build())
                    .monthlyTrend(List.of())
                    .departmentDistribution(List.of())
                    .dataHealth(getDataHealth())
                    .build();
        }

        SummaryDto summary = buildSummary(filters, visibleRawEventIds);
        List<MonthlyTrendDto> trend = getMonthlyTrend(filters, visibleRawEventIds);
        List<DepartmentDto> deptDist = getDepartmentDistribution(filters, visibleRawEventIds);
        DataHealthDto health = getDataHealth();

        return DashboardAggregateResponse.builder()
                .summary(summary)
                .monthlyTrend(trend)
                .departmentDistribution(deptDist)
                .dataHealth(health)
                .build();
    }

    public List<TopOrganizationDto> getTopOrganizations(int limit, List<UUID> visibleRawEventIds) {
        if (isEmptyAccess(visibleRawEventIds)) {
            return List.of();
        }
        return queryTopOrganizations(limit, visibleRawEventIds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary assembly
    // ─────────────────────────────────────────────────────────────────────────

    private SummaryDto buildSummary(DashboardFilterParams f, List<UUID> visibleIds) {
        return SummaryDto.builder()
                .totalEvents(queryTotalEvents(f, visibleIds))
                .totalAttendees(queryTotalAttendees(f, visibleIds))
                .uniqueOrganizations(queryUniqueOrganizations(f, visibleIds))
                .totalReports(queryTotalReports(f))
                .academicTitleBreakdown(queryAcademicTitleBreakdown(f, visibleIds))
                .attendeeRoleBreakdown(queryAttendeeRoleBreakdown(f, visibleIds))
                .followUpFunnel(queryFollowUpFunnel())
                .showUpRate(queryShowUpRate(f, visibleIds))
                .researchDomainBreakdown(queryResearchDomainBreakdown(f, visibleIds))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.1 — Summary card queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Total canonical events matching filters (counts on events table, is_active =
     * true).
     */
    private long queryTotalEvents(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return 0L;

        String sql = "SELECT COUNT(DISTINCT e.id) FROM events e"
                + " JOIN raw_events re ON re.event_id = e.id"
                + " WHERE e.is_active = true AND re.ingestion_status = 'DONE'"
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id");

        return queryLong(sql, eventParams(f, visibleIds));
    }

    /**
     * Total distinct attendees, resolving merged identities before counting.
     * Uses resolve_entity_id('PERSON', ...) — mandatory per Module 3 merge
     * contract.
     */
    private long queryTotalAttendees(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return 0L;

        String sql = """
                SELECT COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id))
                FROM event_attendance ea
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN events e ON re.event_id = e.id
                WHERE ea.attendee_profile_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id");

        return queryLong(sql, eventParams(f, visibleIds));
    }

    /** Unique organizations (resolved through merge chain). */
    private long queryUniqueOrganizations(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return 0L;

        String sql = """
                SELECT COUNT(DISTINCT resolve_entity_id('ORGANIZATION', ea.organization_id))
                FROM event_attendance ea
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN events e ON re.event_id = e.id
                WHERE ea.organization_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id");

        return queryLong(sql, eventParams(f, visibleIds));
    }

    /** Total AI insight reports in the filtered date range. */
    private long queryTotalReports(DashboardFilterParams f) {
        return 0L;
    }

    /**
     * Calculates Show-up Rate ratio (attended count via EXCEL/SCAN_OCR over
     * registered count via GOOGLE_FORM).
     */
    private Double queryShowUpRate(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds)) {
            return null;
        }

        // 1. Attended (EXCEL, SCAN_OCR)
        String attendedSql = """
                SELECT COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id))
                FROM event_attendance ea
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN events e ON re.event_id = e.id
                WHERE ea.attendee_profile_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                  AND re.source_type IN ('EXCEL', 'SCAN_OCR')
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id");

        long attendedCount = queryLong(attendedSql, eventParams(f, visibleIds));

        // 2. Registered (GOOGLE_FORM)
        String registeredSql = """
                SELECT COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id))
                FROM event_attendance ea
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN events e ON re.event_id = e.id
                WHERE ea.attendee_profile_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                  AND re.source_type = 'GOOGLE_FORM'
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id");

        long registeredCount = queryLong(registeredSql, eventParams(f, visibleIds));

        if (registeredCount == 0L) {
            return null;
        }

        return (double) attendedCount / registeredCount;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.2 — Academic title breakdown
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Counts distinct canonical attendees per normalized academic title tag.
     *
     * <p>
     * INTENTIONAL: unnest(ap.academic_title_normalized) causes 1 person with
     * ['GS','TS']
     * to contribute to BOTH title buckets. This is by spec (Dashboard design doc,
     * "Academic Title
     * Breakdown" requirement). Do NOT "fix" by removing unnest — that would
     * incorrectly suppress
     * multi-title persons from some buckets. This is not a double-counting bug.
     * </p>
     */
    private Map<String, Integer> queryAcademicTitleBreakdown(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return Map.of();

        String sql = """
                SELECT tag, COUNT(DISTINCT resolved_id) AS cnt
                FROM (
                    SELECT resolve_entity_id('PERSON', ap.id) AS resolved_id,
                           unnest(ap.academic_title_normalized) AS tag
                    FROM attendee_profiles ap
                    JOIN event_attendance ea ON ea.attendee_profile_id = ap.id
                    JOIN raw_events re ON ea.raw_event_id = re.id
                    JOIN events e ON re.event_id = e.id
                    WHERE ap.is_active = true
                      AND re.ingestion_status = 'DONE'
                      AND ea.is_deleted_in_source = false
                    """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + academicTitleFilter(f.academicTitle())
                + rls(visibleIds, "re.id")
                + ") sub GROUP BY tag";

        return queryStringIntMap(sql, eventParams(f, visibleIds), "tag", "cnt");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.3 — Attendee role breakdown
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Integer> queryAttendeeRoleBreakdown(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return Map.of();

        String sql = """
                SELECT ap.attendee_role, COUNT(DISTINCT resolve_entity_id('PERSON', ap.id)) AS cnt
                FROM attendee_profiles ap
                JOIN event_attendance ea ON ea.attendee_profile_id = ap.id
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN events e ON re.event_id = e.id
                WHERE ap.is_active = true
                  AND ap.attendee_role IS NOT NULL
                  AND re.ingestion_status = 'DONE'
                  AND ea.is_deleted_in_source = false
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + roleFilter(f.role())
                + rls(visibleIds, "re.id")
                + " GROUP BY ap.attendee_role";

        return queryStringIntMap(sql, eventParams(f, visibleIds), "attendee_role", "cnt");
    }

    private Map<String, Integer> queryResearchDomainBreakdown(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return Map.of();

        String sql = """
                SELECT tag, COUNT(DISTINCT resolved_id) AS cnt
                FROM (
                    SELECT resolve_entity_id('PERSON', ap.id) AS resolved_id,
                           unnest(ap.research_domains) AS tag
                    FROM attendee_profiles ap
                    JOIN event_attendance ea ON ea.attendee_profile_id = ap.id
                    JOIN raw_events re ON ea.raw_event_id = re.id
                    JOIN events e ON re.event_id = e.id
                    WHERE ap.is_active = true
                      AND re.ingestion_status = 'DONE'
                      AND ea.is_deleted_in_source = false
                    """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id")
                + ") sub GROUP BY tag";

        return queryStringIntMap(sql, eventParams(f, visibleIds), "tag", "cnt");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.4 — Follow-up funnel (GLOBAL — no event/date/department filter)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Follow-up status funnel across ALL active attendees — intentionally global.
     *
     * <p>
     * follow_up_status is a CRM state of a person, not tied to a specific event or
     * time period.
     * Filtering by event date/department would produce misleading funnel data — a
     * person who attended
     * 2 departments is in 1 CRM state, not 2. Dashboard filters do NOT apply here.
     * </p>
     */
    private Map<String, Integer> queryFollowUpFunnel() {
        String sql = """
                SELECT ap.follow_up_status, COUNT(*) AS cnt
                FROM attendee_profiles ap
                WHERE ap.is_active = true
                  AND ap.follow_up_status IS NOT NULL
                GROUP BY ap.follow_up_status
                """;

        return queryStringIntMap(sql, new MapSqlParameterSource(), "follow_up_status", "cnt");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.5 — Monthly trend
    // ─────────────────────────────────────────────────────────────────────────

    private List<MonthlyTrendDto> getMonthlyTrend(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return List.of();

        String sql = """
                SELECT to_char(date_trunc('month', e.event_date), 'YYYY-MM') AS month,
                       COUNT(DISTINCT e.id) AS event_count,
                       COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id)) AS attendee_count
                FROM events e
                JOIN raw_events re ON re.event_id = e.id
                LEFT JOIN event_attendance ea
                       ON ea.raw_event_id = re.id
                      AND ea.attendee_profile_id IS NOT NULL
                      AND ea.is_deleted_in_source = false
                WHERE e.is_active = true
                  AND re.ingestion_status = 'DONE'
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id")
                + " GROUP BY month ORDER BY month ASC";

        return jdbc.query(sql, eventParams(f, visibleIds), (rs, i) -> MonthlyTrendDto.builder()
                .month(rs.getString("month"))
                .eventCount(rs.getLong("event_count"))
                .attendeeCount(rs.getLong("attendee_count"))
                .build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.6 — Department distribution
    // ─────────────────────────────────────────────────────────────────────────

    private List<DepartmentDto> getDepartmentDistribution(DashboardFilterParams f, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return List.of();

        String sql = """
                SELECT e.department,
                       COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id)) AS cnt
                FROM events e
                JOIN raw_events re ON re.event_id = e.id
                JOIN event_attendance ea ON ea.raw_event_id = re.id
                WHERE e.is_active = true
                  AND ea.attendee_profile_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                """
                + dateFilter("e.event_date", f.startDate(), f.endDate())
                + departmentFilter("e.department", f.department())
                + rls(visibleIds, "re.id")
                + " GROUP BY e.department ORDER BY cnt DESC";

        return jdbc.query(sql, eventParams(f, visibleIds), (rs, i) -> DepartmentDto.builder()
                .department(rs.getString("department"))
                .count(rs.getLong("cnt"))
                .build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.7 — Data health (GLOBAL — always system-wide, no date/user filter)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * System-wide data health indicators.
     *
     * <p>
     * Intentionally NOT filtered by date, department, or user — this reflects
     * the overall health of the ingestion and data pipeline, not a per-period view.
     * </p>
     */
    private DataHealthDto getDataHealth() {
        String sql = """
                SELECT
                  (SELECT COUNT(*) FROM event_attendance WHERE is_deleted_in_source = true)   AS deleted_in_source_count,
                  (SELECT COUNT(*) FROM raw_events WHERE department = 'UNMAPPED')             AS unmapped_department_count,
                  (SELECT COUNT(*) FROM extraction_jobs WHERE status = 'FAILED')              AS failed_extraction_job_count
                """;

        return jdbc.queryForObject(sql, new MapSqlParameterSource(), (rs, i) -> DataHealthDto.builder()
                .deletedInSourceCount(rs.getLong("deleted_in_source_count"))
                .unmappedDepartmentCount(rs.getLong("unmapped_department_count"))
                .failedExtractionJobCount(rs.getLong("failed_extraction_job_count"))
                .build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2.8 — Top organizations (separate endpoint)
    // ─────────────────────────────────────────────────────────────────────────

    private List<TopOrganizationDto> queryTopOrganizations(int limit, List<UUID> visibleIds) {
        if (isEmptyAccess(visibleIds))
            return List.of();

        String sql = """
                SELECT resolve_entity_id('ORGANIZATION', ea.organization_id) AS org_id,
                       o.org_name,
                       COUNT(DISTINCT resolve_entity_id('PERSON', ea.attendee_profile_id)) AS attendee_count
                FROM event_attendance ea
                JOIN raw_events re ON ea.raw_event_id = re.id
                JOIN organizations o
                  ON o.id = resolve_entity_id('ORGANIZATION', ea.organization_id)
                WHERE ea.organization_id IS NOT NULL
                  AND ea.is_deleted_in_source = false
                  AND re.ingestion_status = 'DONE'
                """
                + rls(visibleIds, "re.id")
                + """
                        GROUP BY resolve_entity_id('ORGANIZATION', ea.organization_id), o.org_name
                        ORDER BY attendee_count DESC
                        LIMIT :limit
                        """;

        MapSqlParameterSource p = new MapSqlParameterSource();
        p.addValue("limit", Math.max(1, limit));
        applyRlsParam(p, visibleIds);

        return jdbc.query(sql, p, (rs, i) -> TopOrganizationDto.builder()
                .organizationId(UUID.fromString(rs.getString("org_id")))
                .orgName(rs.getString("org_name"))
                .attendeeCount(rs.getLong("attendee_count"))
                .build());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WHERE clause builders — named params only, no string concat of values
    // ─────────────────────────────────────────────────────────────────────────

    /** Returns "JOIN raw_events re ON re.event_id = e.id" when RLS applies. */
    private String eventJoinClause(List<UUID> visibleIds) {
        return (visibleIds != null) ? " JOIN raw_events re ON re.event_id = e.id" : "";
    }

    private String dateFilter(String col, LocalDate start, LocalDate end) {
        StringBuilder sb = new StringBuilder();
        if (start != null)
            sb.append(" AND ").append(col).append(" >= :startDate");
        if (end != null)
            sb.append(" AND ").append(col).append(" <= :endDate");
        return sb.toString();
    }

    private String departmentFilter(String col, String dept) {
        return dept != null ? " AND " + col + " = :department" : "";
    }

    private String academicTitleFilter(String title) {
        return title != null ? " AND :academicTitle = ANY(ap.academic_title_normalized)" : "";
    }

    private String roleFilter(String role) {
        return role != null ? " AND ap.attendee_role = :role" : "";
    }

    /**
     * Appends RLS condition using named param array.
     * null visibleIds = ADMIN bypass (no condition). Empty = impossible path
     * (caller returns 0 early).
     */
    private String rls(List<UUID> visibleIds, String col) {
        return (visibleIds != null) ? " AND " + col + " = ANY(:visibleRawEventIds)" : "";
    }

    private MapSqlParameterSource eventParams(DashboardFilterParams f, List<UUID> visibleIds) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (f.startDate() != null)
            p.addValue("startDate", f.startDate());
        if (f.endDate() != null)
            p.addValue("endDate", f.endDate());
        if (f.department() != null)
            p.addValue("department", f.department());
        if (f.academicTitle() != null)
            p.addValue("academicTitle", f.academicTitle());
        if (f.role() != null)
            p.addValue("role", f.role());
        applyRlsParam(p, visibleIds);
        return p;
    }

    private void applyRlsParam(MapSqlParameterSource p, List<UUID> visibleIds) {
        if (visibleIds != null) {
            p.addValue("visibleRawEventIds", visibleIds.toArray(UUID[]::new));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns true if user has no access at all — short-circuits to 0/empty without
     * hitting DB.
     */
    private boolean isEmptyAccess(List<UUID> visibleIds) {
        return visibleIds != null && visibleIds.isEmpty();
    }

    private long queryLong(String sql, MapSqlParameterSource p) {
        Long result = jdbc.queryForObject(sql, p, Long.class);
        return result != null ? result : 0L;
    }

    private Map<String, Integer> queryStringIntMap(
            String sql, MapSqlParameterSource p, String keyCol, String valCol) {
        return jdbc.query(sql, p, (rs, i) -> Map.entry(rs.getString(keyCol), rs.getInt(valCol)))
                .stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
