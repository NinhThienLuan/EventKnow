package com.eventknow.backend.modules.dashboard;

import com.eventknow.backend.common.permission.PermissionFilterService;
import com.eventknow.backend.modules.dashboard.dto.DashboardAggregateResponse;
import com.eventknow.backend.modules.dashboard.dto.EventListDto;
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
 *
 * <p>
 * FR-4.6 — 2-stream Dashboard:
 * <ul>
 * <li>No {@code eventIds} param → System Dashboard (global aggregate)</li>
 * <li>{@code eventIds} present → Event Dashboard (scoped to selected canonical
 * events)</li>
 * </ul>
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
         * <p>
         * FR-4.6: when {@code eventIds} is supplied, all event-linked metrics are
         * scoped to those canonical events (Event Dashboard stream).
         * When absent, returns global System Dashboard aggregate.
         * </p>
         *
         * @param startDate     optional ISO date lower bound on event_date
         * @param endDate       optional ISO date upper bound on event_date
         * @param department    optional department filter
         * @param academicTitle optional normalized academic title tag filter
         * @param role          optional attendee_role filter
         * @param eventIds      optional list of canonical event UUIDs (FR-4.6 Event
         *                      Dashboard)
         */
        @GetMapping("/aggregate")
        public ResponseEntity<DashboardAggregateResponse> getAggregate(
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        @RequestParam(required = false) String department,
                        @RequestParam(required = false) String academicTitle,
                        @RequestParam(required = false) String role,
                        @RequestParam(required = false) List<UUID> eventIds,
                        Authentication auth) {

                String viewerEmail = auth.getName();
                boolean isAdmin = hasAdminRole(auth);

                // Resolve RLS once — result passed to all downstream queries in this request
                List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
                log.debug("Dashboard aggregate: viewer={} isAdmin={} visibleCount={} eventIds={}",
                                viewerEmail, isAdmin, visibleRawEventIds == null ? "ALL" : visibleRawEventIds.size(),
                                eventIds == null ? "SYSTEM" : eventIds.size());

                String normalDept = (department == null || department.trim().isEmpty()
                                || "ALL".equalsIgnoreCase(department))
                                                ? null
                                                : department.trim();
                String normalTitle = (academicTitle == null || academicTitle.trim().isEmpty()
                                || "ALL".equalsIgnoreCase(academicTitle)) ? null : academicTitle.trim();
                String normalRole = (role == null || role.trim().isEmpty() || "ALL".equalsIgnoreCase(role)) ? null
                                : role.trim().toUpperCase();
                // eventIds: null = System stream, empty list treated same as null (no events
                // selected yet — return global view; FE guards against calling with empty list)
                List<UUID> normalEventIds = (eventIds == null || eventIds.isEmpty()) ? null : eventIds;

                DashboardFilterParams filters = new DashboardFilterParams(
                                startDate, endDate, normalDept, normalTitle, normalRole, normalEventIds);
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

        /**
         * GET /api/dashboard/events-list
         *
         * <p>
         * FR-4.6 — Returns canonical events visible to the requesting user,
         * ordered by event_date DESC. Used by the FE Event Dashboard stream to
         * populate the event picker.
         * </p>
         *
         * <p>
         * RLS: non-admin users only see events they have Drive access to.
         * Admin sees all active events.
         * </p>
         *
         * <p>
         * TODO: add page/size params for pagination if event count exceeds ~100.
         * </p>
         */
        @GetMapping("/events-list")
        public ResponseEntity<List<EventListDto>> getEventsList(Authentication auth) {
                String viewerEmail = auth.getName();
                boolean isAdmin = hasAdminRole(auth);

                List<UUID> visibleRawEventIds = permissionFilterService.getVisibleRawEventIds(viewerEmail, isAdmin);
                log.debug("Events list: viewer={} isAdmin={}", viewerEmail, isAdmin);

                List<EventListDto> events = aggregateService.getEventList(visibleRawEventIds);
                return ResponseEntity.ok(events);
        }

        private boolean hasAdminRole(Authentication auth) {
                return auth.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(a -> a.equals("ROLE_ADMIN"));
        }
}
