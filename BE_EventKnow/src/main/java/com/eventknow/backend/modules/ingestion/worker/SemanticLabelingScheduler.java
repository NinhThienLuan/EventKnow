package com.eventknow.backend.modules.ingestion.worker;

import com.eventknow.backend.modules.ingestion.repository.ExtractionJobRepository;
import com.eventknow.backend.modules.ingestion.normalizer.DomainSanitizer;
import com.eventknow.backend.modules.ingestion.repository.RawEventRepository;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import com.eventknow.backend.integration.llm.LlmProviderClient;
import com.eventknow.backend.integration.llm.AttendeeExtractionInputDto;
import com.eventknow.backend.integration.llm.EnrichedTaxonomyDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class SemanticLabelingScheduler {

    private final AttendeeProfileRepository attendeeProfileRepository;
    private final EventAttendanceRepository eventAttendanceRepository;
    private final ExtractionJobRepository extractionJobRepository;
    private final RawEventRepository rawEventRepository;
    private final LlmProviderClient llmProviderClient;
    private final DomainSanitizer domainSanitizer;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Scheduled(fixedDelay = 4000)
    public void labelPendingAttendees() {
        ExtractionJobEntity activeJob = null;
        try {
            log.debug("Polling for extraction jobs in PROCESSING or timed-out RETRYING status...");
            LocalDateTime threshold = LocalDateTime.now().minusSeconds(30); // 30-sec backoff delay
            List<ExtractionJobEntity> activeJobs = extractionJobRepository.findJobsForAiEnrichment(
                    threshold, PageRequest.of(0, 10));

            if (activeJobs.isEmpty()) {
                return;
            }

            activeJob = activeJobs.get(0);
            final ExtractionJobEntity job = activeJob;

            log.info("Processing job ID: {} (rows {} to {}) for AI enrichment.", job.getId(), job.getRowStart(),
                    job.getRowEnd());

            // Get pending attendee profiles associated with this job's range ordered by
            // sheet row number
            List<EventAttendanceEntity> attendances = eventAttendanceRepository.findPendingAttendancesForJob(
                    job.getRawEvent().getId(), job.getRowStart(), job.getRowEnd());

            if (attendances.isEmpty()) {
                log.info("No unlabeled attendees found for job ID: {}. Mark job as DONE.", job.getId());
                job.setStatus(ExtractionJobEntity.ExtractionStatus.DONE);
                job.setCompletedAt(LocalDateTime.now());
                job.setLastError(null);
                extractionJobRepository.save(job);
                checkAndUpdateParentStatus(job.getRawEvent());
                return;
            }

            // Extract unique profiles preserving order of appearance (row number)
            List<AttendeeProfileEntity> pending = new ArrayList<>();
            Set<UUID> seenIds = new HashSet<>();
            for (EventAttendanceEntity ea : attendances) {
                AttendeeProfileEntity profile = ea.getAttendeeProfile();
                if (profile != null && seenIds.add(profile.getId())) {
                    pending.add(profile);
                }
            }

            log.info("Found {} pending attendee profiles to label for job ID: {}", pending.size(), job.getId());

            // Map entities to labeling input items
            List<AttendeeExtractionInputDto> items = new ArrayList<>();
            for (int i = 0; i < pending.size(); i++) {
                AttendeeProfileEntity profile = pending.get(i);
                items.add(new AttendeeExtractionInputDto(
                        i,
                        profile.getFullName(),
                        profile.getOrganizationTextRaw(),
                        profile.getPosition(),
                        profile.getAcademicTitleRaw(),
                        profile.getAcademicTitleNormalized(),
                        profile.getResearchFieldsRaw()));
            }

            // Call LLM Provider
            List<EnrichedTaxonomyDto> response = llmProviderClient.extractTaxonomy(items);

            if (response == null) {
                throw new RuntimeException("Semantic labeling returned null response.");
            }

            // Update database entities under a transaction
            new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                    .executeWithoutResult(status -> {
                        updateAttendeeProfiles(pending, response);
                    });

            // Re-check pending attendees for the current job range post-enrichment
            List<AttendeeProfileEntity> postCheckPending = attendeeProfileRepository.findPendingForJob(
                    job.getRawEvent().getId(), job.getRowStart(), job.getRowEnd());

            if (postCheckPending.isEmpty()) {
                log.info("All attendees enriched for job ID: {}. Transitioning job status to DONE.", job.getId());
                job.setStatus(ExtractionJobEntity.ExtractionStatus.DONE);
                job.setCompletedAt(LocalDateTime.now());
                job.setLastError(null);
                extractionJobRepository.save(job);
                checkAndUpdateParentStatus(job.getRawEvent());
            } else {
                log.info("Some attendees remain pending for job ID: {}. Job stays in PROCESSING.", job.getId());
                job.setLastError(null);
                extractionJobRepository.save(job);
            }

        } catch (Throwable t) {
            log.error("Error occurred during background semantic labeling execution: {}", t.getMessage());
            if (activeJob != null) {
                try {
                    int newRetry = activeJob.getRetryCount() + 1;
                    activeJob.setRetryCount(newRetry);
                    activeJob.setLastRetriedAt(LocalDateTime.now());
                    activeJob.setLastError(t.getMessage());

                    if (newRetry >= 5) {
                        log.error("Job ID {} reached maximum retry attempts. Transitioning to FAILED.",
                                activeJob.getId());
                        activeJob.setStatus(ExtractionJobEntity.ExtractionStatus.FAILED);
                    } else {
                        log.info("Job ID {} failed, scheduled for RETRYING in 30 seconds (attempt: {}).",
                                activeJob.getId(), newRetry);
                        activeJob.setStatus(ExtractionJobEntity.ExtractionStatus.RETRYING);
                    }
                    extractionJobRepository.save(activeJob);
                    checkAndUpdateParentStatus(activeJob.getRawEvent());
                } catch (Throwable innerEx) {
                    log.error("Failed to update retry status for job ID {}: {}", activeJob.getId(),
                            innerEx.getMessage());
                }
            }
        }
    }

    private void updateAttendeeProfiles(
            List<AttendeeProfileEntity> pending,
            List<EnrichedTaxonomyDto> labeledRows) {

        Map<Integer, EnrichedTaxonomyDto> resultMapping = new HashMap<>();
        for (EnrichedTaxonomyDto row : labeledRows) {
            resultMapping.put(row.rowNumber(), row);
        }

        for (int i = 0; i < pending.size(); i++) {
            AttendeeProfileEntity profile = pending.get(i);
            EnrichedTaxonomyDto result = resultMapping.get(i);

            if (result != null) {
                // Update role
                if (result.attendeeRole() != null) {
                    try {
                        profile.setAttendeeRole(AttendeeProfileEntity.AttendeeRole.valueOf(
                                result.attendeeRole().toUpperCase().trim()));
                    } catch (IllegalArgumentException e) {
                        log.warn("Unknown attendee role: '{}' for attendee: '{}', fallback to GUEST",
                                result.attendeeRole(), profile.getFullName());
                        profile.setAttendeeRole(AttendeeProfileEntity.AttendeeRole.GUEST);
                    }
                }

                // Update research domains
                profile.setResearchDomains(domainSanitizer.sanitize(result.researchDomains()));

                // Update expertise tags
                if (result.expertiseTags() != null) {
                    profile.setExpertiseTags(result.expertiseTags());
                } else {
                    profile.setExpertiseTags(Collections.emptyList());
                }
            } else {
                // Graceful fallback if a row was missing from Gemini response
                profile.setAttendeeRole(AttendeeProfileEntity.AttendeeRole.GUEST);
                profile.setResearchDomains(List.of("KHAC"));
                profile.setExpertiseTags(Collections.emptyList());
            }

            profile.setAiLabeled(true);
            attendeeProfileRepository.save(profile);
            log.info("Successfully updated attendee profile '{}' with AI semantic tags.", profile.getFullName());
        }
    }

    private void checkAndUpdateParentStatus(RawEventEntity rawEvent) {
        UUID rawEventId = rawEvent.getId();
        List<ExtractionJobEntity> siblings = extractionJobRepository.findByRawEventId(rawEventId);

        boolean allDone = true;
        boolean hasFailed = false;
        List<String> failedRanges = new ArrayList<>();

        for (ExtractionJobEntity s : siblings) {
            ExtractionJobEntity.ExtractionStatus status = s.getStatus();
            if (status == ExtractionJobEntity.ExtractionStatus.PENDING ||
                    status == ExtractionJobEntity.ExtractionStatus.RETRYING ||
                    status == ExtractionJobEntity.ExtractionStatus.PROCESSING) {
                allDone = false;
                break;
            }
            if (status == ExtractionJobEntity.ExtractionStatus.FAILED) {
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
            log.info("Transitioned parent rawEvent ID {} status to {} via Scheduler.", rawEventId,
                    reloaded.getIngestionStatus());
        } else {
            RawEventEntity reloaded = rawEventRepository.findById(rawEventId).orElse(rawEvent);
            if (reloaded.getIngestionStatus() != RawEventEntity.IngestionStatus.PROCESSING) {
                reloaded.setIngestionStatus(RawEventEntity.IngestionStatus.PROCESSING);
                rawEventRepository.save(reloaded);
            }
        }
    }
}