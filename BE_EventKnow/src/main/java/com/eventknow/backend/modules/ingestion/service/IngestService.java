package com.eventknow.backend.modules.ingestion.service;

import com.eventknow.backend.modules.ingestion.repository.ExtractionJobRepository;
import com.eventknow.backend.modules.ingestion.exception.DriveConnectionExpiredException;
import com.eventknow.backend.modules.ingestion.repository.RawEventRepository;

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
import com.eventknow.backend.modules.ingestion.normalizer.ExcelHeaderMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.DataFormatter;
import java.io.ByteArrayInputStream;
import java.time.format.DateTimeFormatter;

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

        List<ExcelParsingService.SheetData> activeSheets = new java.util.ArrayList<>();
        for (ExcelParsingService.SheetData s : sheets) {
            if (s.rows() != null && !s.rows().isEmpty()) {
                activeSheets.add(s);
            }
        }
        int activeCount = activeSheets.size();
        int activeIdx = 0;

        for (ExcelParsingService.SheetData sheet : activeSheets) {
            List<ExcelParsingService.RowData> rows = sheet.rows();

            // Resolve sheet event meta
            String sheetEventName = manualEventName;
            LocalDate sheetEventDate = manualEventDate;
            boolean isDateFallback = (manualEventDate == null);
            if (sheetEventName == null || sheetEventName.trim().isEmpty() || sheetEventDate == null) {
                EventMeta meta = parseEventMetaOptimized(originalFileName, sheet.sheetName(), activeCount, activeIdx);
                if (sheetEventName == null || sheetEventName.trim().isEmpty()) {
                    sheetEventName = meta.name();
                }
                if (sheetEventDate == null) {
                    sheetEventDate = meta.date();
                    isDateFallback = meta.isDateFallback();
                }
            }

            if (isDateFallback) {
                LocalDate minDate = findMinTimestampInSheetBytes(fileBytes, sheet.sheetName(),
                        sheet.headerMapping().headerRowIndex());
                if (minDate != null) {
                    sheetEventDate = minDate;
                    isDateFallback = false;
                }
            }

            UUID eventId = eventResolutionService.resolveCanonicalEvent(sheetEventName, sheetEventDate, isDateFallback,
                    department);
            com.eventknow.backend.model.entity.Core.EventEntity eventEntity = eventRepository.findById(eventId)
                    .orElse(null);

            if (eventEntity != null && !isDateFallback) {
                eventEntity.setEventDate(sheetEventDate);
                eventEntity = eventRepository.save(eventEntity);
            }

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
                    sheetMap.put("compoundMappings", sheet.headerMapping().compoundMappings());

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
            activeIdx++;
        }

        if (totalJobsCreated == 0)

        {
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
                case PROCESSING -> pending++;
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

    public record EventMeta(String name, LocalDate date, boolean isDateFallback) {
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
        cleanName = stripExtension(cleanName);
        cleanName = cleanName.replaceAll("[-_]+", " ").trim();
        return new EventMeta(cleanName, LocalDate.now(), true);
    }

    private EventMeta parseEventMetaFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        String nameWithoutExt = stripExtension(text);
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
                    return new EventMeta(cleanName, LocalDate.of(year, month, day), false);
                } else {
                    int day = Integer.parseInt(matcher.group(4));
                    int month = Integer.parseInt(matcher.group(5));
                    int year = Integer.parseInt(matcher.group(6));
                    return new EventMeta(cleanName, LocalDate.of(year, month, day), false);
                }
            } catch (Exception e) {
                log.warn("Failed parser date from text '{}'", matcher.group(0), e);
            }
        }
        return null;
    }

    private boolean isGenericName(String name) {
        if (name == null) {
            return true;
        }
        String low = name.trim().toLowerCase();
        return low.isEmpty() ||
                low.equals("sheet") || low.startsWith("sheet") ||
                low.equals("trang") || low.startsWith("trang") ||
                low.equals("raw") || low.startsWith("raw") ||
                low.equals("data") || low.startsWith("data") ||
                low.equals("table") || low.startsWith("table") ||
                low.equals("unnamed") || low.startsWith("unnamed");
    }

    private String stripExtension(String text) {
        if (text == null) {
            return null;
        }
        int dotIdx = text.lastIndexOf('.');
        if (dotIdx > 0) {
            String ext = text.substring(dotIdx + 1).toLowerCase();
            if (ext.equals("xlsx") || ext.equals("xls") || ext.equals("csv") || ext.equals("txt")) {
                return text.substring(0, dotIdx);
            }
        }
        return text;
    }

    public String cleanEventTextName(String text) {
        if (text == null) {
            return "";
        }
        String name = stripExtension(text);
        // 1. Strip numeric prefix: e.g. "01.", "1.", "02 -", "03_", "11.1 ", "12_ "
        name = name.replaceFirst("^\\d+(\\.\\d+)?\\s*[\\.\\-_\\s]\\s*", "");

        // 2. Strip common noise prefix: e.g. "raw data - ", "danh sach - ", "raw - "
        name = name.replaceAll("(?i)^(raw data|raw|data|danh sách|danh sach|dskm|ds)[-_\\s]+", "");

        // 3. Strip version/draft suffix: e.g. " v1", "_v2", "-final", " df", " draft",
        // " copy"
        name = name.replaceAll("(?i)[-_\\s]+(v\\d+|final|draft|copy|new|edit|raw|data)\\b", "");

        name = name.replaceAll("[-_]+", " ").replaceAll("\\s+", " ").trim();
        return name;
    }

    public EventMeta parseEventMetaOptimized(String fileName, String sheetName, int activeSheetCount,
            int sheetIndex) {
        // Parse date from either filename or sheetname if we can
        LocalDate resolvedDate = null;
        boolean isDateFallback = true;
        String baseFileName = fileName;
        String baseSheetName = sheetName;

        if (sheetName != null) {
            EventMeta meta = parseEventMetaFromText(sheetName);
            if (meta != null && !meta.isDateFallback()) {
                resolvedDate = meta.date();
                isDateFallback = false;
                baseSheetName = meta.name();
            }
        }
        if (resolvedDate == null && fileName != null) {
            EventMeta meta = parseEventMetaFromText(fileName);
            if (meta != null && !meta.isDateFallback()) {
                resolvedDate = meta.date();
                isDateFallback = false;
                baseFileName = meta.name();
            }
        }
        if (resolvedDate == null) {
            resolvedDate = LocalDate.now();
            isDateFallback = true;
            if (fileName != null) {
                baseFileName = stripExtension(fileName);
            }
            if (sheetName != null) {
                baseSheetName = stripExtension(sheetName);
            }
        }

        // Clean names
        String cleanFile = cleanEventTextName(baseFileName);
        String cleanSheet = cleanEventTextName(baseSheetName);

        boolean fileIsGeneric = isGenericName(cleanFile);
        boolean sheetIsGeneric = isGenericName(cleanSheet);

        String finalName;

        if (activeSheetCount <= 1) {
            if (fileIsGeneric) {
                String timestamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                        .format(java.time.LocalDateTime.now());
                finalName = "Event_" + timestamp;
            } else {
                finalName = cleanFile;
            }
        } else {
            // Count >= 2
            if (fileIsGeneric && sheetIsGeneric) {
                String timestamp = java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")
                        .format(java.time.LocalDateTime.now());
                finalName = "Event_" + timestamp + " - Phần " + (sheetIndex + 1);
            } else if (fileIsGeneric) {
                // file generic, sheet không generic -> dùng sheet
                finalName = cleanSheet;
            } else if (sheetIsGeneric) {
                // sheet generic, file không -> dùng file + index
                finalName = cleanFile + " - Phần " + (sheetIndex + 1);
            } else {
                // cả 2 không generic -> ghép
                finalName = cleanFile + " - " + cleanSheet;
            }
        }

        // Ensure finalName is not blank
        if (finalName == null || finalName.trim().isEmpty()) {
            finalName = "Event " + java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd").format(LocalDate.now());
        }

        return new EventMeta(finalName.trim(), resolvedDate, isDateFallback);
    }

    protected EventMeta parseEventMetaFromFileName(String fileName) {
        return parseEventMeta(fileName, null);
    }

    public List<RawEventEntity> getRecentUploads() {
        return rawEventRepository.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ISO_LOCAL_DATE,
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("d/M/yyyy HH:mm"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"));

    private LocalDate tryParseDate(Cell cell) {
        if (cell == null) {
            return null;
        }
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return cell.getLocalDateTimeCellValue().toLocalDate();
            }
            if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim();
                if (val.isEmpty()) {
                    return null;
                }
                try {
                    return DateTimeFormatter.ISO_DATE_TIME.parse(val, LocalDate::from);
                } catch (Exception e1) {
                    // Fall through to other formatters
                }

                for (DateTimeFormatter formatter : DATE_FORMATTERS) {
                    try {
                        return LocalDate.parse(val, formatter);
                    } catch (Exception ignored1) {
                        try {
                            return formatter.parse(val, LocalDate::from);
                        } catch (Exception ignored2) {
                            // Try another
                        }
                    }
                }

                Pattern pattern = Pattern
                        .compile("(\\d{4})[-_/](\\d{2})[-_/](\\d{2})|(\\d{2})[-_/](\\d{2})[-_/](\\d{4})");
                Matcher matcher = pattern.matcher(val);
                if (matcher.find()) {
                    try {
                        if (matcher.group(1) != null) {
                            int year = Integer.parseInt(matcher.group(1));
                            int month = Integer.parseInt(matcher.group(2));
                            int day = Integer.parseInt(matcher.group(3));
                            return LocalDate.of(year, month, day);
                        } else {
                            int day = Integer.parseInt(matcher.group(4));
                            int month = Integer.parseInt(matcher.group(5));
                            int year = Integer.parseInt(matcher.group(6));
                            return LocalDate.of(year, month, day);
                        }
                    } catch (Exception ignored) {
                        // ignore
                    }
                }
            }
        } catch (Exception ignored) {
            // master catch
        }
        return null;
    }

    private LocalDate findMinTimestampInSheetBytes(byte[] fileBytes, String sheetName, int headerRowIndex) {
        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fileBytes))) {
            Sheet sheet = workbook.getSheet(sheetName);
            if (sheet == null) {
                return null;
            }
            Row headerRow = sheet.getRow(headerRowIndex);
            if (headerRow == null) {
                return null;
            }

            int targetColIdx = -1;
            int maxCol = headerRow.getLastCellNum();
            Pattern TIMESTAMP_HEADER_PATTERN = Pattern.compile(
                    "(?i)^(dau thoi gian|timestamp|thoi gian|ngay dang ky|thoi gian dang ky|thoi gian gui|submit time)$");

            DataFormatter formatter = new DataFormatter();
            for (int c = 0; c < maxCol; c++) {
                Cell cell = headerRow.getCell(c);
                if (cell != null) {
                    String headerVal = formatter.formatCellValue(cell).trim();
                    if (!headerVal.isEmpty()) {
                        String norm = ExcelHeaderMapper.normalizeHeader(headerVal);
                        if (TIMESTAMP_HEADER_PATTERN.matcher(norm).matches()) {
                            targetColIdx = c;
                            break;
                        }
                    }
                }
            }

            if (targetColIdx == -1) {
                return null;
            }

            LocalDate minDate = null;
            int lastRowNum = sheet.getLastRowNum();
            for (int r = headerRowIndex + 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                Cell cell = row.getCell(targetColIdx);
                if (cell == null || cell.getCellType() == CellType.BLANK) {
                    continue;
                }

                LocalDate date = tryParseDate(cell);
                if (date != null) {
                    if (minDate == null || date.isBefore(minDate)) {
                        minDate = date;
                    }
                }
            }
            return minDate;
        } catch (Exception e) {
            log.warn("Failed to find min timestamp in sheet {}: {}", sheetName, e.getMessage());
        }
        return null;
    }
}