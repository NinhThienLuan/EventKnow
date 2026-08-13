package com.eventknow.backend.modules.dashboard.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TopOrganizationDto {
    private UUID organizationId;
    private String orgName;
    private long attendeeCount;
}
