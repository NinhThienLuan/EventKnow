package com.eventknow.backend.integration.llm;

import java.util.List;

public record EnrichedTaxonomyDto(
        int rowNumber,
        List<String> researchDomains,
        List<String> expertiseTags,
        String attendeeRole) {
}
