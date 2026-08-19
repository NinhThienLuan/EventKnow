package com.eventknow.backend.modules.attendee;

import java.util.List;

public record ConnectionDto(
        String id,
        String sourceId,
        String sourceName,
        String sourceType, // "PERSON"
        String targetId,
        String targetName,
        String targetType, // "ORGANIZATION" | "PERSON"
        String relationLabel,
        int interactionCount,
        List<String> sharedEventNames,
        String followUpStatus) {
}
