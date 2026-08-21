package com.eventknow.backend.modules.recommendation.dto;

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
public class RecommendGuestDto {
    private UUID resolvedPersonId;
    private String fullName;
    private String organizationName;
    private List<String> matchedTags;
    private int matchCount;
    private String reason;
    private long totalEventsAttended;
    private String followUpStatus;
}
