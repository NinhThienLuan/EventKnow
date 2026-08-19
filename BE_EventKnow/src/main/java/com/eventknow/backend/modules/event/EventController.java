package com.eventknow.backend.modules.event;

import com.eventknow.backend.common.permission.PermissionFilterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class EventController {

    private final EventService eventService;
    private final PermissionFilterService permissionFilterService;

    @GetMapping("/source-tree")
    public ResponseEntity<?> getSourceTree(Authentication auth) {
        String email = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        Map<String, Object> tree = eventService.getSourceTree(visibleRawEventIds);
        return ResponseEntity.ok(Map.of("status", "success", "data", tree));
    }

    @GetMapping("/events")
    public ResponseEntity<?> getEventsPaged(
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "quarter", required = false) String quarter,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            Authentication auth) {
        String email = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        org.springframework.data.domain.Page<?> result = eventService.getEventsPaged(department, year, quarter, search,
                visibleRawEventIds, page, size);
        return ResponseEntity.ok(Map.of("status", "success", "data", result));
    }

    @GetMapping("/events/{eventId}")
    public ResponseEntity<?> getEventDetail(
            @PathVariable("eventId") UUID eventId,
            Authentication auth) {
        String email = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        Map<String, Object> detail = eventService.getEventDetail(eventId, visibleRawEventIds);
        return ResponseEntity.ok(Map.of("status", "success", "data", detail));
    }

    @PatchMapping("/events/{eventId}/topic-tags")
    public ResponseEntity<?> updateTopicTags(
            @PathVariable("eventId") UUID eventId,
            @RequestBody List<String> topicTags,
            Authentication auth) {
        String email = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(email, isAdmin);
        eventService.updateTopicTags(eventId, topicTags, visibleRawEventIds);
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    /**
     * Research reference tags query. Exempt from department RLS restrictions
     * since it does not expose any personal or sensitive department data.
     */
    @GetMapping("/tags/popular")
    public ResponseEntity<?> getPopularTags() {
        List<String> tags = eventService.getPopularTags();
        return ResponseEntity.ok(Map.of("status", "success", "data", tags));
    }

    private boolean hasAdminRole(Authentication auth) {
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
