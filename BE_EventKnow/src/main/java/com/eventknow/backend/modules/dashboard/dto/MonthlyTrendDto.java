package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MonthlyTrendDto {
    /** Format: YYYY-MM */
    private String month;
    private long eventCount;
    private long attendeeCount;
}
