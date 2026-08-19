package com.eventknow.backend.modules.attendee;

import com.eventknow.backend.common.permission.PermissionFilterService;
import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attendees")
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendeeController {

        private final AttendeeProfileRepository attendeeProfileRepository;
        private final EventAttendanceRepository eventAttendanceRepository;
        private final NamedParameterJdbcTemplate jdbc;
        private final PermissionFilterService permissionFilterService;

        @GetMapping
        public ResponseEntity<Map<String, Object>> getAttendees(
                        @RequestParam(value = "search", required = false, defaultValue = "") String search,
                        @RequestParam(value = "role", required = false) String role,
                        @RequestParam(value = "status", required = false) String status,
                        @RequestParam(value = "academicTitle", required = false, defaultValue = "ALL") String academicTitle,
                        @RequestParam(value = "domain", required = false) String domain,
                        @RequestParam(value = "position", required = false) String position,
                        @RequestParam(value = "department", required = false) String department,
                        @RequestParam(value = "startDate", required = false) String startDate,
                        @RequestParam(value = "endDate", required = false) String endDate,
                        @RequestParam(value = "page", defaultValue = "0") int page,
                        @RequestParam(value = "size", defaultValue = "10") int size) {

                log.info(
                                "getAttendees API called: search='{}', role='{}', status='{}', academicTitle='{}', domain='{}', position='{}', department='{}', startDate='{}', endDate='{}', page={}, size={}",
                                search, role, status, academicTitle, domain, position, department, startDate, endDate,
                                page, size);
                try {
                        String normalRole = (role == null || role.isEmpty() || "ALL".equalsIgnoreCase(role)) ? null
                                        : role.toUpperCase();
                        String normalStatus = (status == null || status.isEmpty() || "ALL".equalsIgnoreCase(status))
                                        ? null
                                        : status.toUpperCase();
                        String normalAcademicTitle = (academicTitle == null || academicTitle.isEmpty()
                                        || "ALL".equalsIgnoreCase(academicTitle)) ? null : academicTitle.toUpperCase();
                        String normalDomain = (domain == null || domain.isEmpty() || "ALL".equalsIgnoreCase(domain))
                                        ? null
                                        : domain.toUpperCase();
                        String normalPosition = (position == null || position.isEmpty()
                                        || "ALL".equalsIgnoreCase(position)) ? null
                                                        : position;
                        String normalDept = (department == null || department.isEmpty()
                                        || "ALL".equalsIgnoreCase(department))
                                                        ? null
                                                        : department;
                        String normalStartDate = (startDate == null || startDate.isEmpty()
                                        || "ALL".equalsIgnoreCase(startDate))
                                                        ? null
                                                        : startDate;
                        String normalEndDate = (endDate == null || endDate.isEmpty() || "ALL".equalsIgnoreCase(endDate))
                                        ? null
                                        : endDate;

                        List<AttendeeProfileEntity> entities = attendeeProfileRepository
                                        .searchActiveProfilesMultivariate(
                                                        search, normalRole, normalStatus, normalDomain,
                                                        normalAcademicTitle, normalPosition, normalDept,
                                                        normalStartDate, normalEndDate);

                        // Map to response models
                        List<Map<String, Object>> dataList = entities.stream().map(this::mapToAttendeeSummary)
                                        .collect(Collectors.toList());

                        int totalElements = dataList.size();
                        int totalPages = (int) Math.ceil((double) totalElements / size);
                        int fromIndex = Math.min(page * size, totalElements);
                        int toIndex = Math.min(fromIndex + size, totalElements);
                        List<Map<String, Object>> paged = dataList.subList(fromIndex, toIndex);

                        Map<String, Object> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("data", Map.of(
                                        "content", paged,
                                        "totalPages", totalPages,
                                        "totalElements", totalElements,
                                        "size", size,
                                        "number", page));
                        return ResponseEntity.ok(response);
                } catch (Exception e) {
                        log.error("Internal Server Error in getAttendees: ", e);
                        throw e;
                }
        }

        @GetMapping("/{id}")
        public ResponseEntity<?> getAttendee(@PathVariable("id") UUID id) {
                Optional<AttendeeProfileEntity> opt = attendeeProfileRepository.findById(id);
                if (opt.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Attendee not found"));
                }

                AttendeeProfileEntity attendee = opt.get();

                // Redirect if entity has been merged (inactive)
                AttendeeProfileEntity canonical = attendee;
                boolean redirected = false;
                if (!attendee.isActive() && attendee.getMergedInto() != null) {
                        canonical = attendee.getMergedInto();
                        redirected = true;
                        log.info("Redirecting merged attendee {}. Sending canonical {}", id, canonical.getId());
                }

                // Map complete profile details including Event History
                Map<String, Object> attendeeDetail = mapToAttendeeDetail(canonical);
                if (redirected) {
                        attendeeDetail.put("redirectedFrom", id.toString());
                        attendeeDetail.put("canonicalId", canonical.getId().toString());
                }

                return ResponseEntity.ok(Map.of("status", "success", "data", attendeeDetail));
        }

        @GetMapping("/{id}/co-attendees")
        public ResponseEntity<?> getCoAttendees(
                        @PathVariable("id") UUID id,
                        Authentication auth) {
                log.info("getCoAttendees API called for id={}", id);

                AttendeeProfileEntity attendee = attendeeProfileRepository.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Attendee profile not found"));

                UUID targetCanonicalId = (attendee.isActive() || attendee.getMergedInto() == null)
                                ? attendee.getId()
                                : attendee.getMergedInto().getId();

                String email = auth.getName();
                boolean isAdmin = hasAdminRole(auth);
                List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);

                // If not admin and RLS visible list is empty, return empty list immediately
                if (visibleRawEventIds != null && visibleRawEventIds.isEmpty()) {
                        return ResponseEntity.ok(Map.of("status", "success", "data", List.of()));
                }

                MapSqlParameterSource params = new MapSqlParameterSource();
                params.addValue("targetCanonicalId", targetCanonicalId);

                StringBuilder sql = new StringBuilder();
                sql.append("SELECT ");
                sql.append("  ap2.id AS co_attendee_id, ");
                sql.append("  ap2.full_name AS full_name, ");
                sql.append("  o2.org_name AS org_name, ");
                sql.append("  COUNT(DISTINCT re2.event_id) AS co_attended_count ");
                sql.append("FROM event_attendance ea1 ");
                sql.append("JOIN raw_events re1 ON ea1.raw_event_id = re1.id ");
                sql.append("JOIN raw_events re2 ON re2.event_id = re1.event_id ");
                sql.append("JOIN event_attendance ea2 ");
                sql.append("  ON ea2.raw_event_id = re2.id ");
                sql.append("  AND ea2.is_deleted_in_source = false ");
                sql.append("JOIN attendee_profiles ap1_raw ON ea1.attendee_profile_id = ap1_raw.id ");
                sql.append("JOIN attendee_profiles ap1 ON ap1.id = COALESCE(ap1_raw.merged_into_id, ap1_raw.id) ");
                sql.append("JOIN attendee_profiles ap2_raw ON ea2.attendee_profile_id = ap2_raw.id ");
                sql.append("JOIN attendee_profiles ap2 ON ap2.id = COALESCE(ap2_raw.merged_into_id, ap2_raw.id) ");
                sql.append("LEFT JOIN organizations o2 ON ap2.organization_id = o2.id ");
                sql.append("WHERE ap1.id = :targetCanonicalId ");
                sql.append("  AND ea1.is_deleted_in_source = false ");
                sql.append("  AND ap2.id != ap1.id ");
                sql.append("  AND ap2.is_active = true ");

                if (visibleRawEventIds != null) {
                        params.addValue("visibleRawEventIds", visibleRawEventIds.toArray(UUID[]::new));
                        sql.append("  AND re1.id = ANY(:visibleRawEventIds::uuid[]) ");
                        sql.append("  AND re2.id = ANY(:visibleRawEventIds::uuid[]) ");
                }

                sql.append("GROUP BY ap2.id, ap2.full_name, o2.org_name ");
                sql.append("ORDER BY co_attended_count DESC ");
                sql.append("LIMIT 10");

                List<Map<String, Object>> coAttendees = jdbc.query(sql.toString(), params, (rs, rowNum) -> {
                        Map<String, Object> map = new LinkedHashMap<>();
                        map.put("coAttendeeId", rs.getObject("co_attendee_id", UUID.class).toString());
                        map.put("fullName", rs.getString("full_name"));
                        map.put("organizationName", rs.getString("org_name") != null ? rs.getString("org_name") : "");
                        map.put("coAttendedCount", rs.getLong("co_attended_count"));
                        return map;
                });

                return ResponseEntity.ok(Map.of("status", "success", "data", coAttendees));
        }

        private boolean hasAdminRole(Authentication auth) {
                if (auth == null) {
                        return false;
                }
                return auth.getAuthorities().stream()
                                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        }

        @PatchMapping("/{id}/follow-up-status")
        public ResponseEntity<?> updateFollowUpStatus(
                        @PathVariable("id") UUID id,
                        @RequestBody Map<String, String> requestBody) {

                Optional<AttendeeProfileEntity> opt = attendeeProfileRepository.findByIdAndIsActiveTrue(id);
                if (opt.isEmpty()) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                        .body(Map.of("error", "Active attendee not found"));
                }

                String rawStatus = requestBody.get("followUpStatus");
                if (rawStatus == null || rawStatus.isEmpty()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "followUpStatus is required"));
                }

                AttendeeProfileEntity.FollowUpStatus statusEnum;
                try {
                        statusEnum = AttendeeProfileEntity.FollowUpStatus.valueOf(rawStatus.toUpperCase());
                } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Invalid followUpStatus value"));
                }

                AttendeeProfileEntity entity = opt.get();
                entity.setFollowUpStatus(statusEnum);
                attendeeProfileRepository.save(entity);

                return ResponseEntity.ok(Map.of("status", "success", "data", mapToAttendeeSummary(entity)));
        }

        private Map<String, Object> mapToAttendeeSummary(AttendeeProfileEntity entity) {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("id", entity.getId().toString());
                map.put("fullName", entity.getFullName());
                map.put("normalizedName", entity.getNormalizedName());
                map.put("email", entity.getEmail() != null ? entity.getEmail() : "");
                map.put("phone", entity.getPhone() != null ? entity.getPhone() : "");
                map.put("academicTitleRaw", entity.getAcademicTitleRaw() != null ? entity.getAcademicTitleRaw() : "");
                map.put("academicTitleNormalized",
                                entity.getAcademicTitleNormalized() != null ? entity.getAcademicTitleNormalized()
                                                : Collections.emptyList());
                map.put("attendeeRole", entity.getAttendeeRole() != null ? entity.getAttendeeRole().name() : "");
                map.put("position", entity.getPosition() != null ? entity.getPosition() : "");
                map.put("organizationName", entity.getOrganization() != null ? entity.getOrganization().getOrgName()
                                : (entity.getOrganizationTextRaw() != null ? entity.getOrganizationTextRaw() : ""));
                map.put("followUpStatus", entity.getFollowUpStatus().name());
                map.put("researchFieldsRaw",
                                entity.getResearchFieldsRaw() != null ? entity.getResearchFieldsRaw()
                                                : Collections.emptyList());
                map.put("researchDomains",
                                entity.getResearchDomains() != null ? entity.getResearchDomains()
                                                : Collections.emptyList());
                map.put("expertiseTags",
                                entity.getExpertiseTags() != null ? entity.getExpertiseTags()
                                                : Collections.emptyList());
                map.put("dynamicAttributes",
                                entity.getDynamicAttributes() != null ? entity.getDynamicAttributes()
                                                : Collections.emptyMap());

                // Simple notes count
                map.put("notesCount", 0); // notes count can be fetched or calculated, default to 0 for summary
                map.put("notes", Collections.emptyList());

                // Fetch source counts
                List<EventAttendanceEntity> attendances = eventAttendanceRepository.findByAttendeeProfile(entity);
                map.put("sourceFileCount", attendances.size());

                List<Map<String, Object>> sourceSheetsList = attendances.stream().map(att -> {
                        Map<String, Object> sheetMap = new LinkedHashMap<>();
                        if (att.getRawEvent() != null) {
                                sheetMap.put("eventName", att.getRawEvent().getEventName());
                                sheetMap.put("fileName", att.getRawEvent().getSourceFileName());
                                sheetMap.put("sheetName",
                                                att.getRawEvent().getSheetName() != null
                                                                ? att.getRawEvent().getSheetName()
                                                                : "");
                                sheetMap.put("eventDate",
                                                att.getRawEvent().getEventDate() != null
                                                                ? att.getRawEvent().getEventDate().toString()
                                                                : "");
                        } else {
                                sheetMap.put("eventName", "Unknown Event");
                                sheetMap.put("fileName", "");
                                sheetMap.put("sheetName", "");
                                sheetMap.put("eventDate", "");
                        }
                        sheetMap.put("attendanceStatus", att.getAttendanceStatus().name());
                        sheetMap.put("snapshotData",
                                        att.getSnapshotData() != null ? att.getSnapshotData() : Collections.emptyMap());
                        return sheetMap;
                }).collect(Collectors.toList());
                map.put("sourceSheets", sourceSheetsList);

                return map;
        }

        private Map<String, Object> mapToAttendeeDetail(AttendeeProfileEntity entity) {
                Map<String, Object> map = mapToAttendeeSummary(entity);

                // Fetch precise event history and map to frontend target structure
                List<EventAttendanceEntity> attendances = eventAttendanceRepository.findByAttendeeProfile(entity);
                List<Map<String, Object>> sourceSheetsList = attendances.stream().map(att -> {
                        Map<String, Object> sheetMap = new LinkedHashMap<>();
                        if (att.getRawEvent() != null) {
                                sheetMap.put("eventName", att.getRawEvent().getEventName());
                                sheetMap.put("fileName", att.getRawEvent().getSourceFileName());
                                sheetMap.put("sheetName",
                                                att.getRawEvent().getSheetName() != null
                                                                ? att.getRawEvent().getSheetName()
                                                                : "");
                                sheetMap.put("eventDate",
                                                att.getRawEvent().getEventDate() != null
                                                                ? att.getRawEvent().getEventDate().toString()
                                                                : "");
                        } else {
                                sheetMap.put("eventName", "Unknown Event");
                                sheetMap.put("fileName", "");
                                sheetMap.put("sheetName", "");
                                sheetMap.put("eventDate", "");
                        }
                        sheetMap.put("attendanceStatus", att.getAttendanceStatus().name());
                        sheetMap.put("snapshotData",
                                        att.getSnapshotData() != null ? att.getSnapshotData() : Collections.emptyMap());
                        return sheetMap;
                }).collect(Collectors.toList());

                map.put("sourceSheets", sourceSheetsList);

                return map;
        }
}
