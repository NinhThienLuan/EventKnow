package com.eventknow.backend.modules.recommendation;

import com.eventknow.backend.modules.recommendation.dto.RecommendGuestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class RecommendationController {

        private final RecommendationService recommendationService;

        @GetMapping("/events/{eventId}/recommend-guests")
        public ResponseEntity<Page<RecommendGuestDto>> recommendGuests(
                        @PathVariable("eventId") UUID eventId,
                        @RequestParam(value = "minOverlapCount", defaultValue = "1") int minOverlapCount,
                        @RequestParam(value = "page", defaultValue = "0") int page,
                        @RequestParam(value = "size", defaultValue = "20") int size,
                        Authentication auth) {

                log.info("recommendGuests REST endpoint called: eventId={}, minOverlapCount={}, page={}, size={}",
                                eventId, minOverlapCount, page, size);

                // Validate minOverlapCount value to satisfy NFR-6 (must be >= 1 overlay tags)
                if (minOverlapCount < 1) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "minOverlapCount must be at least 1");
                }

                String viewerEmail = auth.getName();
                boolean isAdmin = auth.getAuthorities().stream()
                                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

                Page<RecommendGuestDto> result = recommendationService.getRecommendedGuests(
                                eventId, minOverlapCount, page, size, viewerEmail, isAdmin);

                return ResponseEntity.ok(result);
        }

        @GetMapping("/recommendations/preview")
        public ResponseEntity<Page<RecommendGuestDto>> recommendPreview(
                        @RequestParam(value = "tags") List<String> tags,
                        @RequestParam(value = "minOverlapCount", defaultValue = "1") int minOverlapCount,
                        @RequestParam(value = "page", defaultValue = "0") int page,
                        @RequestParam(value = "size", defaultValue = "20") int size,
                        Authentication auth) {

                log.info("recommendPreview REST endpoint called: tags={}, minOverlapCount={}, page={}, size={}",
                                tags, minOverlapCount, page, size);

                if (tags == null || tags.isEmpty() || (tags.size() == 1 && tags.get(0).trim().isEmpty())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tags parameter cannot be empty");
                }

                if (minOverlapCount < 1) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "minOverlapCount must be at least 1");
                }

                String viewerEmail = auth.getName();
                boolean isAdmin = auth.getAuthorities().stream()
                                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

                Page<RecommendGuestDto> result = recommendationService.getPreviewRecommendations(
                                tags, minOverlapCount, page, size, viewerEmail, isAdmin);

                return ResponseEntity.ok(result);
        }
}
