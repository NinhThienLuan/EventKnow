package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DepartmentDto {
    private String department;
    private long count;
}
