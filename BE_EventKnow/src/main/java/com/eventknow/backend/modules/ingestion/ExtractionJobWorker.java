package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;
import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExtractionJobWorker {

    private final ExtractionJobRepository extractionJobRepository;
    private final RawEventRepository rawEventRepository;
    private final GeminiExtractionClient geminiExtractionClient;
    private final ExtractionResultProcessor resultProcessor;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(fixedDelayString = "${eventknow.worker.polling-delay:5000}")
    @Transactional
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

        try {
            // 1. Deserialize raw rows content & headers array
            List<ExcelParsingService.RowData> rows = objectMapper.readValue(
                    job.getRawRowsContent(),
                    new TypeReference<List<ExcelParsingService.RowData>>() {
                    });

            String[] headers = objectMapper.readValue(job.getRawHeaderCols(), String[].class);

            // 2. Execute Gemini extraction
            GeminiExtractionClient.GeminiExtractionResponse response = geminiExtractionClient.extractBatch(
                    rows,
                    headers,
                    job.getRawEvent().getSourceFileName(),
                    job.getSourceSheetName(),
                    job.getRowStart(),
                    job.getRowEnd());

            if (response == null || response.batchRows() == null) {
                throw new ExtractionSchemaException("Invalid empty batch rows response returned from Gemini API");
            }

            // 3. Process structures (dedupe, save attendees, orgs, attendances)
            resultProcessor.processBatchRows(job.getRawEvent().getId(), response.batchRows());

            // 4. Update status to DONE
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

        // 5. Check parent file status
        checkAndUpdateParentStatus(job.getRawEvent());
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
