package com.eventknow.backend.modules.ingestion.normalizer;

import org.springframework.stereotype.Component;
import java.util.Set;
import java.util.regex.Pattern;
import com.eventknow.backend.modules.ingestion.service.ExtractionResultProcessor;

@Component
public class OrganizationSanitizer {

    private static final Set<String> EXCLUSION_LIST = Set.of(
            "_", "ca nhan", "unemployed", "k ro", "chua co a", "tu do", "freelance", "none", "null", "chua co", "nan",
            "-");

    private static final Pattern LEGAL_SUFFIX_PATTERN = Pattern.compile(
            "\\b(cty|cong ty|tnhh|cp|jsc|co ltd|inc|group|corp|corporation)\\b");

    public String sanitizeAndGetNormalizedName(String orgName) {
        if (orgName == null || orgName.isBlank()) {
            return null;
        }

        // Bước 1: Chuẩn hóa cơ bản (lowercase, không dấu, không dấu câu)
        String normalized = ExtractionResultProcessor.normalizeString(orgName);

        // Bước 2: Loại bỏ hậu tố pháp lý trong normalized name
        String stripped = LEGAL_SUFFIX_PATTERN.matcher(normalized).replaceAll("").trim();
        stripped = stripped.replaceAll("\\s+", " ").trim();

        // Bước 3: So khớp exclusion list
        if (stripped.isEmpty() || EXCLUSION_LIST.contains(stripped) || EXCLUSION_LIST.contains(normalized)) {
            return null;
        }

        return stripped;
    }

    public boolean isExcluded(String orgName) {
        if (orgName == null || orgName.isBlank()) {
            return true;
        }
        String normalized = ExtractionResultProcessor.normalizeString(orgName);
        String stripped = LEGAL_SUFFIX_PATTERN.matcher(normalized).replaceAll("").trim();
        stripped = stripped.replaceAll("\\s+", " ").trim();
        return stripped.isEmpty() || EXCLUSION_LIST.contains(stripped) || EXCLUSION_LIST.contains(normalized);
    }
}
