package com.eventknow.backend.modules.dashboard;

import com.eventknow.backend.common.permission.PermissionFilterService;
import com.eventknow.backend.modules.dashboard.dto.DashboardAggregateResponse;
import com.eventknow.backend.modules.dashboard.dto.TopOrganizationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Module 4 — Dashboard REST endpoints.
 *
 * <p>
 * Access: any authenticated user (isAuthenticated()) — no admin gate.
 * RLS is enforced via PermissionFilterService per request.
 * </p>
 *
 * <p>
 * Permission check is called once per request and the result
 * (visibleRawEventIds)
 * is passed to all downstream service queries — no repeated Drive API calls.
 * </p>
 */
@RestController
@RequestMapping("/api/dashboard")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final DashboardAggregateService aggregateService;
    private final PermissionFilterService permissionFilterService;

    /**
     * GET /api/dashboard/aggregate
     *
     * <p>
     * Returns the full dashboard aggregate: summary cards, monthly trend,
     * department distribution, and data health indicators.
     * </p>
     *
     * @param startDate     optional ISO date lower bound on event_date
     * @param endDate       optional ISO date upper bound on event_date
     * @param department    optional department filter
     * @param academicTitle optional normalized academic title tag filter
     * @param role          optional attendee_role filter
     */
    @GetMapping("/aggregate")
    public ResponseEntity<DashboardAggregateResponse> getAggregate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String academicTitle,
            @RequestParam(required = false) String role,
            Authentication auth) {

        String viewerEmail = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        // Resolve RLS once — result passed to all 7 downstream queries in this request
        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
        log.debug("Dashboard aggregate: viewer={} isAdmin={} visibleCount={}",
                viewerEmail, isAdmin, visibleRawEventIds == null ? "ALL" : visibleRawEventIds.size());

        DashboardFilterParams filters = new DashboardFilterParams(startDate, endDate, department, academicTitle, role);
        DashboardAggregateResponse response = aggregateService.getAggregate(filters, visibleRawEventIds);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/dashboard/top-organizations?limit=10
     *
     * <p>
     * Returns top N organizations by resolved attendee count (merge-safe).
     * </p>
     */
    @GetMapping("/top-organizations")
    public ResponseEntity<Map<String, Object>> getTopOrganizations(
            @RequestParam(defaultValue = "10") int limit,
            Authentication auth) {

        String viewerEmail = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
        log.debug("Top organizations: viewer={} isAdmin={} limit={}", viewerEmail, isAdmin, limit);

        List<TopOrganizationDto> data = aggregateService.getTopOrganizations(limit, visibleRawEventIds);
        return ResponseEntity.ok(Map.of("data", data, "total", data.size()));
    }

    private boolean hasAdminRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(a -> a.equals("ROLE_ADMIN"));
    }
}
