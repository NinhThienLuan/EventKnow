package com.eventknow.backend.modules.ingestion.service;

import com.eventknow.backend.modules.ingestion.repository.DepartmentFolderMappingRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DepartmentResolutionService {

    private final DepartmentFolderMappingRepository mappingRepository;

    public String resolveDepartment(String driveFolderId, String manualOverride) {
        if (manualOverride != null && !manualOverride.trim().isEmpty()) {
            return manualOverride.trim();
        }
        if (driveFolderId != null && !driveFolderId.trim().isEmpty()) {
            return mappingRepository.findByGoogleDriveFolderIdAndIsActiveTrue(driveFolderId)
                    .map(mapping -> mapping.getDepartment())
                    .orElse("UNMAPPED");
        }
        return "UNMAPPED";
    }
}