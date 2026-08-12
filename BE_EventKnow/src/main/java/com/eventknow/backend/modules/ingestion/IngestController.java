package com.eventknow.backend.modules.ingestion;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ingest")
@PreAuthorize("hasRole('ADMIN')")
public class IngestController {

    private final IngestService ingestService;

    @Autowired
    public IngestController(IngestService ingestService) {
        this.ingestService = ingestService;
    }

    @PostMapping("/file")
    public ResponseEntity<Map<String, Object>> ingestFile(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "googleDriveFileId", required = false) String googleDriveFileId,
            @RequestParam(value = "parentFolderId", required = false) String parentFolderId,
            @RequestParam(value = "manualDepartment", required = false) String manualDepartment,
            @RequestParam(value = "manualEventName", required = false) String manualEventName,
            @RequestParam(value = "manualEventDate", required = false) String manualEventDate) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = auth != null ? auth.getName() : "system@eventknow.com";

        try {
            byte[] fileBytes = null;
            String originalFileName = null;

            if (file != null && !file.isEmpty()) {
                fileBytes = file.getBytes();
                originalFileName = file.getOriginalFilename();
            } else if (googleDriveFileId != null && !googleDriveFileId.isEmpty()) {
                originalFileName = "drive_file_" + googleDriveFileId + ".xlsx";
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Either direct file upload or googleDriveFileId is required"));
            }

            LocalDate eventDate = null;
            if (manualEventDate != null && !manualEventDate.trim().isEmpty()) {
                eventDate = LocalDate.parse(manualEventDate.trim());
            }

            UUID rawEventId = ingestService.initiateIngestion(
                    fileBytes,
                    originalFileName,
                    parentFolderId,
                    manualDepartment,
                    manualEventName,
                    eventDate,
                    currentEmail,
                    googleDriveFileId);

            Map<String, Object> response = new HashMap<>();
            response.put("rawEventId", rawEventId.toString());
            response.put("status", "PROCESSING");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to initiate ingestion: " + e.getMessage()));
        }
    }

    @GetMapping("/status/{rawEventId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable("rawEventId") UUID rawEventId) {
        try {
            Map<String, Object> progress = ingestService.getIngestStatus(rawEventId);
            return ResponseEntity.ok(progress);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
