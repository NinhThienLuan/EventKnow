package com.eventknow.backend.integration.llm;

import com.eventknow.backend.modules.ingestion.ExtractionSchemaException;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import io.github.resilience4j.retry.RetryRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpStatusCodeException;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(name = "ai.provider", havingValue = "gemini", matchIfMissing = true)
@Slf4j
public class GeminiLlmClient implements LlmProviderClient {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String geminiModel;

    @Value("classpath:gemini_extraction_prompt.md")
    private Resource promptResource;

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Retry retry;

    public GeminiLlmClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(60000);
        requestFactory.setReadTimeout(120000);

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .build();

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

    @Override
    public List<EnrichedTaxonomyDto> extractTaxonomy(List<AttendeeExtractionInputDto> batch) {
        log.info("GeminiLlmClient: Extracting taxonomy for batch of {} elements.", batch.size());

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured.");
        }

        try {
            return retry.executeCheckedSupplier(() -> executeGeminiCall(batch));
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

    private List<EnrichedTaxonomyDto> executeGeminiCall(List<AttendeeExtractionInputDto> batch) throws Exception {
        String promptContent;
        try (InputStream is = promptResource.getInputStream()) {
            promptContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }

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

        @SuppressWarnings("unchecked")
        Map<String, Object> parsedSchema = objectMapper.readValue(schemaJson, Map.class);
        String batchRowsAsJsonArrayStr = objectMapper.writeValueAsString(batch);

        String userPrompt = userInstructionTemplate
                .replace("{source_file_name}", "async-batch-enrichment")
                .replace("{sheet_name}", "attendees")
                .replace("{batch_rows_as_json_array}", batchRowsAsJsonArrayStr);

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

        String rawResponseStr = new String(responseBytes, StandardCharsets.UTF_8);
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

        log.info("Received raw labeling response: {}", responseText);

        GeminiLabelingResponse response = objectMapper.readValue(responseText, GeminiLabelingResponse.class);
        if (response == null || response.labeledRows() == null) {
            throw new RuntimeException("Gemini response is null or missing labeled_rows");
        }

        return response.labeledRows().stream()
                .map(row -> new EnrichedTaxonomyDto(
                        row.rowNumber(),
                        row.researchDomains(),
                        row.expertiseTags(),
                        row.attendeeRole()))
                .collect(Collectors.toList());
    }

    private record LabeledRowResult(
            @JsonProperty("row_number") int rowNumber,
            @JsonProperty("research_domains") List<String> researchDomains,
            @JsonProperty("expertise_tags") List<String> expertiseTags,
            @JsonProperty("attendee_role") String attendeeRole) {
    }

    private record GeminiLabelingResponse(
            @JsonProperty("labeled_rows") List<LabeledRowResult> labeledRows) {
    }
}
