package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DashboardAggregateResponse {
    private SummaryDto summary;
    private List<MonthlyTrendDto> monthlyTrend;
    private List<DepartmentDto> departmentDistribution;
    private DataHealthDto dataHealth;
}
