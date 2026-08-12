package com.eventknow.backend.modules.identity;

import com.eventknow.backend.modules.identity.dto.DuplicateCandidateProjection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/identity")
@PreAuthorize("hasRole('ADMIN')")
public class IdentityController {

    private final IdentityService identityService;

    @Autowired
    public IdentityController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping("/duplicates")
    public ResponseEntity<Map<String, Object>> getDuplicates(
            @RequestParam("entityType") String entityType,
            @RequestParam(value = "threshold", defaultValue = "0.4") double threshold) {

        List<DuplicateCandidateProjection> duplicates = identityService.findDuplicates(entityType, threshold);

        Map<String, Object> response = new HashMap<>();
        response.put("data", duplicates);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/merge")
    public ResponseEntity<Map<String, Object>> merge(@RequestBody Map<String, String> request) {
        String entityType = request.get("entityType");
        String primaryIdStr = request.get("primaryId");
        String secondaryIdStr = request.get("secondaryId");

        if (entityType == null || primaryIdStr == null || secondaryIdStr == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "entityType, primaryId, and secondaryId are required"));
        }

        UUID primaryId = UUID.fromString(primaryIdStr);
        UUID secondaryId = UUID.fromString(secondaryIdStr);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : "system@eventknow.com";

        try {
            Map<String, Object> result = identityService.merge(entityType, primaryId, secondaryId, currentEmail);
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            if ("ALREADY_MERGED".equals(e.getMessage())) {
                return ResponseEntity.status(409).body(Map.of("error", "ALREADY_MERGED"));
            }
            throw e;
        }
    }

    @PostMapping("/split")
    public ResponseEntity<Map<String, Object>> split(@RequestBody Map<String, String> request) {
        String mergeLogIdStr = request.get("mergeLogId");
        if (mergeLogIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "mergeLogId is required"));
        }

        UUID mergeLogId = UUID.fromString(mergeLogIdStr);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : "system@eventknow.com";

        Map<String, Object> result = identityService.split(mergeLogId, currentEmail);
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/reassign-attendance")
    public ResponseEntity<Map<String, Object>> reassignAttendance(@RequestBody Map<String, Object> request) {
        List<?> rawIds = (List<?>) request.get("attendanceIds");
        String newAttendeeProfileIdStr = (String) request.get("newAttendeeProfileId");

        if (rawIds == null || newAttendeeProfileIdStr == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "attendanceIds and newAttendeeProfileId are required"));
        }

        List<UUID> attendanceIds = rawIds.stream()
                .map(obj -> UUID.fromString(obj.toString()))
                .collect(java.util.stream.Collectors.toList());
        UUID newAttendeeProfileId = UUID.fromString(newAttendeeProfileIdStr);

        Map<String, Object> result = identityService.reassignAttendance(attendanceIds, newAttendeeProfileId);
        return ResponseEntity.ok(result);
    }
}
