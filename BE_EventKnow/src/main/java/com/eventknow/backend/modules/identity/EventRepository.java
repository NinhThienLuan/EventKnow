package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.modules.identity.dto.DuplicateCandidateProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<EventEntity, UUID> {

    Optional<EventEntity> findByIdAndIsActiveTrue(UUID id);

    @Query(value = "SELECT a.id AS idA, a.event_name AS nameA, b.id AS idB, b.event_name AS nameB, " +
            "similarity(a.event_name, b.event_name) AS score, " +
            "'FUZZY_NAME' AS matchReason " +
            "FROM events a " +
            "JOIN events b ON a.id < b.id " +
            "WHERE a.is_active = true AND b.is_active = true " +
            "  AND abs(a.event_date - b.event_date) <= 7 " +
            "  AND (a.department = b.department OR (a.department IS NULL AND b.department IS NULL)) " +
            "  AND similarity(a.event_name, b.event_name) > :threshold " +
            "ORDER BY score DESC", nativeQuery = true)
    List<DuplicateCandidateProjection> findDuplicates(@Param("threshold") double threshold);

    @Query(value = "SELECT * FROM events e " +
            "WHERE e.is_active = true " +
            "  AND e.event_date IS NOT NULL " +
            "  AND abs(e.event_date - :eventDate) <= 7 " +
            "  AND (e.department = :department OR (:department IS NULL AND e.department IS NULL)) " +
            "  AND similarity(e.event_name, :eventName) > :threshold " +
            "ORDER BY similarity(e.event_name, :eventName) DESC, e.event_date DESC LIMIT 1", nativeQuery = true)
    Optional<EventEntity> findSimilarEvent(
            @Param("eventName") String eventName,
            @Param("eventDate") LocalDate eventDate,
            @Param("department") String department,
            @Param("threshold") double threshold);

    @Modifying
    @Query(value = "UPDATE events SET merged_into_id = :canonicalId WHERE merged_into_id = :secondaryId", nativeQuery = true)
    int propagateMergedInto(@Param("secondaryId") UUID secondaryId, @Param("canonicalId") UUID canonicalId);
}
