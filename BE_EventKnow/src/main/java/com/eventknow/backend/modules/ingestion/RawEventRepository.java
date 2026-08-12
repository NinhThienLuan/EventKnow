package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Core.RawEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RawEventRepository extends JpaRepository<RawEventEntity, UUID> {
    Optional<RawEventEntity> findByGoogleDriveFileId(String googleDriveFileId);
}
