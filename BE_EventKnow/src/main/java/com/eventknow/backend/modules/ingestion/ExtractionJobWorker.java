package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;
import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExtractionJobWorker {

    private final ExtractionJobRepository extractionJobRepository;
    private final RawEventRepository rawEventRepository;
    private final ExtractionResultProcessor resultProcessor;
    private final RuleBasedTitleNormalizer titleNormalizer;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private record PreExtractedRow(
            int rowNumber,
            String fullName,
            String email,
            String phone,
            String organization,
            String position,
            String academicTitleRaw,
            List<String> academicTitleNormalized,
            List<String> researchFieldsRaw,
            List<GeminiExtractionClient.DynamicAttributeDto> dynamicAttributes) {
    }

    @Scheduled(fixedDelayString = "${eventknow.worker.polling-delay:30000}")
    public void pollAndProcessJobs() {
        List<ExtractionJobEntity> jobs = extractionJobRepository.findTop10ByStatusInOrderByCreatedAtAsc(
                List.of(ExtractionJobEntity.ExtractionStatus.PENDING, ExtractionJobEntity.ExtractionStatus.RETRYING));

        if (jobs.isEmpty()) {
            return;
        }

        log.info("Polled {} pending/retrying extraction jobs for batch execution.", jobs.size());

        for (ExtractionJobEntity job : jobs) {
            processJob(job);
        }
    }

    private void processJob(ExtractionJobEntity job) {
        log.info("Processing extraction job ID: {} (rows {} to {})", job.getId(), job.getRowStart(), job.getRowEnd());
        job.setStatus(ExtractionJobEntity.ExtractionStatus.RETRYING); // Mark as active/retrying during call
        extractionJobRepository.save(job);

        try {
            // 1. Deserialize raw rows content & headers array
            List<ExcelParsingService.RowData> rows = objectMapper.readValue(
                    job.getRawRowsContent(),
                    new TypeReference<List<ExcelParsingService.RowData>>() {
                    });

            String[] headers = objectMapper.readValue(job.getRawHeaderCols(), String[].class);

            // 2. Fetch rawHeaderMap from rawEvent to read cached standardMapping and
            // unmappedHeaders
            RawEventEntity rawEvent = job.getRawEvent();
            Map<String, Object> rawHeaderMap = rawEvent.getRawHeaderMap();
            if (rawHeaderMap == null) {
                rawHeaderMap = Collections.emptyMap();
            }

            Map<String, Object> headerMap = null;
            String sheetName = job.getSourceSheetName();
            if (sheetName != null && rawHeaderMap.containsKey(sheetName)) {
                @SuppressWarnings("unchecked")
                Map<String, Object> m = (Map<String, Object>) rawHeaderMap.get(sheetName);
                headerMap = m;
            }
            if (headerMap == null) {
                headerMap = rawHeaderMap;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> standardMapping = (Map<String, Object>) headerMap.get("standardMapping");
            if (standardMapping == null) {
                standardMapping = Collections.emptyMap();
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> unmappedHeaders = (Map<String, Object>) headerMap.get("unmappedHeaders");
            if (unmappedHeaders == null) {
                unmappedHeaders = Collections.emptyMap();
            }

            // 3. Extract java-side core fields
            List<PreExtractedRow> preExtractedRows = new ArrayList<>();

            for (ExcelParsingService.RowData row : rows) {
                Map<String, String> rowData = row.data();

                // Full name (standard name column or split names)
                String fullName = null;
                Integer fullNameIdx = getIndex(standardMapping, "fullName");
                if (fullNameIdx != null) {
                    fullName = getCellValue(headers, rowData, fullNameIdx);
                } else {
                    Integer lastIdx = getIndex(standardMapping, "lastNameSplit");
                    Integer firstIdx = getIndex(standardMapping, "firstNameSplit");
                    String lastVal = getCellValue(headers, rowData, lastIdx);
                    String firstVal = getCellValue(headers, rowData, firstIdx);
                    if (lastVal != null || firstVal != null) {
                        fullName = ((lastVal != null ? lastVal : "") + " " + (firstVal != null ? firstVal : "")).trim();
                    }
                }

                if (fullName == null || fullName.trim().isEmpty()) {
                    continue; // Skip rows that don't have attendee names
                }
                fullName = fullName.trim();

                // Email
                Integer emailIdx = getIndex(standardMapping, "email");
                String email = getCellValue(headers, rowData, emailIdx);
                if (email != null)
                    email = email.trim();

                // Phone
                Integer phoneIdx = getIndex(standardMapping, "phone");
                String phoneRaw = getCellValue(headers, rowData, phoneIdx);
                String phone = normalizePhone(phoneRaw);

                // Organization
                Integer orgIdx = getIndex(standardMapping, "organization");
                String organization = getCellValue(headers, rowData, orgIdx);
                if (organization != null)
                    organization = organization.trim();

                // Position
                Integer posIdx = getIndex(standardMapping, "position");
                String position = getCellValue(headers, rowData, posIdx);
                if (position != null)
                    position = position.trim();

                // Academic Title
                Integer academicTitleIdx = getIndex(standardMapping, "academicTitle");
                String academicTitleRaw = getCellValue(headers, rowData, academicTitleIdx);
                if (academicTitleRaw != null)
                    academicTitleRaw = academicTitleRaw.trim();
                List<String> academicTitleNormalized = academicTitleRaw != null
                        ? titleNormalizer.normalize(academicTitleRaw)
                        : Collections.emptyList();

                // Research Fields
                Integer researchIdx = getIndex(standardMapping, "researchFields");
                String researchFieldsRawStr = getCellValue(headers, rowData, researchIdx);
                List<String> researchFieldsRaw = Collections.emptyList();
                if (researchFieldsRawStr != null && !researchFieldsRawStr.trim().isEmpty()) {
                    researchFieldsRaw = Arrays.stream(researchFieldsRawStr.split("[,;]+"))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList();
                }

                // Dynamic Attributes
                List<GeminiExtractionClient.DynamicAttributeDto> dynamicAttributes = new ArrayList<>();
                for (Map.Entry<String, Object> entry : unmappedHeaders.entrySet()) {
                    Integer colIdx = null;
                    try {
                        colIdx = Integer.parseInt(entry.getKey());
                    } catch (NumberFormatException ignored) {
                    }
                    if (colIdx != null && colIdx >= 0 && colIdx < headers.length) {
                        String colName = headers[colIdx];
                        String cellVal = rowData.get(colName);
                        if (cellVal != null && !cellVal.trim().isEmpty()) {
                            dynamicAttributes
                                    .add(new GeminiExtractionClient.DynamicAttributeDto(colName, cellVal.trim()));
                        }
                    }
                }

                PreExtractedRow preExt = new PreExtractedRow(
                        row.rowNumber(),
                        fullName,
                        email,
                        phone,
                        organization,
                        position,
                        academicTitleRaw,
                        academicTitleNormalized,
                        researchFieldsRaw,
                        dynamicAttributes);
                preExtractedRows.add(preExt);
            }

            // 4. Process each row in isolated REQUIRES_NEW transactions
            for (PreExtractedRow preExt : preExtractedRows) {
                List<GeminiExtractionClient.DynamicAttributeDto> finalDynAttrs = new ArrayList<>(
                        preExt.dynamicAttributes());
                // Add default ai_labeled=false attribute
                finalDynAttrs.add(
                        new GeminiExtractionClient.DynamicAttributeDto("ai_labeled", "false"));

                // Build Extracted PERSON Entity
                GeminiExtractionClient.ExtractedEntity personEntity = new GeminiExtractionClient.ExtractedEntity(
                        "PERSON",
                        preExt.fullName(),
                        preExt.email(),
                        preExt.phone(),
                        preExt.academicTitleRaw(),
                        "GUEST", // Default role initially
                        preExt.position(),
                        preExt.organization(), // organizationTextRaw
                        null, // orgName
                        null, // emailDomain
                        preExt.researchFieldsRaw(),
                        Collections.emptyList(), // Empty research domains initially
                        Collections.emptyList(), // Empty expertise tags initially
                        finalDynAttrs);

                List<GeminiExtractionClient.ExtractedEntity> rowEntities = new ArrayList<>();
                rowEntities.add(personEntity);

                // Build Extracted ORGANIZATION Entity
                if (preExt.organization() != null && !preExt.organization().isEmpty()) {
                    String domain = extractEmailDomain(preExt.email());
                    GeminiExtractionClient.ExtractedEntity orgEntity = new GeminiExtractionClient.ExtractedEntity(
                            "ORGANIZATION",
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            null,
                            preExt.organization(), // orgName
                            domain, // emailDomain
                            null,
                            null,
                            null,
                            Collections.emptyList());
                    rowEntities.add(orgEntity);
                }

                GeminiExtractionClient.BatchRowResult singleRowResult = new GeminiExtractionClient.BatchRowResult(
                        preExt.rowNumber(), rowEntities);

                try {
                    new org.springframework.transaction.support.TransactionTemplate(
                            transactionManager,
                            new org.springframework.transaction.support.DefaultTransactionDefinition(
                                    org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW))
                            .executeWithoutResult(status -> {
                                resultProcessor.processBatchRows(job.getRawEvent().getId(), List.of(singleRowResult));
                            });
                } catch (Throwable t) {
                    log.error("Failed to process row {} under isolated transaction on job {}. Error: {}",
                            preExt.rowNumber(), job.getId(), t.getMessage());
                }
            }

            // 5. Update status to DONE
            job.setStatus(ExtractionJobEntity.ExtractionStatus.DONE);
            job.setLastError(null);
            extractionJobRepository.save(job);
            log.info("Extraction job ID {} succeeded.", job.getId());

        } catch (ExtractionSchemaException e) {
            log.error("Fatal schema constraint error on job {}: {}", job.getId(), e.getMessage());
            job.setStatus(ExtractionJobEntity.ExtractionStatus.FAILED);
            job.setLastError("SCHEMA_ERROR: " + e.getMessage());
            extractionJobRepository.save(job);

        } catch (Throwable t) {
            log.error("Transient error processing job {}: {}", job.getId(), t.getMessage());
            int newRetry = job.getRetryCount() + 1;
            job.setRetryCount(newRetry);
            job.setLastError(t.getMessage());

            if (newRetry >= 3) {
                job.setStatus(ExtractionJobEntity.ExtractionStatus.FAILED);
            } else {
                job.setStatus(ExtractionJobEntity.ExtractionStatus.RETRYING);
            }
            extractionJobRepository.save(job);
        }

        // 8. Check parent file status
        checkAndUpdateParentStatus(job.getRawEvent());
    }

    private Integer getIndex(Map<String, Object> mapping, String key) {
        Object val = mapping.get(key);
        if (val == null) {
            return null;
        }
        if (val instanceof Number) {
            return ((Number) val).intValue();
        }
        try {
            return Integer.parseInt(val.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String getCellValue(String[] headers, Map<String, String> rowData, Integer colIdx) {
        if (colIdx == null || colIdx < 0 || colIdx >= headers.length) {
            return null;
        }
        String colName = headers[colIdx];
        String val = rowData.get(colName);
        if (val != null) {
            val = val.trim();
            if (val.isEmpty()) {
                val = null;
            }
        }
        return val;
    }

    public static String normalizePhone(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }
        if (digits.length() == 9 && (digits.startsWith("3") || digits.startsWith("5") || digits.startsWith("7")
                || digits.startsWith("8") || digits.startsWith("9"))) {
            digits = "0" + digits;
        }
        return digits.isEmpty() ? null : digits;
    }

    public static String extractEmailDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        int atIdx = email.indexOf("@");
        if (atIdx < email.length() - 1) {
            return email.substring(atIdx + 1).trim().toLowerCase();
        }
        return null;
    }

    private void checkAndUpdateParentStatus(RawEventEntity rawEvent) {
        UUID rawEventId = rawEvent.getId();
        List<ExtractionJobEntity> siblings = extractionJobRepository.findByRawEventId(rawEventId);

        boolean allDone = true;
        boolean hasFailed = false;
        List<String> failedRanges = new java.util.ArrayList<>();

        for (ExtractionJobEntity s : siblings) {
            if (s.getStatus() == ExtractionJobEntity.ExtractionStatus.PENDING ||
                    s.getStatus() == ExtractionJobEntity.ExtractionStatus.RETRYING) {
                allDone = false;
                break;
            }
            if (s.getStatus() == ExtractionJobEntity.ExtractionStatus.FAILED) {
                hasFailed = true;
                failedRanges.add("[" + s.getRowStart() + "-" + s.getRowEnd() + "]");
            }
        }

        if (allDone) {
            log.info("All batch jobs completed for rawEventId: {}", rawEventId);
            RawEventEntity reloaded = rawEventRepository.findById(rawEventId).orElse(rawEvent);

            if (hasFailed) {
                reloaded.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
                reloaded.setErrorMessage("Some ingestion batches failed: " + String.join(", ", failedRanges));
            } else {
                reloaded.setIngestionStatus(RawEventEntity.IngestionStatus.DONE);
                reloaded.setErrorMessage(null);
            }
            rawEventRepository.save(reloaded);
            log.info("Transitioned parent rawEvent ID {} status to {}.", rawEventId, reloaded.getIngestionStatus());
        }
    }
}
