package com.eventknow.backend.modules.event.dto;

import lombok.Builder;
import java.time.LocalDate;
import java.util.UUID;

@Builder
public record EventListPagedDto(
        UUID id,
        String eventName,
        LocalDate eventDate,
        String department,
        long rawEventCount) {
}
