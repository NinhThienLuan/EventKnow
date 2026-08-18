package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

/**
 * System-wide data health indicators. Not filtered by user/date — always
 * global.
 */
@Data
@Builder
public class DataHealthDto {
    private long deletedInSourceCount;
    private long unmappedDepartmentCount;
    private long failedExtractionJobCount;
    private long pendingAiLabelingCount;
}
