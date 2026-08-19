package com.eventknow.backend.integration.llm;

import java.util.List;

public record AttendeeExtractionInputDto(
        int rowNumber,
        String fullName,
        String organizationTextRaw,
        String position,
        String academicTitleRaw,
        List<String> academicTitleNormalized,
        List<String> researchFieldsRaw) {
}
