package com.eventknow.backend.modules.dashboard;

import java.time.LocalDate;

/**
 * Filter parameters for Dashboard aggregate queries.
 * All fields are optional (null = no filter applied).
 */
public record DashboardFilterParams(
        LocalDate startDate,
        LocalDate endDate,
        String department,
        String academicTitle,
        String role) {
    public static DashboardFilterParams empty() {
        return new DashboardFilterParams(null, null, null, null, null);
    }
}
