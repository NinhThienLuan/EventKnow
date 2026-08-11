package com.eventknow.backend.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class AnalyzeController {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-3.6-flash}")
    private String geminiModel;

    private final RestClient restClient = RestClient.builder().build();

    public record AnalyzeRequest(
            String prompt,
            List<String> sourceIds) {
    }

    public record GeminiResponseWrapper(
            String status,
            String prompt,
            Object data,
            String message) {
    }

    // DTO mapping for Gemini response
    public record GeminiAnalysisResult(
            String title,
            List<String> summaryParagraphs,
            List<String> keyInsights,
            List<String> recommendedActions) {
    }

    @PostMapping("/analyze")
    public ResponseEntity<?> analyze(@RequestBody AnalyzeRequest request) {
        if (request.prompt() == null || request.prompt().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing prompt in request body"));
        }

        if (geminiApiKey == null || geminiApiKey.trim().isEmpty()) {
            log.warn("GEMINI_API_KEY not configured. Returning local fallback synthesis.");
            return ResponseEntity.ok(new GeminiResponseWrapper(
                    "fallback",
                    request.prompt(),
                    null,
                    "Trích xuất dữ liệu từ Kho lưu trữ địa phương EventKnow DB (Offline/Fallback mode)."));
        }

        try {
            String systemInstruction = """
                    Bạn là Trợ lý Tri thức Sự kiện Chuyên nghiệp "EventKnow" dành cho quản lý dữ liệu sự kiện, hội thảo khoa học và tổ chức công nghệ tại Việt Nam.
                    Khi nhận được câu hỏi phân tích, hãy tạo ra báo cáo phân tích tổng hợp bằng Tiếng Việt mang phong cách báo cáo công vụ/doanh nghiệp cao cấp.
                    Bạn phải trả về kết quả dưới dạng JSON tuân thủ cấu trúc sau:
                    {
                      "title": "Tiêu đề báo cáo phân tích ngắn gọn",
                      "summaryParagraphs": ["Đoạn văn 1 có chèn mã trích dẫn dạng [EVT-2024-08] hoặc [VN-AI-CONF-01]...", "Đoạn văn 2..."],
                      "keyInsights": ["Điểm nổi bật 1", "Điểm nổi bật 2", "Điểm nổi bật 3"],
                      "recommendedActions": ["Khuyến nghị 1", "Khuyến nghị 2"]
                    }""";

            // Build request matches Schema expectations
            Map<String, Object> geminiRequest = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("text", request.prompt())))),
                    "systemInstruction", Map.of(
                            "parts", List.of(
                                    Map.of("text", systemInstruction))),
                    "generationConfig", Map.of(
                            "responseMimeType", "application/json",
                            "responseSchema", Map.of(
                                    "type", "OBJECT",
                                    "properties", Map.of(
                                            "title", Map.of("type", "STRING"),
                                            "summaryParagraphs", Map.of(
                                                    "type", "ARRAY",
                                                    "items", Map.of("type", "STRING")),
                                            "keyInsights", Map.of(
                                                    "type", "ARRAY",
                                                    "items", Map.of("type", "STRING")),
                                            "recommendedActions", Map.of(
                                                    "type", "ARRAY",
                                                    "items", Map.of("type", "STRING"))),
                                    "required", List.of("title", "summaryParagraphs", "keyInsights"))));

            log.info("Sending prompt request to Gemini API model: {}", geminiModel);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel
                    + ":generateContent?key=" + geminiApiKey;

            Map<String, Object> rawResponse = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("User-Agent", "aistudio-build")
                    .body(geminiRequest)
                    .retrieve()
                    .body(Map.class);

            if (rawResponse == null) {
                throw new RuntimeException("Empty response received from Gemini API");
            }

            // Extract the generated text from response structure
            List<?> candidates = (List<?>) rawResponse.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("No candidates found in Gemini response");
            }

            Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content = (Map<?, ?>) candidate.get("content");
            List<?> parts = (List<?>) content.get("parts");
            Map<?, ?> part = (Map<?, ?>) parts.get(0);
            String responseText = (String) part.get("text");

            log.info("Received raw response text: {}", responseText);

            // Deserialize responseText matching GeminiAnalysisResult
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "prompt", request.prompt(),
                    "data", new com.fasterxml.jackson.databind.ObjectMapper().readValue(responseText, Map.class)));

        } catch (Exception e) {
            log.error("Failed to generate AI analysis:", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Failed to generate AI analysis",
                            "details", e.getMessage()));
        }
    }
}
