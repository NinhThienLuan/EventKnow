package com.eventknow.backend.integration.llm;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Conditional;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Conditional(OllamaOrLocalCondition.class)
@Slf4j
public class OllamaLlmClient implements LlmProviderClient {

    @Value("${ai.ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ai.ollama.model:qwen2.5:7b}")
    private String ollamaModel;

    @Value("${ai.ollama.timeout-seconds:300}")
    private int timeoutSeconds;

    @Value("classpath:gemini_extraction_prompt.md")
    private Resource promptResource;

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OllamaLlmClient(
            @Value("${ai.ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ai.ollama.timeout-seconds:180}") int timeoutSeconds) {
        org.springframework.http.client.SimpleClientHttpRequestFactory requestFactory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000);
        requestFactory.setReadTimeout(timeoutSeconds * 1000);

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                        org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(org.springframework.http.HttpHeaders.ACCEPT,
                        org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public List<EnrichedTaxonomyDto> extractTaxonomy(List<AttendeeExtractionInputDto> batch) {
        log.info("OllamaLlmClient: Extracting taxonomy for batch of {} elements using model: {}", batch.size(),
                ollamaModel);
        try {
            return executeOllamaCall(batch);
        } catch (Exception e) {
            log.error("Ollama API call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Ollama API call failed: " + e.getMessage(), e);
        }
    }

    private List<EnrichedTaxonomyDto> executeOllamaCall(List<AttendeeExtractionInputDto> batch) throws Exception {
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

        String batchRowsAsJsonArrayStr = objectMapper.writeValueAsString(batch);

        String userPrompt = userInstructionTemplate
                .replace("{source_file_name}", "async-batch-enrichment")
                .replace("{sheet_name}", "attendees")
                .replace("{batch_rows_as_json_array}", batchRowsAsJsonArrayStr);

        // Instruct Ollama explicitly on expected schema constraints and example outputs
        String detailedSystemPrompt = systemInstruction +
                "\n\nYou MUST return a JSON object conforming exactly to this JSON Schema:\n" + schemaJson +
                "\n\nExample Output Format:\n" +
                "{\n" +
                "  \"labeled_rows\": [\n" +
                "    {\n" +
                "      \"row_number\": 0,\n" +
                "      \"research_domains\": [\"AI_ML\"],\n" +
                "      \"expertise_tags\": [\"NLP\", \"Computer Vision\"],\n" +
                "      \"attendee_role\": \"EXPERT\"\n" +
                "    }\n" +
                "  ]\n" +
                "}\n" +
                "Do not include any reasoning or introductory text. Return raw JSON.";

        Map<String, Object> ollamaRequest = Map.of(
                "model", ollamaModel,
                "prompt", userPrompt,
                "system", detailedSystemPrompt,
                "stream", false,
                "format", "json");

        String url = ollamaBaseUrl + "/api/generate";
        log.info("Sending prompt payload to Ollama URL: {}", url);

        String responseStr = restClient.post()
                .uri("/api/generate")
                .body(ollamaRequest)
                .retrieve()
                .body(String.class);

        if (responseStr == null || responseStr.trim().isEmpty()) {
            throw new RuntimeException("Empty response received from Ollama API");
        }

        Map<?, ?> responseMap = objectMapper.readValue(responseStr, Map.class);
        String responseText = (String) responseMap.get("response");
        if (responseText == null || responseText.trim().isEmpty()) {
            throw new RuntimeException("Missing 'response' content in Ollama API JSON body");
        }

        log.debug("Ollama responseText: {}", responseText);

        GeminiLabelingResponse response = objectMapper.readValue(responseText, GeminiLabelingResponse.class);
        if (response == null || response.labeledRows() == null) {
            throw new RuntimeException("Ollama response is null or missing labeled_rows array");
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
