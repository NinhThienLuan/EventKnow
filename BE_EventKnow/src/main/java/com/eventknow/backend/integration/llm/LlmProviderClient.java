package com.eventknow.backend.integration.llm;

import java.util.List;

public interface LlmProviderClient {
    List<EnrichedTaxonomyDto> extractTaxonomy(List<AttendeeExtractionInputDto> inputs);
}
