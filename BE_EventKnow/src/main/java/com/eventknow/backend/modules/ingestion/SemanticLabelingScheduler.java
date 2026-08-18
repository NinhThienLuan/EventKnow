package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class SemanticLabelingScheduler {

    private final AttendeeProfileRepository attendeeProfileRepository;
    private final GeminiExtractionClient geminiExtractionClient;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

    @Scheduled(fixedDelay = 4000)
    public void labelPendingAttendees() {
        try {
            log.debug("Polling for unlabeled attendee profiles...");
            List<AttendeeProfileEntity> pending = attendeeProfileRepository.findTop30ByAiLabeledFalseAndIsActiveTrue();
            if (pending.isEmpty()) {
                return;
            }

            log.info("Found {} unlabeled attendee profiles. Initiating async AI semantic labeling...", pending.size());

            // Map entities to Gemini labeling input items
            List<GeminiExtractionClient.LabelingInputItem> items = new ArrayList<>();
            for (int i = 0; i < pending.size(); i++) {
                AttendeeProfileEntity profile = pending.get(i);
                items.add(new GeminiExtractionClient.LabelingInputItem(
                        i,
                        profile.getFullName(),
                        profile.getOrganizationTextRaw(),
                        profile.getPosition(),
                        profile.getAcademicTitleRaw(),
                        profile.getAcademicTitleNormalized(),
                        profile.getResearchFieldsRaw()));
            }

            // Call Gemini API (wrapped with resilience retry library inside the client)
            GeminiExtractionClient.GeminiLabelingResponse response = geminiExtractionClient.labelBatch(
                    items,
                    "async-batch-enrichment",
                    "attendees",
                    1,
                    pending.size());

            if (response == null || response.labeledRows() == null) {
                log.warn("Gemini semantic labeling returned empty response.");
                return;
            }

            // Parse response and update database entities under a transaction
            new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                    .executeWithoutResult(status -> {
                        updateAttendeeProfiles(pending, response.labeledRows());
                    });

        } catch (Throwable t) {
            log.error("Error occurred during background semantic labeling scheduler execution: {}", t.getMessage(), t);
            // Gracefully catch all errors so caller scheduler thread doesn't terminate
        }
    }

    private void updateAttendeeProfiles(
            List<AttendeeProfileEntity> pending,
            List<GeminiExtractionClient.LabeledRowResult> labeledRows) {

        Map<Integer, GeminiExtractionClient.LabeledRowResult> resultMapping = new HashMap<>();
        for (GeminiExtractionClient.LabeledRowResult row : labeledRows) {
            resultMapping.put(row.rowNumber(), row);
        }

        for (int i = 0; i < pending.size(); i++) {
            AttendeeProfileEntity profile = pending.get(i);
            GeminiExtractionClient.LabeledRowResult result = resultMapping.get(i);

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
                if (result.researchDomains() != null) {
                    profile.setResearchDomains(result.researchDomains());
                } else {
                    profile.setResearchDomains(Collections.emptyList());
                }

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
}
