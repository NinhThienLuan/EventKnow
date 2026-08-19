package com.eventknow.backend.modules.ingestion.repository;

import com.eventknow.backend.model.entity.Audit.DepartmentFolderMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DepartmentFolderMappingRepository extends JpaRepository<DepartmentFolderMappingEntity, UUID> {
    Optional<DepartmentFolderMappingEntity> findByGoogleDriveFolderIdAndIsActiveTrue(String googleDriveFolderId);
}
