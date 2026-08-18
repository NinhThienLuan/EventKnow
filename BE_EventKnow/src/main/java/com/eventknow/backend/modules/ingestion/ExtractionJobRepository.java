package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.ExtractionJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExtractionJobRepository extends JpaRepository<ExtractionJobEntity, UUID> {
    List<ExtractionJobEntity> findTop10ByStatusInOrderByCreatedAtAsc(
            List<ExtractionJobEntity.ExtractionStatus> statuses);

    List<ExtractionJobEntity> findByRawEventId(UUID rawEventId);

    @Query("SELECT ej FROM ExtractionJobEntity ej WHERE ej.status = 'PROCESSING' " +
            "OR (ej.status = 'RETRYING' AND ej.lastRetriedAt <= :backoffThreshold) " +
            "ORDER BY ej.createdAt ASC")
    List<ExtractionJobEntity> findJobsForAiEnrichment(
            @Param("backoffThreshold") LocalDateTime backoffThreshold,
            Pageable pageable);
}
