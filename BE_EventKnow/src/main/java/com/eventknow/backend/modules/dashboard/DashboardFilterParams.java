package com.eventknow.backend.modules.dashboard;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Filter parameters for Dashboard aggregate queries.
 * All fields are optional (null = no filter applied).
 *
 * <p>
 * FR-4.6 — 2-stream Dashboard:
 * <ul>
 * <li>{@code eventIds == null} → System Dashboard (global, no event scope)</li>
 * <li>{@code eventIds} non-empty → Event Dashboard (scoped to selected
 * canonical events)</li>
 * </ul>
 * </p>
 */
public record DashboardFilterParams(
        LocalDate startDate,
        LocalDate endDate,
        String department,
        String academicTitle,
        String role,
        List<UUID> eventIds) {
    public static DashboardFilterParams empty() {
        return new DashboardFilterParams(null, null, null, null, null, null);
    }
}
