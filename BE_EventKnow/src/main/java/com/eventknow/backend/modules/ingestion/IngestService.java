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

        // 2. Download and parse workbook first to handle multi-sheet partition
        byte[] activeBytes = fileBytes;
        List<ExcelParsingService.SheetData> sheets = null;
        try {
            if ((activeBytes == null || activeBytes.length == 0) && googleDriveFileId != null
                    && !googleDriveFileId.isEmpty()) {
                activeBytes = driveFileContentService.downloadFileContent(googleDriveFileId, ownerEmail);
            }
            if (activeBytes == null || activeBytes.length == 0) {
                throw new IllegalArgumentException("No file content received for ingestion");
            }
            sheets = excelParsingService.parseWorkbook(activeBytes);
            if (sheets == null || sheets.isEmpty()) {
                throw new IllegalArgumentException("No sheets found in Excel file");
            }
        } catch (DriveConnectionExpiredException driveEx) {
            log.error("Google Drive connection credentials expired: {}", driveEx.getMessage());
            RawEventEntity rawEvent = RawEventEntity.builder()
                    .googleDriveFileId(googleDriveFileId)
                    .sourceFileName(originalFileName)
                    .driveOwnerEmail(ownerEmail)
                    .department(department)
                    .eventName(manualEventName != null && !manualEventName.trim().isEmpty() ? manualEventName
                            : originalFileName)
                    .eventDate(manualEventDate != null ? manualEventDate : LocalDate.now())
                    .sourceType(RawEventEntity.SourceType.EXCEL)
                    .ingestionStatus(RawEventEntity.IngestionStatus.FAILED)
                    .errorMessage("DRIVE_CONNECTION_EXPIRED: " + driveEx.getMessage())
                    .build();
            rawEvent = rawEventRepository.save(rawEvent);
            return rawEvent.getId();
        } catch (Exception ex) {
            log.error("Failed to download or parse Excel file: ", ex);
            RawEventEntity rawEvent = RawEventEntity.builder()
                    .googleDriveFileId(googleDriveFileId)
                    .sourceFileName(originalFileName)
                    .driveOwnerEmail(ownerEmail)
                    .department(department)
                    .eventName(manualEventName != null && !manualEventName.trim().isEmpty() ? manualEventName
                            : originalFileName)
                    .eventDate(manualEventDate != null ? manualEventDate : LocalDate.now())
                    .sourceType(RawEventEntity.SourceType.EXCEL)
                    .ingestionStatus(RawEventEntity.IngestionStatus.FAILED)
                    .errorMessage("INGESTION_ERROR: " + ex.getMessage())
                    .build();
            rawEvent = rawEventRepository.save(rawEvent);
            return rawEvent.getId();
        }

        // 3. Process each sheet as a separate RawEventEntity and resolve its canonical
        // EventEntity
        UUID returnedRawEventId = null;
        int totalJobsCreated = 0;

        for (ExcelParsingService.SheetData sheet : sheets) {
            List<ExcelParsingService.RowData> rows = sheet.rows();
            if (rows.isEmpty()) {
                continue;
            }

            // Resolve sheet event meta
            String sheetEventName = manualEventName;
            LocalDate sheetEventDate = manualEventDate;
            if (sheetEventName == null || sheetEventName.trim().isEmpty()) {
                EventMeta meta = parseEventMeta(originalFileName, sheet.sheetName());
                sheetEventName = meta.name();
                if (sheetEventDate == null) {
                    sheetEventDate = meta.date();
                }
            }

            UUID eventId = eventResolutionService.resolveCanonicalEvent(sheetEventName, sheetEventDate, department);
            com.eventknow.backend.model.entity.Core.EventEntity eventEntity = eventRepository.findById(eventId)
                    .orElse(null);

            // Create individual RawEventEntity for this sheet
            RawEventEntity rawEvent = RawEventEntity.builder()
                    .googleDriveFileId(googleDriveFileId)
                    .sourceFileName(originalFileName)
                    .driveOwnerEmail(ownerEmail)
                    .department(department)
                    .event(eventEntity)
                    .eventName(sheetEventName)
                    .eventDate(sheetEventDate)
                    .sheetName(sheet.sheetName())
                    .sourceType(RawEventEntity.SourceType.EXCEL)
                    .ingestionStatus(RawEventEntity.IngestionStatus.PROCESSING)
                    .build();

            rawEvent = rawEventRepository.save(rawEvent);

            if (returnedRawEventId == null) {
                returnedRawEventId = rawEvent.getId();
            }

            try {
                // Save rawHeaderMap for this sheet
                Map<String, Object> headerMapOuter = new LinkedHashMap<>();
                if (sheet.headerMapping() != null) {
                    Map<String, Object> sheetMap = new LinkedHashMap<>();
                    sheetMap.put("headerRowIndex", sheet.headerMapping().headerRowIndex());
                    sheetMap.put("standardMapping", sheet.headerMapping().standardMapping());

                    Map<String, String> unmappedStr = new LinkedHashMap<>();
                    if (sheet.headerMapping().unmappedHeaders() != null) {
                        for (Map.Entry<Integer, String> entry : sheet.headerMapping().unmappedHeaders().entrySet()) {
                            unmappedStr.put(String.valueOf(entry.getKey()), entry.getValue());
                        }
                    }
                    sheetMap.put("unmappedHeaders", unmappedStr);
                    headerMapOuter.put(sheet.sheetName(), sheetMap);
                }
                rawEvent.setRawHeaderMap(headerMapOuter);
                rawEvent = rawEventRepository.save(rawEvent);

                // Split sheet rows into batch jobs
                String[] headers = sheet.headers().toArray(new String[0]);
                int rowCount = rows.size();
                int sheetJobsCreated = 0;
                for (int startIdx = 0; startIdx < rowCount; startIdx += defaultBatchSize) {
                    int endIdx = Math.min(startIdx + defaultBatchSize, rowCount);
                    List<ExcelParsingService.RowData> subList = rows.subList(startIdx, endIdx);

                    int rowStart = subList.get(0).rowNumber();
                    int rowEnd = subList.get(subList.size() - 1).rowNumber();

                    String rawRowsStr = objectMapper.writeValueAsString(subList);
                    String headersStr = objectMapper.writeValueAsString(headers);

                    ExtractionJobEntity job = ExtractionJobEntity.builder()
                            .rawEvent(rawEvent)
                            .status(ExtractionJobEntity.ExtractionStatus.PENDING)
                            .retryCount(0)
                            .batchIndex(sheetJobsCreated)
                            .rowStart(rowStart)
                            .rowEnd(rowEnd)
                            .rawHeaderCols(headersStr)
                            .rawRowsContent(rawRowsStr)
                            .sourceSheetName(sheet.sheetName())
                            .build();

                    extractionJobRepository.save(job);
                    sheetJobsCreated++;
                    totalJobsCreated++;
                }

                if (sheetJobsCreated == 0) {
                    rawEvent.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
                    rawEvent.setErrorMessage("The sheet contained no valid rows data to process.");
                    rawEventRepository.save(rawEvent);
                }

            } catch (Exception ex) {
                log.error("Fatal error creating batch jobs for sheet " + sheet.sheetName(), ex);
                rawEvent.setIngestionStatus(RawEventEntity.IngestionStatus.FAILED);
                rawEvent.setErrorMessage("INGESTION_ERROR: " + ex.getMessage());
                rawEventRepository.save(rawEvent);
            }
        }

        if (totalJobsCreated == 0) {
            RawEventEntity rawEvent = RawEventEntity.builder()
                    .googleDriveFileId(googleDriveFileId)
                    .sourceFileName(originalFileName)
                    .driveOwnerEmail(ownerEmail)
                    .department(department)
                    .eventName(manualEventName != null && !manualEventName.trim().isEmpty() ? manualEventName
                            : originalFileName)
                    .eventDate(manualEventDate != null ? manualEventDate : LocalDate.now())
                    .sourceType(RawEventEntity.SourceType.EXCEL)
                    .ingestionStatus(RawEventEntity.IngestionStatus.FAILED)
                    .errorMessage("The uploaded/downloaded file contained no valid rows data to process in any sheet.")
                    .build();
            rawEvent = rawEventRepository.save(rawEvent);
            return rawEvent.getId();
        }

        log.info("Sheet-partitioned ingestion initiated successfully: created {} batch jobs total.", totalJobsCreated);
        return returnedRawEventId;
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

    private boolean isGenericSheetName(String sheetName) {
        if (sheetName == null) {
            return true;
        }
        String low = sheetName.trim().toLowerCase();
        return low.isEmpty() || low.startsWith("sheet") || low.startsWith("trang") || low.equals("raw")
                || low.startsWith("table");
    }

    protected EventMeta parseEventMeta(String fileName, String sheetName) {
        // 1. Try to parse from sheetName first if it's non-generic
        if (sheetName != null && !isGenericSheetName(sheetName)) {
            EventMeta meta = parseEventMetaFromText(sheetName);
            if (meta != null) {
                return meta;
            }
        }
        // 2. Try to parse from fileName
        if (fileName != null) {
            EventMeta meta = parseEventMetaFromText(fileName);
            if (meta != null) {
                return meta;
            }
        }
        // Fallback
        String cleanName = (sheetName != null && !isGenericSheetName(sheetName)) ? sheetName : fileName;
        if (cleanName == null) {
            cleanName = "Unnamed Event";
        }
        int dotIdx = cleanName.lastIndexOf('.');
        if (dotIdx > 0) {
            cleanName = cleanName.substring(0, dotIdx);
        }
        cleanName = cleanName.replaceAll("[-_]+", " ").trim();
        return new EventMeta(cleanName, LocalDate.now());
    }

    private EventMeta parseEventMetaFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        String nameWithoutExt = text;
        int dotIdx = text.lastIndexOf('.');
        if (dotIdx > 0) {
            nameWithoutExt = text.substring(0, dotIdx);
        }
        Pattern pattern = Pattern.compile("(\\d{4})[-_](\\d{2})[-_](\\d{2})|(\\d{2})[-_](\\d{2})[-_](\\d{4})");
        Matcher matcher = pattern.matcher(nameWithoutExt);

        if (matcher.find()) {
            String cleanName = nameWithoutExt.replace(matcher.group(0), "").replaceAll("[-_]+", " ").trim();
            if (cleanName.isEmpty()) {
                cleanName = "Event " + matcher.group(0);
            }
            try {
                if (matcher.group(1) != null) {
                    int year = Integer.parseInt(matcher.group(1));
                    int month = Integer.parseInt(matcher.group(2));
                    int day = Integer.parseInt(matcher.group(3));
                    return new EventMeta(cleanName, LocalDate.of(year, month, day));
                } else {
                    int day = Integer.parseInt(matcher.group(4));
                    int month = Integer.parseInt(matcher.group(5));
                    int year = Integer.parseInt(matcher.group(6));
                    return new EventMeta(cleanName, LocalDate.of(year, month, day));
                }
            } catch (Exception e) {
                log.warn("Failed parser date from text '{}'", matcher.group(0), e);
            }
        }
        return null;
    }

    protected EventMeta parseEventMetaFromFileName(String fileName) {
        return parseEventMeta(fileName, null);
    }

    public List<RawEventEntity> getRecentUploads() {
        return rawEventRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }
}
