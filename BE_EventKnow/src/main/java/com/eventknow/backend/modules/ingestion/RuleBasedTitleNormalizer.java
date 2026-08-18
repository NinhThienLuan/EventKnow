package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.AcademicTitleAliasEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleBasedTitleNormalizer {

    private final AcademicTitleAliasRepository aliasRepository;

    public List<String> normalize(String rawTitle) {
        if (rawTitle == null || rawTitle.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String clean = rawTitle.trim();
        log.info("Normalizing raw academic title: {}", clean);
        Set<String> normalizedTags = new LinkedHashSet<>();

        // Try matching the whole raw title first to avoid splitting abbreviations like
        // "Th.S"
        Optional<AcademicTitleAliasEntity> wholeAliasOpt = aliasRepository.findFirstByRawAliasIgnoreCase(clean);
        if (wholeAliasOpt.isPresent()) {
            normalizedTags.add(wholeAliasOpt.get().getNormalizedTag().name());
            List<String> list = new ArrayList<>(normalizedTags);
            log.info("Normalized '{}' to tags: {}", rawTitle, list);
            return list;
        }

        // Split by standard delimiters like dots, slashes, commas, dashes
        String[] parts = clean.split("[.,/\\\\-]+");

        for (String part : parts) {
            String trimmedPart = part.trim();
            if (trimmedPart.isEmpty()) {
                continue;
            }

            // 1. Try matching the entire trimmed part (e.g. "Kỹ sư" or "Thạc sĩ" or "GS")
            Optional<AcademicTitleAliasEntity> aliasOpt = aliasRepository.findFirstByRawAliasIgnoreCase(trimmedPart);
            if (aliasOpt.isPresent()) {
                normalizedTags.add(aliasOpt.get().getNormalizedTag().name());
            } else {
                // 2. If it did not match, try splitting by spaces and look up individual
                // sub-tokens
                String[] subTokens = trimmedPart.split("\\s+");
                boolean matchedAnySub = false;
                for (String token : subTokens) {
                    String cleanToken = token.trim();
                    if (cleanToken.isEmpty()) {
                        continue;
                    }
                    Optional<AcademicTitleAliasEntity> subAliasOpt = aliasRepository
                            .findFirstByRawAliasIgnoreCase(cleanToken);
                    if (subAliasOpt.isPresent()) {
                        normalizedTags.add(subAliasOpt.get().getNormalizedTag().name());
                        matchedAnySub = true;
                    }
                }
                if (!matchedAnySub) {
                    normalizedTags.add("Khac");
                }
            }
        }

        if (normalizedTags.isEmpty()) {
            normalizedTags.add("Khac");
        }

        List<String> list = new ArrayList<>(normalizedTags);
        log.info("Normalized '{}' to tags: {}", rawTitle, list);
        return list;
    }
}
