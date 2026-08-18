package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Lightweight event summary for the Event Dashboard picker (FR-4.6).
 *
 * <p>
 * Returned by {@code GET /api/dashboard/events-list}.
 * RLS-filtered — only events visible to the requesting user are included.
 * </p>
 */
@Builder
public record EventListDto(
        UUID id,
        String eventName,
        LocalDate eventDate,
        String department) {
}
