package com.eventknow.backend.modules.recommendation;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Slf4j
public class RecommendationController {

    private final EventRepository eventRepository;
    private final AttendeeProfileRepository attendeeProfileRepository;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<?> getEventRecommendations(
            @PathVariable("eventId") UUID eventId,
            @RequestParam(value = "limit", required = false, defaultValue = "10") int limit) {

        log.info("getEventRecommendations called for eventId={} with limit={}", eventId, limit);

        Optional<EventEntity> eventOpt = eventRepository.findByIdAndIsActiveTrue(eventId);
        if (eventOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        EventEntity event = eventOpt.get();
        if (event.getTopicTags() == null || event.getTopicTags().isEmpty()) {
            log.info("Event {} has no topic tags; returning empty recommendations", eventId);
            return ResponseEntity.ok(Map.of("status", "success", "data", Collections.emptyList()));
        }

        List<AttendeeProfileEntity> recommendations = attendeeProfileRepository.findRecommendationsForEvent(eventId,
                limit);

        List<Map<String, Object>> result = recommendations.stream().map(attendee -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", attendee.getId().toString());
            map.put("fullName", attendee.getFullName());
            map.put("position", attendee.getPosition() != null ? attendee.getPosition() : "");
            map.put("organizationName", attendee.getOrganization() != null ? attendee.getOrganization().getOrgName()
                    : (attendee.getOrganizationTextRaw() != null ? attendee.getOrganizationTextRaw() : ""));
            map.put("email", attendee.getEmail() != null ? attendee.getEmail() : "");
            map.put("phone", attendee.getPhone() != null ? attendee.getPhone() : "");
            map.put("researchDomains",
                    attendee.getResearchDomains() != null ? attendee.getResearchDomains() : Collections.emptyList());
            map.put("expertiseTags",
                    attendee.getExpertiseTags() != null ? attendee.getExpertiseTags() : Collections.emptyList());

            // Compute overlap tags in-memory
            List<String> eventTags = event.getTopicTags();
            List<String> attendeeTags = attendee.getExpertiseTags();
            List<String> sharedTags = new ArrayList<>(attendeeTags);
            sharedTags.retainAll(eventTags);

            map.put("sharedTags", sharedTags);
            map.put("overlapCount", sharedTags.size());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("status", "success", "data", result));
    }
}
