package com.eventknow.backend.modules.ingestion.service;

import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.modules.identity.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventResolutionService {

    private final EventRepository eventRepository;

    @Value("${eventknow.event.match-threshold:0.4}")
    private double matchThreshold;

    @Transactional
    public UUID resolveCanonicalEvent(String eventName, LocalDate eventDate, boolean isDateFallback,
            String department) {
        if (eventName == null || eventName.trim().isEmpty()) {
            throw new IllegalArgumentException("Event name cannot be null or empty");
        }

        String cleanName = eventName.trim();

        // 2-Level Threshold: 0.85 for weak/fallback signal, 0.5 for strong signal
        boolean lowReliability = isDateFallback
                || department == null
                || department.trim().isEmpty()
                || department.equalsIgnoreCase("UNMAPPED");

        double threshold = lowReliability ? 0.85 : 0.5;

        log.info("Resolving canonical event for: {}, date: {}, dept: {} (isDateFallback: {}, selected threshold: {})",
                cleanName, eventDate, department, isDateFallback, threshold);

        Optional<EventEntity> similarEventOpt = Optional.empty();
        if (eventDate != null) {
            similarEventOpt = eventRepository.findSimilarEvent(cleanName, eventDate, department, threshold);
        }

        if (similarEventOpt.isPresent()) {
            EventEntity similarEvent = similarEventOpt.get();
            UUID finalId = similarEvent.getMergedInto() != null ? similarEvent.getMergedInto().getId()
                    : similarEvent.getId();
            log.info("Matched existing event: {} (resolved ID: {})", similarEvent.getEventName(), finalId);
            return finalId;
        }

        // Create new Event
        EventEntity newEvent = EventEntity.builder()
                .eventName(cleanName)
                .eventDate(eventDate)
                .department(department)
                .isActive(true)
                .build();

        EventEntity saved = eventRepository.save(newEvent);
        log.info("Created new canonical Event entity: {} with ID: {}", cleanName, saved.getId());
        return saved.getId();
    }
}
