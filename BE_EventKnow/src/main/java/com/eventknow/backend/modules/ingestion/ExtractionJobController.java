package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.common.permission.PermissionFilterService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/extraction-jobs")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class ExtractionJobController {

    private final NamedParameterJdbcTemplate jdbc;
    private final PermissionFilterService permissionFilterService;

    @Data
    @Builder
    public static class ExtractionProgressDto {
        private String id;
        private String fileName;
        private String sheetName;
        private String department;
        private String status;
        private int progress;
        private String updatedAt;
    }

    @GetMapping
    public ResponseEntity<?> getExtractionJobs(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            Authentication auth) {

        String email = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);

        if (visibleRawEventIds != null && visibleRawEventIds.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "content", Collections.emptyList(),
                    "totalPages", 0,
                    "totalElements", 0,
                    "size", size,
                    "number", page));
        }

        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder filterSql = new StringBuilder();

        if (visibleRawEventIds != null) {
            filterSql.append(" AND re.id = ANY(:visibleRawEventIds) ");
            params.addValue("visibleRawEventIds",
                    visibleRawEventIds.stream().map(UUID::toString).toArray(String[]::new));
        }

        if (department != null && !department.trim().isEmpty() && !department.equalsIgnoreCase("ALL")) {
            filterSql.append(" AND re.department = :department ");
            params.addValue("department", department.trim());
        }

        if (search != null && !search.trim().isEmpty()) {
            filterSql.append(" AND (re.source_file_name ILIKE :search OR CAST(re.id AS VARCHAR) ILIKE :search) ");
            params.addValue("search", "%" + search.trim() + "%");
        }

        String filterSqlStr = filterSql.toString();

        // 1. Count Total Elements matching current computed status filter
        String countSql = """
                WITH job_summary AS (
                    SELECT
                        re.id AS raw_event_id,
                        re.source_file_name AS file_name,
                        re.sheet_name AS sheet_name,
                        re.department AS department,
                        re.ingestion_status AS parent_status,
                        COUNT(ej.id) AS total_jobs,
                        COUNT(CASE WHEN ej.status = 'PENDING' THEN 1 END) AS pending_jobs,
                        COUNT(CASE WHEN ej.status = 'PROCESSING' THEN 1 END) AS processing_jobs_only,
                        COUNT(CASE WHEN ej.status = 'RETRYING' THEN 1 END) AS retrying_jobs,
                        COUNT(CASE WHEN ej.status = 'DONE' THEN 1 END) AS done_jobs,
                        COUNT(CASE WHEN ej.status = 'FAILED' THEN 1 END) AS failed_jobs
                    FROM raw_events re
                    LEFT JOIN extraction_jobs ej ON ej.raw_event_id = re.id
                    WHERE 1=1
                """
                + filterSqlStr
                + """
                            GROUP BY re.id, re.source_file_name, re.sheet_name, re.department, re.ingestion_status
                        ),
                        computed_summary AS (
                            SELECT
                                raw_event_id AS id,
                                file_name AS fileName,
                                sheet_name AS sheetName,
                                department,
                                CASE
                                    WHEN total_jobs > 0 THEN
                                        CASE
                                            WHEN done_jobs = total_jobs THEN 'DONE'
                                            WHEN pending_jobs = total_jobs THEN 'PENDING'
                                            WHEN (pending_jobs > 0 OR processing_jobs_only > 0 OR retrying_jobs > 0) THEN 'PROCESSING'
                                            WHEN failed_jobs > 0 THEN 'FAILED'
                                            ELSE 'DONE'
                                        END
                                    ELSE
                                        CASE
                                            WHEN parent_status = 'FAILED' THEN 'FAILED'
                                            WHEN parent_status = 'PENDING' THEN 'PENDING'
                                            WHEN parent_status = 'PROCESSING' THEN 'PROCESSING'
                                            ELSE 'DONE'
                                        END
                                END AS status
                            FROM job_summary
                        )
                        SELECT COUNT(*) FROM computed_summary WHERE 1=1
                        """;

        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            countSql += " AND status = :status";
            params.addValue("status", status.toUpperCase());
        }

        long totalElements = jdbc.queryForObject(countSql, params, Long.class);

        // 2. Fetch Content page matching status filter
        String contentSql = """
                WITH job_summary AS (
                    SELECT
                        re.id AS raw_event_id,
                        re.source_file_name AS file_name,
                        re.sheet_name AS sheet_name,
                        re.department AS department,
                        re.ingestion_status AS parent_status,
                        COUNT(ej.id) AS total_jobs,
                        COUNT(CASE WHEN ej.status = 'PENDING' THEN 1 END) AS pending_jobs,
                        COUNT(CASE WHEN ej.status = 'PROCESSING' THEN 1 END) AS processing_jobs_only,
                        COUNT(CASE WHEN ej.status = 'RETRYING' THEN 1 END) AS retrying_jobs,
                        COUNT(CASE WHEN ej.status = 'DONE' THEN 1 END) AS done_jobs,
                        COUNT(CASE WHEN ej.status = 'FAILED' THEN 1 END) AS failed_jobs,
                        re.updated_at AS updated_at
                    FROM raw_events re
                    LEFT JOIN extraction_jobs ej ON ej.raw_event_id = re.id
                    WHERE 1=1
                """
                + filterSqlStr
                + """
                            GROUP BY re.id, re.source_file_name, re.sheet_name, re.department, re.ingestion_status, re.updated_at
                        ),
                        computed_summary AS (
                            SELECT
                                raw_event_id AS id,
                                file_name AS fileName,
                                sheet_name AS sheet_name,
                                department,
                                CASE
                                    WHEN total_jobs > 0 THEN
                                        CASE
                                            WHEN done_jobs = total_jobs THEN 'DONE'
                                            WHEN pending_jobs = total_jobs THEN 'PENDING'
                                            WHEN (pending_jobs > 0 OR processing_jobs_only > 0 OR retrying_jobs > 0) THEN 'PROCESSING'
                                            WHEN failed_jobs > 0 THEN 'FAILED'
                                            ELSE 'DONE'
                                        END
                                    ELSE
                                        CASE
                                            WHEN parent_status = 'FAILED' THEN 'FAILED'
                                            WHEN parent_status = 'PENDING' THEN 'PENDING'
                                            WHEN parent_status = 'PROCESSING' THEN 'PROCESSING'
                                            ELSE 'DONE'
                                        END
                                END AS status,
                                CASE
                                    WHEN total_jobs > 0 THEN (done_jobs * 100) / total_jobs
                                    ELSE
                                        CASE
                                            WHEN parent_status = 'DONE' THEN 100
                                            ELSE 0
                                        END
                                END AS progress,
                                updated_at
                            FROM job_summary
                        )
                        SELECT id, fileName, sheet_name, department, status, progress, updated_at
                        FROM computed_summary
                        WHERE 1=1
                        """;

        if (status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL")) {
            contentSql += " AND status = :status";
        }

        contentSql += " ORDER BY updated_at DESC LIMIT :limit OFFSET :offset";
        params.addValue("limit", size);
        params.addValue("offset", page * size);

        List<ExtractionProgressDto> content = jdbc.query(contentSql, params, (rs, rowNum) -> {
            String updatedAtStr = "";
            java.sql.Timestamp ts = rs.getTimestamp("updated_at");
            if (ts != null) {
                updatedAtStr = ts.toLocalDateTime().toString();
            }
            return ExtractionProgressDto.builder()
                    .id(rs.getString("id"))
                    .fileName(rs.getString("fileName"))
                    .sheetName(rs.getString("sheet_name"))
                    .department(rs.getString("department"))
                    .status(rs.getString("status"))
                    .progress(rs.getInt("progress"))
                    .updatedAt(updatedAtStr)
                    .build();
        });

        int totalPages = (int) Math.ceil((double) totalElements / size);

        return ResponseEntity.ok(Map.of(
                "content", content,
                "totalPages", totalPages,
                "totalElements", totalElements,
                "size", size,
                "number", page));
    }

    @PostMapping("/raw-events/{rawEventId}/retry")
    public ResponseEntity<?> retryRawEventJobs(
            @PathVariable("rawEventId") UUID rawEventId,
            Authentication auth) {

        String email = auth.getName();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        // RLS Verification
        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        if (visibleRawEventIds != null && !visibleRawEventIds.contains(rawEventId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied under Row-Level Security policy"));
        }

        // Check if raw_event exists
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM raw_events WHERE id = :id",
                Map.of("id", rawEventId),
                Integer.class);
        if (count == null || count == 0) {
            return ResponseEntity.notFound().build();
        }

        // 1. Reset FAILED/RETRYING extraction jobs back to PENDING and audit retry
        String updateJobsSql = """
                UPDATE extraction_jobs
                SET status = 'PENDING',
                    retry_count = retry_count + 1,
                    last_retried_at = CURRENT_TIMESTAMP,
                    completed_at = NULL,
                    last_error = NULL
                WHERE raw_event_id = :rawEventId
                  AND status IN ('FAILED', 'RETRYING')
                """;
        int jobsUpdated = jdbc.update(updateJobsSql, Map.of("rawEventId", rawEventId));

        // 2. Set parent raw_event status to PROCESSING as background worker starts
        // processing
        jdbc.update(
                "UPDATE raw_events SET ingestion_status = 'PROCESSING', error_message = NULL WHERE id = :id",
                Map.of("id", rawEventId));

        return ResponseEntity.ok(Map.of(
                "status", "processing",
                "jobsUpdated", jobsUpdated,
                "message", "Jobs successfully scheduled for retry"));
    }
}
