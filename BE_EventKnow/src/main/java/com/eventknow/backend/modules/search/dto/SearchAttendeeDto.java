package com.eventknow.backend.modules.search.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchAttendeeDto {
    private UUID resolvedPersonId;
    private String fullName;
    private String email;
    private String organizationName;
    private List<String> academicTitle;
    private String attendeeRole;
    private String position;
    private List<String> researchDomains;
    private List<String> expertiseTags;
    private long totalEventsAttended;
    private Boolean isCrossDomain;
    private List<SearchEventDto> events;
}
