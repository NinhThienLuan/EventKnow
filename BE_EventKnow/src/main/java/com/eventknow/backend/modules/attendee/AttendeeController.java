package com.eventknow.backend.modules.attendee;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

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
            @RequestParam(value = "endDate", required = false) String endDate) {

        log.info(
                "getAttendees API called: search='{}', role='{}', status='{}', academicTitle='{}', domain='{}', position='{}', department='{}', startDate='{}', endDate='{}'",
                search, role, status, academicTitle, domain, position, department, startDate, endDate);
        try {
            String normalRole = (role == null || role.isEmpty() || "ALL".equalsIgnoreCase(role)) ? null
                    : role.toUpperCase();
            String normalStatus = (status == null || status.isEmpty() || "ALL".equalsIgnoreCase(status)) ? null
                    : status.toUpperCase();
            String normalAcademicTitle = (academicTitle == null || academicTitle.isEmpty()
                    || "ALL".equalsIgnoreCase(academicTitle)) ? null : academicTitle.toUpperCase();
            String normalDomain = (domain == null || domain.isEmpty() || "ALL".equalsIgnoreCase(domain)) ? null
                    : domain.toUpperCase();
            String normalPosition = (position == null || position.isEmpty() || "ALL".equalsIgnoreCase(position)) ? null
                    : position;
            String normalDept = (department == null || department.isEmpty() || "ALL".equalsIgnoreCase(department))
                    ? null
                    : department;
            String normalStartDate = (startDate == null || startDate.isEmpty() || "ALL".equalsIgnoreCase(startDate))
                    ? null
                    : startDate;
            String normalEndDate = (endDate == null || endDate.isEmpty() || "ALL".equalsIgnoreCase(endDate)) ? null
                    : endDate;

            List<AttendeeProfileEntity> entities = attendeeProfileRepository.searchActiveProfilesMultivariate(
                    search, normalRole, normalStatus, normalDomain, normalAcademicTitle, normalPosition, normalDept,
                    normalStartDate, normalEndDate);

            // Map to response models
            List<Map<String, Object>> dataList = entities.stream().map(this::mapToAttendeeSummary)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", dataList);
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
        if (!attendee.isActive() && attendee.getMergedInto() != null) {
            AttendeeProfileEntity canonical = attendee;
            while (canonical.getMergedInto() != null) {
                canonical = canonical.getMergedInto();
            }
            log.info("Redirecting merged attendee {} to active canonical {}", id, canonical.getId());
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.LOCATION, "/api/attendees/" + canonical.getId());
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }

        // Map complete profile details including Event History
        Map<String, Object> attendeeDetail = mapToAttendeeDetail(attendee);

        return ResponseEntity.ok(Map.of("status", "success", "data", attendeeDetail));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> requestBody) {

        Optional<AttendeeProfileEntity> opt = attendeeProfileRepository.findByIdAndIsActiveTrue(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Active attendee not found"));
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
                entity.getResearchFieldsRaw() != null ? entity.getResearchFieldsRaw() : Collections.emptyList());
        map.put("researchDomains",
                entity.getResearchDomains() != null ? entity.getResearchDomains() : Collections.emptyList());
        map.put("expertiseTags",
                entity.getExpertiseTags() != null ? entity.getExpertiseTags() : Collections.emptyList());
        map.put("dynamicAttributes",
                entity.getDynamicAttributes() != null ? entity.getDynamicAttributes() : Collections.emptyMap());

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
                        att.getRawEvent().getSheetName() != null ? att.getRawEvent().getSheetName() : "");
                sheetMap.put("eventDate",
                        att.getRawEvent().getEventDate() != null ? att.getRawEvent().getEventDate().toString() : "");
            } else {
                sheetMap.put("eventName", "Unknown Event");
                sheetMap.put("fileName", "");
                sheetMap.put("sheetName", "");
                sheetMap.put("eventDate", "");
            }
            sheetMap.put("attendanceStatus", att.getAttendanceStatus().name());
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
                        att.getRawEvent().getSheetName() != null ? att.getRawEvent().getSheetName() : "");
                sheetMap.put("eventDate",
                        att.getRawEvent().getEventDate() != null ? att.getRawEvent().getEventDate().toString() : "");
            } else {
                sheetMap.put("eventName", "Unknown Event");
                sheetMap.put("fileName", "");
                sheetMap.put("sheetName", "");
                sheetMap.put("eventDate", "");
            }
            sheetMap.put("attendanceStatus", att.getAttendanceStatus().name());
            return sheetMap;
        }).collect(Collectors.toList());

        map.put("sourceSheets", sourceSheetsList);

        return map;
    }
}
