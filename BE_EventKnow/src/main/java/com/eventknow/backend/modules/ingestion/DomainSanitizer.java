package com.eventknow.backend.modules.ingestion;

import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class DomainSanitizer {
    private static final Set<String> VALID_DOMAINS = Set.of(
            "AI_ML", "MEDTECH", "AGRITECH", "GREENTECH", "BIOTECH",
            "EDUTECH", "FINTECH", "DIGITAL_TECH", "GOV_POLICY", "MEDIA_COMM", "KHAC");

    private static final Map<String, String> SYNONYM_MAP = Map.ofEntries(
            Map.entry("công nghệ", "DIGITAL_TECH"),
            Map.entry("cong nghe", "DIGITAL_TECH"),
            Map.entry("y tế", "MEDTECH"),
            Map.entry("y te", "MEDTECH"),
            Map.entry("giáo dục", "EDUTECH"),
            Map.entry("giao duc", "EDUTECH"),
            Map.entry("công nghệ sinh học", "BIOTECH"),
            Map.entry("sinh học", "BIOTECH"));

    public List<String> sanitize(List<String> rawDomains) {
        if (rawDomains == null || rawDomains.isEmpty()) {
            return List.of("KHAC");
        }

        Set<String> result = new LinkedHashSet<>();
        for (String domain : rawDomains) {
            if (domain == null || domain.isBlank())
                continue;

            String trimmed = domain.trim();
            String upper = trimmed.toUpperCase();

            if (VALID_DOMAINS.contains(upper)) {
                result.add(upper);
            } else {
                String mapped = SYNONYM_MAP.get(trimmed.toLowerCase());
                result.add(mapped != null ? mapped : "KHAC");
            }
        }
        return result.isEmpty() ? List.of("KHAC") : new ArrayList<>(result);
    }
}
