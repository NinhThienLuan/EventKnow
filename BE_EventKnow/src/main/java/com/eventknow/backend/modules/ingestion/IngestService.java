package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;

import java.time.LocalDate;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class IngestService {

    private final RawEventRepository rawEventRepository;
    private final ExtractionJobRepository extractionJobRepository;
    private final ExcelParsingService excelParsingService;
    private final DepartmentResolutionService departmentResolutionService;
    private final EventResolutionService eventResolutionService;
    private final DriveFileContentService driveFileContentService;
    private final com.eventknow.backend.modules.identity.EventRepository eventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${eventknow.batch.size:30}")
    private int defaultBatchSize;

    @Transactional
    public UUID initiateIngestion(
            byte[] fileBytes,
            String originalFileName,
            String parentFolderId,
            String manualDepartment,
            String manualEventName,
            LocalDate manualEventDate,
            String ownerEmail,
            String googleDriveFileId) {
        log.info("Initiating file ingestion for: {}, driveId: {}", originalFileName, googleDriveFileId);

        // 1. Resolve department
        String department = departmentResolutionService.resolveDepartment(parentFolderId, manualDepartment);

        // 2. Resolve or parse Event Meta
        String eventName = manualEventName;
        LocalDate eventDate = manualEventDate;
        if (eventName == null || eventName.trim().isEmpty()) {
            EventMeta meta = parseEventMetaFromFileName(originalFileName);
            eventName = meta.name();
            eventDate = meta.date();
        }

        UUID eventId = eventResolutionService.resolveCanonicalEvent(eventName, eventDate, department);
        com.eventknow.backend.model.entity.Core.EventEntity eventEntity = eventRepository.findById(eventId)
                .orElse(null);

        // 3. Create RawEventEntity
        RawEventEntity rawEvent = RawEventEntity.builder()
                .googleDriveFileId(googleDriveFileId)
                .sourceFileName(originalFileName)
                .driveOwnerEmail(ownerEmail)
                .department(department)
                .event(eventEntity)
                .eventName(eventName)
                .eventDate(eventDate)
                .sourceType(RawEventEntity.SourceType.EXCEL)
                .ingestionStatus(RawEventEntity.IngestionStatus.PROCESSING)
                .build();

        rawEvent = rawEventRepository.save(rawEvent);

        try {
            // 4. Download file if bytes are empty and drive ID is present
            byte[] activeBytes = fileBytes;
            if ((activeBytes == null || activeBytes.length == 0) && googleDriveFileId != null
                    && !googleDriveFileId.isEmpty()) {
                activeBytes = driveFileContentService.downloadFileContent(googleDriveFileId, ownerEmail);
            }

            if (activeBytes == null || activeBytes.length == 0) {
                throw new IllegalArgumentException("No file content received for ingestion");
            }

            // 5. Parse sheet structures
            List<ExcelParsingService.SheetData> sheets = excelParsingService.parseWorkbook(activeBytes);
            if (sheets.isEmpty()) {
                throw new IllegalArgumentException("No sheets found in Excel file");
            }

            // Save rawHeaderMap using the mapping from the first sheet
            ExcelParsingService.SheetData firstSheet = sheets.get(0);
            if (firstSheet.headerMapping() != null) {
                Map<String, Object> headerMap = new LinkedHashMap<>();
                headerMap.put("headerRowIndex", firstSheet.headerMapping().headerRowIndex());
                headerMap.put("standardMapping", firstSheet.headerMapping().standardMapping());

                Map<String, String> unmappedStr = new LinkedHashMap<>();
                if (firstSheet.headerMapping().unmappedHeaders() != null) {
                    for (Map.Entry<Integer, String> entry : firstSheet.headerMapping().unmappedHeaders().entrySet()) {
                        unmappedStr.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
                headerMap.put("unmappedHeaders", unmappedStr);
                rawEvent.setRawHeaderMap(headerMap);
                rawEvent = rawEventRepository.save(rawEvent); // persist mapping
            }

            // 6. Split rows into batch jobs
            int totalJobsCreated = 0;
            for (ExcelParsingService.SheetData sheet : sheets) {
                List<ExcelParsingService.RowData> rows = sheet.rows();
                if (rows.isEmpty()) {
                    continue;
                }

                String[] headers = sheet.headers().toArray(new String[0]);
                int rowCount = rows.size();
                for (int startIdx = 0; startIdx < rowCount; startIdx += defaultBatchSize) {
                    int endIdx = Math.min(startIdx + defaultBatchSize, rowCount);
                    List<ExcelParsingService.RowData> subList = rows.subList(startIdx, endIdx);

                    int rowStart = subList.get(0).rowNumber();
                    int rowEnd = subList.get(subList.size() - 1).rowNumber();

                    // Serialize raw rows content and headers content to string
                    String rawRowsStr = objectMapper.writeValueAsString(subList);
                    String headersStr = objectMapper.writeValueAsString(headers);

                    ExtractionJobEntity job = ExtractionJobEntity.builder()
                            .rawEvent(rawEvent)
                            .status(ExtractionJobEntity.ExtractionStatus.PENDING)
                            .retryCount(0)
                            .batchIndex(totalJobsCreated)
                            .rowStart(rowStart)
                            .rowEnd(rowEnd)
                            .rawHeaderCols(headersStr)
                            .rawRowsContent(rawRowsStr)
                            .sourceSheetName(sheet.sheetName())
                            .build();

                    extractionJobRepository.save(job);
                    totalJobsCreated++;
                }
            }

            if (totalJobsCreated == 0) {
                rawEvent.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
                rawEvent.setErrorMessage("The uploaded/downloaded file contained no valid rows data to process.");
                rawEventRepository.save(rawEvent);
            }

            log.info("Ingestion jobs split successfully: created {} batch jobs.", totalJobsCreated);
            return rawEvent.getId();

        } catch (DriveConnectionExpiredException driveEx) {
            log.error("Google Drive connection credentials expired/revoked: {}", driveEx.getMessage());
            rawEvent.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
            rawEvent.setErrorMessage("DRIVE_CONNECTION_EXPIRED: " + driveEx.getMessage());
            rawEventRepository.save(rawEvent);
            return rawEvent.getId();
        } catch (Exception ex) {
            log.error("Unhandled error initiating file ingestion: ", ex);
            rawEvent.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
            rawEvent.setErrorMessage("INGESTION_ERROR: " + ex.getMessage());
            rawEventRepository.save(rawEvent);
            return rawEvent.getId();
        }
    }

    public Map<String, Object> getIngestStatus(UUID rawEventId) {
        RawEventEntity raw = rawEventRepository.findById(rawEventId)
                .orElseThrow(() -> new IllegalArgumentException("RawEvent not found for ID: " + rawEventId));

        List<ExtractionJobEntity> jobs = extractionJobRepository.findByRawEventId(rawEventId);

        long totalJobs = jobs.size();
        long pending = 0;
        long retrying = 0;
        long success = 0;
        long failed = 0;

        for (ExtractionJobEntity job : jobs) {
            switch (job.getStatus()) {
                case PENDING -> pending++;
                case RETRYING -> retrying++;
                case DONE -> success++;
                case FAILED -> failed++;
            }
        }

        Map<String, Object> progress = new LinkedHashMap<>();
        progress.put("rawEventId", rawEventId.toString());
        progress.put("originalFileName", raw.getSourceFileName());
        progress.put("department", raw.getDepartment());
        progress.put("status", raw.getIngestionStatus().name());
        progress.put("errorMessage", raw.getErrorMessage());
        progress.put("totalJobs", totalJobs);
        progress.put("pendingJobs", pending);
        progress.put("retryingJobs", retrying);
        progress.put("successJobs", success);
        progress.put("failedJobs", failed);

        double pct = totalJobs == 0 ? 0.0 : ((double) (success + failed) / totalJobs) * 100;
        progress.put("progressPercent", Math.round(pct * 100.0) / 100.0);

        return progress;
    }

    public record EventMeta(String name, LocalDate date) {
    }

    protected EventMeta parseEventMetaFromFileName(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return new EventMeta("Unnamed Event", LocalDate.now());
        }

        // Strip file extension
        String nameWithoutExt = fileName;
        int dotIdx = fileName.lastIndexOf('.');
        if (dotIdx > 0) {
            nameWithoutExt = fileName.substring(0, dotIdx);
        }

        // Scan for YYYY-MM-DD or DD-MM-YYYY format dates in the text
        Pattern pattern = Pattern.compile("(\\d{4})[-_](\\d{2})[-_](\\d{2})|(\\d{2})[-_](\\d{2})[-_](\\d{4})");
        Matcher matcher = pattern.matcher(nameWithoutExt);

        if (matcher.find()) {
            String cleanName = nameWithoutExt.replace(matcher.group(0), "").replaceAll("[-_]+", " ").trim();
            if (cleanName.isEmpty()) {
                cleanName = "Event " + matcher.group(0);
            }

            try {
                if (matcher.group(1) != null) {
                    // YYYY-MM-DD
                    int year = Integer.parseInt(matcher.group(1));
                    int month = Integer.parseInt(matcher.group(2));
                    int day = Integer.parseInt(matcher.group(3));
                    return new EventMeta(cleanName, LocalDate.of(year, month, day));
                } else {
                    // DD-MM-YYYY
                    int day = Integer.parseInt(matcher.group(4));
                    int month = Integer.parseInt(matcher.group(5));
                    int year = Integer.parseInt(matcher.group(6));
                    return new EventMeta(cleanName, LocalDate.of(year, month, day));
                }
            } catch (Exception e) {
                log.warn("Failed parser date from filename '{}', falling back to current date", matcher.group(0), e);
            }
        }

        // Fallback
        String cleanName = nameWithoutExt.replaceAll("[-_]+", " ").trim();
        return new EventMeta(cleanName, LocalDate.now());
    }

    public List<RawEventEntity> getRecentUploads() {
        return rawEventRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }
}
