package com.eventknow.backend.modules.ingestion;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class GeminiExtractionClient {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("classpath:gemini_extraction_prompt.md")
    private Resource promptResource;

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Retry retry;

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

    public GeminiExtractionClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(60000); // 60s connect timeout
        requestFactory.setReadTimeout(120000); // 120s read timeout

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();

        // Build resilient programmatic retry config
        RetryConfig config = RetryConfig.custom()
                .maxAttempts(3)
                .waitDuration(Duration.ofSeconds(2))
                .retryOnException(e -> {
                    if (e instanceof HttpStatusCodeException) {
                        HttpStatus status = (HttpStatus) ((HttpStatusCodeException) e).getStatusCode();
                        log.warn("Gemini HTTP error {}. Checking retry criteria...", status);
                        return status.value() == 429 || status.is5xxServerError();
                    }
                    return false;
                })
                .build();
        this.retry = RetryRegistry.of(config).retry("geminiApi");
    }

    public GeminiExtractionResponse extractBatch(
            List<ExcelParsingService.RowData> rows,
            String[] rawHeaders,
            String sourceFileName,
            String sheetName,
            int rowStart,
            int rowEnd) {
        log.info("Extracting batch rows {} to {} for file: {}", rowStart, rowEnd, sourceFileName);

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured.");
        }

        try {
            return retry.executeCheckedSupplier(
                    () -> executeGeminiCall(rows, rawHeaders, sourceFileName, sheetName, rowStart, rowEnd));
        } catch (Throwable t) {
            if (t instanceof HttpStatusCodeException) {
                HttpStatusCodeException hex = (HttpStatusCodeException) t;
                if (hex.getStatusCode().value() == 400) {
                    throw new ExtractionSchemaException("Schema or prompt format validation failed (400 Bad Request): "
                            + hex.getResponseBodyAsString(), t);
                }
            }
            if (t instanceof ExtractionSchemaException) {
                throw (ExtractionSchemaException) t;
            }
            throw new RuntimeException("Gemini API call failed after retries: " + t.getMessage(), t);
        }
    }

    private GeminiExtractionResponse executeGeminiCall(
            List<ExcelParsingService.RowData> rows,
            String[] rawHeaders,
            String sourceFileName,
            String sheetName,
            int rowStart,
            int rowEnd) throws Exception {
        // Read and parse gemini_extraction_prompt.md
        String promptContent;
        try (InputStream is = promptResource.getInputStream()) {
            promptContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

        // Split prompt file parts
        String systemInstruction = "";
        String schemaJson = "";
        String userInstructionTemplate = "";

        String[] sections = promptContent.split("# ");
        for (String section : sections) {
            if (section.startsWith("SYSTEM PROMPT")) {
                systemInstruction = section.substring("SYSTEM PROMPT".length()).trim();
            } else if (section.startsWith("STRUCTURED OUTPUT JSON SCHEMA")) {
                schemaJson = section.substring("STRUCTURED OUTPUT JSON SCHEMA".length()).trim();
            } else if (section.startsWith("USER MESSAGE TEMPLATE")) {
                userInstructionTemplate = section.substring("USER MESSAGE TEMPLATE".length()).trim();
            }
        }

        if (systemInstruction.isEmpty() || schemaJson.isEmpty() || userInstructionTemplate.isEmpty()) {
            throw new IllegalStateException("Failed to parse prompt templates from gemini_extraction_prompt.md");
        }

        // Parse JSON Schema into Map so we can nest it in the Gemini request
        @SuppressWarnings("unchecked")
        Map<String, Object> parsedSchema = objectMapper.readValue(schemaJson, Map.class);

        // Format user message instructions
        String rawHeaderArrayStr = objectMapper.writeValueAsString(rawHeaders);
        String batchRowsAsJsonArrayStr = objectMapper.writeValueAsString(rows);

        String userPrompt = userInstructionTemplate
                .replace("{source_file_name}", sourceFileName)
                .replace("{sheet_name}", sheetName == null ? "Sheet1" : sheetName)
                .replace("{raw_header_array}", rawHeaderArrayStr)
                .replace("{row_start}", String.valueOf(rowStart))
                .replace("{row_end}", String.valueOf(rowEnd))
                .replace("{batch_rows_as_json_array}", batchRowsAsJsonArrayStr);

        // Build Payload
        Map<String, Object> geminiRequest = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", userPrompt)))),
                "systemInstruction", Map.of(
                        "parts", List.of(
                                Map.of("text", systemInstruction))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", parsedSchema));

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel
                + ":generateContent?key=" + geminiApiKey;

        log.info("Posting prompt payload to Gemini API model: {}", geminiModel);
        byte[] responseBytes = null;
        try {
            responseBytes = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("User-Agent", "aistudio-build")
                    .body(geminiRequest)
                    .retrieve()
                    .body(byte[].class);
        } catch (HttpStatusCodeException hex) {
            if (hex.getStatusCode().value() == 429) {
                log.warn("Gemini Rate limit hit (429). Sleeping for 30s before retrying...");
                try {
                    Thread.sleep(30000);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
            throw hex;
        }

        if (responseBytes == null || responseBytes.length == 0) {
            throw new RuntimeException("Empty response received from Gemini API");
        }

        String rawResponseStr = new String(responseBytes, java.nio.charset.StandardCharsets.UTF_8);
        Map<?, ?> rawResponse = objectMapper.readValue(rawResponseStr, Map.class);

        List<?> candidates = (List<?>) rawResponse.get("candidates");
        if (candidates == null || candidates.isEmpty()) {
            throw new RuntimeException("No candidates found in Gemini response");
        }

        Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
        Map<?, ?> content = (Map<?, ?>) candidate.get("content");
        List<?> parts = (List<?>) content.get("parts");
        Map<?, ?> part = (Map<?, ?>) parts.get(0);
        String responseText = (String) part.get("text");

        log.info("Received raw extraction response: {}", responseText);

        // Deserialize response text conforming to GeminiExtractionResponse DTO
        return objectMapper.readValue(responseText, GeminiExtractionResponse.class);
    }
}
