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
    private static final Map<String, List<String>> FIELD_EXACT_TERMS = new LinkedHashMap<>();
    private static final Map<String, List<Pattern>> FIELD_PATTERNS = new LinkedHashMap<>();

    static {
        FIELD_EXACT_TERMS.put("fullName", List.of("ho ten", "ho va ten", "ten dai bieu", "name", "full name",
                "ho ten dai bieu", "nguoi dai dien", "your name"));
        FIELD_EXACT_TERMS.put("lastNameSplit", List.of("ho dem", "ho va dem", "ho", "last name"));
        FIELD_EXACT_TERMS.put("firstNameSplit", List.of("ten", "first name"));
        FIELD_EXACT_TERMS.put("email",
                List.of("email", "e-mail", "thu dien tu", "dia chi email", "your email", "email lien he"));
        FIELD_EXACT_TERMS.put("phone", List.of("dien thoai", "sdt", "so dien thoai", "phone", "tel", "telephone",
                "dtdd", "so dtdd", "dien thoai di dong", "so dt", "phone number", "your phone number"));
        FIELD_EXACT_TERMS.put("organization",
                List.of("don vi", "co quan", "cong ty", "cty", "organization", "company", "noi cong tac", "cong tac",
                        "ten don vi", "ten cong ty", "don vi cong tac", "co quan cong tac"));
        FIELD_EXACT_TERMS.put("position", List.of("chuc vu", "chuc danh", "vi tri", "position", "title"));
        FIELD_EXACT_TERMS.put("academicTitle", List.of("hoc ham", "hoc vi", "academic title", "degree"));
        FIELD_EXACT_TERMS.put("researchFields",
                List.of("linh vuc", "chuyen mon", "chuyen nganh", "nghien cuu", "expertise", "research"));

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
                Pattern.compile(
                        ".*\\b(dien\\s*thoai|sdt|tel|mobile|phone|dtdd|so\\s+dtdd|dien\\s+thoai\\s+di\\s+dong)\\b.*")));
        FIELD_PATTERNS.put("organization", List.of(
                Pattern.compile(
                        ".*\\b(truong\\s+dai\\s+hoc|truong\\s+thpt|truong\\s+cao\\s+dang|dai\\s+hoc|hoc\\s+vien|vien\\s+nghien\\s+cuu|don\\s+vi|co\\s+quan|cong\\s+ty|cty|noi\\s+cong\\s+tac|cong\\s+tac|organization|company)\\b.*")));
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

            // Store clean headers
            Map<Integer, String> colIndexToText = new HashMap<>();
            Map<Integer, String> colIndexToNormalized = new HashMap<>();
            for (int c = 0; c < maxCol; c++) {
                Cell cell = row.getCell(c);
                if (cell != null) {
                    String headerText = dataFormatter.formatCellValue(cell).trim();
                    if (!headerText.isEmpty()) {
                        colIndexToText.put(c, headerText);
                        colIndexToNormalized.put(c, normalizeHeader(headerText));
                    }
                }
            }

            Set<Integer> mappedCols = new HashSet<>();

            // Step 1: Exact matches (priority)
            for (Map.Entry<String, List<String>> entry : FIELD_EXACT_TERMS.entrySet()) {
                String field = entry.getKey();
                List<Integer> matchedCols = new ArrayList<>();
                for (Map.Entry<Integer, String> colEntry : colIndexToNormalized.entrySet()) {
                    int c = colEntry.getKey();
                    if (mappedCols.contains(c))
                        continue;
                    if (entry.getValue().contains(colEntry.getValue())) {
                        matchedCols.add(c);
                    }
                }
                if (matchedCols.size() == 1) {
                    int assignedCol = matchedCols.get(0);
                    standardMapping.put(field, assignedCol);
                    mappedCols.add(assignedCol);
                    score += 2; // Exact matches score higher
                }
            }

            // Step 2: Substring matches (only for fields not yet mapped)
            for (Map.Entry<String, List<Pattern>> entry : FIELD_PATTERNS.entrySet()) {
                String field = entry.getKey();
                if (standardMapping.containsKey(field))
                    continue;

                List<Integer> matchedCols = new ArrayList<>();
                for (Map.Entry<Integer, String> colEntry : colIndexToNormalized.entrySet()) {
                    int c = colEntry.getKey();
                    if (mappedCols.contains(c))
                        continue;

                    for (Pattern pattern : entry.getValue()) {
                        if (pattern.matcher(colEntry.getValue()).matches()) {
                            matchedCols.add(c);
                            break;
                        }
                    }
                }

                // Ambiguity Guard check
                if (matchedCols.size() == 1) {
                    int assignedCol = matchedCols.get(0);
                    standardMapping.put(field, assignedCol);
                    mappedCols.add(assignedCol);
                    score++;
                } else if (matchedCols.size() > 1) {
                    // Ambiguity Guard: multiple matching columns of same regex, do not assign field
                }
            }

            // Gather unmapped columns
            for (Map.Entry<Integer, String> colEntry : colIndexToText.entrySet()) {
                int c = colEntry.getKey();
                if (!mappedCols.contains(c)) {
                    unmappedHeaders.put(c, colEntry.getValue());
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

    public static String normalizeHeader(String header) {
        if (header == null) {
            return "";
        }

        // 1. Lowercase and trim
        String temp = header.trim().toLowerCase();

        // 2. Remove accents/combining diacritical marks
        temp = java.text.Normalizer.normalize(temp, java.text.Normalizer.Form.NFD);
        temp = temp.replaceAll("\\p{M}", "");

        // 3. Replace 'đ' and 'Đ' -> 'd'
        temp = temp.replace('đ', 'd').replace('Đ', 'd');

        // 4. Normalize whitespaces and replace special characters with spaces
        return temp.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }
}
