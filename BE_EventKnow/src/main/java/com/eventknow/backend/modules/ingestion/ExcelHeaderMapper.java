package com.eventknow.backend.modules.ingestion;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

@Component
public class ExcelHeaderMapper {

    public record HeaderMappingResult(
            int headerRowIndex,
            Map<String, Integer> standardMapping,
            Map<Integer, String> unmappedHeaders) {
    }

    // Normalized matches templates (using case-insensitive lowercase matching after
    // removing accents)
    private static final Map<String, List<Pattern>> FIELD_PATTERNS = new LinkedHashMap<>();

    static {
        FIELD_PATTERNS.put("fullName", List.of(
                Pattern.compile(
                        ".*(ho\\s+ten|ho\\s+va\\s+ten|ten\\s+dai\\s+bieu|ho\\s+va\\s+dem|name|full\\s+name).*")));
        FIELD_PATTERNS.put("lastNameSplit", List.of(
                Pattern.compile(".*(ho\\s+dem|ho\\s+va\\s+dem|\\bho\\b|last\\s*name).*")));
        FIELD_PATTERNS.put("firstNameSplit", List.of(
                Pattern.compile(".*(\\bten\\b|first\\s*name).*")));
        FIELD_PATTERNS.put("email", List.of(
                Pattern.compile(".*(email|e-mail|thu\\s+dien\\s+tu).*")));
        FIELD_PATTERNS.put("phone", List.of(
                Pattern.compile(".*(dien\\s+thoai|\\bsdt\\b|so\\s+dien\\s+thoai|phone|\\btel\\b|telephone).*")));
        FIELD_PATTERNS.put("organization", List.of(
                Pattern.compile(
                        ".*(don\\s+vi|co\\s+quan|truong|vien|cong\\s+ty|noi\\s+cong\\s+tac|cong\\s+tac|organization|company).*")));
        FIELD_PATTERNS.put("position", List.of(
                Pattern.compile(".*(chuc\\s+vu|chuc\\s+danh|vi\\s+tri|position|title).*")));
        FIELD_PATTERNS.put("academicTitle", List.of(
                Pattern.compile(".*(hoc\\s+ham|hoc\\s+vi|academic\\s+title|degree).*")));
        FIELD_PATTERNS.put("researchFields", List.of(
                Pattern.compile(".*(linh\\s+vuc|chuyen\\s+mon|chuyen\\s+nganh|nghien\\s+cuu|expertise|research).*")));
    }

    /**
     * Detects header row index and matches column index mapping.
     */
    public HeaderMappingResult detectHeaderMapping(Sheet sheet) {
        int lastRowNum = sheet.getLastRowNum();
        int bestHeaderRowIndex = 0;
        int maxScore = -1;
        Map<String, Integer> bestStandardMapping = new HashMap<>();
        Map<Integer, String> bestUnmappedHeaders = new LinkedHashMap<>();

        DataFormatter dataFormatter = new DataFormatter();
        int rowsToScan = Math.min(lastRowNum + 1, 10);

        for (int r = 0; r < rowsToScan; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }

            int score = 0;
            Map<String, Integer> standardMapping = new HashMap<>();
            Map<Integer, String> unmappedHeaders = new LinkedHashMap<>();
            int maxCol = row.getLastCellNum();

            for (int c = 0; c < maxCol; c++) {
                Cell cell = row.getCell(c);
                if (cell == null) {
                    continue;
                }

                String headerText = dataFormatter.formatCellValue(cell).trim();
                if (headerText.isEmpty()) {
                    continue;
                }

                String normalizedText = removeAccents(headerText.toLowerCase(Locale.ROOT));
                boolean matched = false;

                for (Map.Entry<String, List<Pattern>> entry : FIELD_PATTERNS.entrySet()) {
                    String field = entry.getKey();
                    for (Pattern pattern : entry.getValue()) {
                        if (pattern.matcher(normalizedText).matches()) {
                            standardMapping.put(field, c);
                            score++;
                            matched = true;
                            break;
                        }
                    }
                    if (matched) {
                        break;
                    }
                }

                if (!matched) {
                    unmappedHeaders.put(c, headerText);
                }
            }

            // We weight hoTen, email, phone higher as indicators of a header row
            int vitalScore = 0;
            if (standardMapping.containsKey("fullName")
                    || (standardMapping.containsKey("lastNameSplit") && standardMapping.containsKey("firstNameSplit")))
                vitalScore += 3;
            if (standardMapping.containsKey("email"))
                vitalScore += 2;
            if (standardMapping.containsKey("phone"))
                vitalScore += 2;
            score += vitalScore;

            if (score > maxScore && score > 0) {
                maxScore = score;
                bestHeaderRowIndex = r;
                bestStandardMapping = standardMapping;
                bestUnmappedHeaders = unmappedHeaders;
            }
        }

        // Map split first/last names if fullname is not found
        if (!bestStandardMapping.containsKey("fullName")
                && bestStandardMapping.containsKey("lastNameSplit")
                && bestStandardMapping.containsKey("firstNameSplit")) {
            // We keep the indices of split names in standardMapping
        }

        return new HeaderMappingResult(bestHeaderRowIndex, bestStandardMapping, bestUnmappedHeaders);
    }

    private String removeAccents(String src) {
        if (src == null) {
            return "";
        }
        String normalized = Normalizer.normalize(src, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("").replace('đ', 'd').replace('Đ', 'D');
    }
}
