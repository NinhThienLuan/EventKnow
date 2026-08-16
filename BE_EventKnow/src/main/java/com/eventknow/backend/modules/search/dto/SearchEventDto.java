package com.eventknow.backend.modules.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchEventDto {
    private UUID eventId;
    private String eventName;
    private LocalDate eventDate;
    private String department;
    private String attendeeRole;
}
