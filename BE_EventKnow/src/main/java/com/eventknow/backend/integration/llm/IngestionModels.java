package com.eventknow.backend.integration.llm;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class IngestionModels {

    public record DynamicAttributeDto(
            @JsonProperty("key") String key,
            @JsonProperty("value") String value) {
    }

    public record ExtractedEntity(
            @JsonProperty("entity_type") String entityType,
            @JsonProperty("full_name") String fullName,
            @JsonProperty("email") String email,
            @JsonProperty("phone") String phone,
            @JsonProperty("academic_title_raw") String academicTitleRaw,
            @JsonProperty("attendee_role") String attendeeRole,
            @JsonProperty("position") String position,
            @JsonProperty("organization_text_raw") String organizationTextRaw,
            @JsonProperty("org_name") String orgName,
            @JsonProperty("email_domain") String emailDomain,
            @JsonProperty("research_fields_raw") List<String> researchFieldsRaw,
            @JsonProperty("research_domains") List<String> researchDomains,
            @JsonProperty("expertise_tags") List<String> expertiseTags,
            @JsonProperty("dynamic_attributes") List<DynamicAttributeDto> dynamicAttributes) {

        public Map<String, Object> dynamicAttributesMap() {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            if (dynamicAttributes != null) {
                for (DynamicAttributeDto attr : dynamicAttributes) {
                    if (attr.key() != null) {
                        map.put(attr.key(), attr.value());
                    }
                }
            }
            return map;
        }
    }

    public record BatchRowResult(
            @JsonProperty("row_number") int rowNumber,
            List<ExtractedEntity> entities) {
    }

    public record GeminiExtractionResponse(
            @JsonProperty("batch_rows") List<BatchRowResult> batchRows) {
    }
}
