package com.eventknow.backend.modules.organization;

import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.model.entity.Core.OrganizationEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import com.eventknow.backend.modules.identity.OrganizationRepository;
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
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class OrganizationController {

    private final OrganizationRepository organizationRepository;
    private final AttendeeProfileRepository attendeeProfileRepository;
    private final EventAttendanceRepository eventAttendanceRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getOrganizations(
            @RequestParam(value = "search", required = false, defaultValue = "") String search,
            @RequestParam(value = "category", required = false, defaultValue = "ALL") String category) {

        log.info("getOrganizations API called: search='{}', category='{}'", search, category);
        try {
            List<OrganizationEntity> entities = organizationRepository.searchActiveOrganizations(search);

            // In-memory filter on category if specified
            if (category != null && !category.isEmpty() && !"ALL".equalsIgnoreCase(category)) {
                entities = entities.stream().filter(org -> {
                    if (org.getDynamicAttributes() != null && org.getDynamicAttributes().containsKey("category")) {
                        String catVal = String.valueOf(org.getDynamicAttributes().get("category"));
                        return catVal.equalsIgnoreCase(category);
                    }
                    return false;
                }).collect(Collectors.toList());
            }

            List<Map<String, Object>> dataList = entities.stream().map(this::mapToOrganizationSummary)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", dataList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Internal Server Error in getOrganizations: ", e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrganization(@PathVariable("id") UUID id) {
        Optional<OrganizationEntity> opt = organizationRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Organization not found"));
        }

        OrganizationEntity organization = opt.get();

        // Redirect if entity has been merged (inactive)
        if (!organization.isActive() && organization.getMergedInto() != null) {
            OrganizationEntity canonical = organization;
            while (canonical.getMergedInto() != null) {
                canonical = canonical.getMergedInto();
            }
            log.info("Redirecting merged organization {} to active canonical {}", id, canonical.getId());
            HttpHeaders headers = new HttpHeaders();
            headers.add(HttpHeaders.LOCATION, "/api/organizations/" + canonical.getId());
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }

        Map<String, Object> detail = mapToOrganizationDetail(organization);

        return ResponseEntity.ok(Map.of("status", "success", "data", detail));
    }

    private Map<String, Object> mapToOrganizationSummary(OrganizationEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", entity.getId().toString());
        map.put("orgName", entity.getOrgName());
        map.put("normalizedName", entity.getNormalizedName());
        map.put("emailDomain", entity.getEmailDomain() != null ? entity.getEmailDomain() : "");
        map.put("dynamicAttributes",
                entity.getDynamicAttributes() != null ? entity.getDynamicAttributes() : Collections.emptyMap());

        // Extract category & address from dynamicAttributes
        String category = "TECH_ENTERPRISE"; // default fallback
        if (entity.getDynamicAttributes() != null && entity.getDynamicAttributes().containsKey("category")) {
            category = String.valueOf(entity.getDynamicAttributes().get("category"));
        }
        map.put("category", category);

        String address = "";
        if (entity.getDynamicAttributes() != null && entity.getDynamicAttributes().containsKey("address")) {
            address = String.valueOf(entity.getDynamicAttributes().get("address"));
        }
        map.put("address", address);

        // Compute memberCount
        long memberCount = attendeeProfileRepository.countByOrganizationAndIsActiveTrue(entity);
        map.put("memberCount", memberCount);

        // Compute eventsCount
        List<EventAttendanceEntity> attendances = eventAttendanceRepository.findByOrganization(entity);
        long eventsCount = attendances.stream().map(att -> {
            if (att.getRawEvent() != null && att.getRawEvent().getEvent() != null) {
                return att.getRawEvent().getEvent().getId();
            } else if (att.getRawEvent() != null) {
                return att.getRawEvent().getId();
            }
            return null;
        }).filter(Objects::nonNull).distinct().count();
        map.put("eventsCount", eventsCount);

        // Map sourceSheets and notes to prevent frontend render crashes
        List<Map<String, Object>> sourceSheetsList = attendances.stream().map(att -> {
            Map<String, Object> sheetMap = new LinkedHashMap<>();
            String eventName = "Unknown Event";
            if (att.getRawEvent() != null) {
                eventName = att.getRawEvent().getEventName();
            }
            sheetMap.put("eventName", eventName);
            sheetMap.put("contributionRole", att.getAttendanceStatus().name());
            return sheetMap;
        })
                .distinct()
                .collect(Collectors.toList());
        map.put("sourceSheets", sourceSheetsList);
        map.put("notes", Collections.emptyList());

        return map;
    }

    private Map<String, Object> mapToOrganizationDetail(OrganizationEntity entity) {
        Map<String, Object> map = mapToOrganizationSummary(entity);

        // Fetch precise event contribution history
        List<EventAttendanceEntity> attendances = eventAttendanceRepository.findByOrganization(entity);
        List<Map<String, Object>> sourceSheetsList = attendances.stream().map(att -> {
            Map<String, Object> sheetMap = new LinkedHashMap<>();
            String eventName = "Unknown Event";
            if (att.getRawEvent() != null) {
                eventName = att.getRawEvent().getEventName();
            }
            sheetMap.put("eventName", eventName);

            // contributionRole derivation from snapshot or attendance
            String role = "Tham gia";
            if (att.getSnapshotData() != null && att.getSnapshotData().containsKey("vai_tro")) {
                role = String.valueOf(att.getSnapshotData().get("vai_tro"));
            } else if (att.getSnapshotData() != null && att.getSnapshotData().containsKey("contributionRole")) {
                role = String.valueOf(att.getSnapshotData().get("contributionRole"));
            }
            sheetMap.put("contributionRole", role);
            return sheetMap;
        })
                .distinct()
                .collect(Collectors.toList());

        map.put("sourceSheets", sourceSheetsList);

        // Placeholder search for notes (can be expanded if notes are saved)
        map.put("notes", Collections.emptyList());

        return map;
    }
}
