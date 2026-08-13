package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class SummaryDto {
    private long totalEvents;
    private long totalAttendees;
    private long uniqueOrganizations;
    private long totalReports;

    /**
     * Key: normalized academic title tag (e.g. "GS", "TS"). Value: distinct
     * attendee count.
     */
    private Map<String, Integer> academicTitleBreakdown;

    /** Key: attendee_role enum value. Value: distinct attendee count. */
    private Map<String, Integer> attendeeRoleBreakdown;

    /**
     * Key: follow_up_status value. Value: raw row count (global, not filtered by
     * event).
     */
    private Map<String, Integer> followUpFunnel;
}
