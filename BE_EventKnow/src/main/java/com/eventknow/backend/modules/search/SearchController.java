package com.eventknow.backend.modules.search;

import com.eventknow.backend.modules.search.dto.SearchAttendeeDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/attendees")
    public ResponseEntity<Page<SearchAttendeeDto>> searchAttendees(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) List<String> researchDomains,
            @RequestParam(required = false) List<String> expertiseTags,
            @RequestParam(required = false) String academicTitle,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String department,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {

        String viewerEmail = auth.getName();
        boolean isAdmin = hasAdminRole(auth);

        // Normalize ALL or empty parameter filters nicely
        String normalDept = (department == null || department.trim().isEmpty() || "ALL".equalsIgnoreCase(department))
                ? null
                : department.trim();
        String normalTitle = (academicTitle == null || academicTitle.trim().isEmpty()
                || "ALL".equalsIgnoreCase(academicTitle))
                        ? null
                        : academicTitle.trim();
        String normalRole = (role == null || role.trim().isEmpty() || "ALL".equalsIgnoreCase(role))
                ? null
                : role.trim().toUpperCase();

        Page<SearchAttendeeDto> result = searchService.searchAttendees(
                query,
                startDate,
                endDate,
                researchDomains,
                expertiseTags,
                normalTitle,
                normalRole,
                normalDept,
                page,
                size,
                viewerEmail,
                isAdmin);

        return ResponseEntity.ok(result);
    }

    private boolean hasAdminRole(Authentication auth) {
        if (auth == null)
            return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
