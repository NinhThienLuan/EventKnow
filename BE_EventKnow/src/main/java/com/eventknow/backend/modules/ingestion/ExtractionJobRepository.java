package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExtractionJobRepository extends JpaRepository<ExtractionJobEntity, UUID> {
    List<ExtractionJobEntity> findTop10ByStatusInOrderByCreatedAtAsc(
            List<ExtractionJobEntity.ExtractionStatus> statuses);

    List<ExtractionJobEntity> findByRawEventId(UUID rawEventId);
}
