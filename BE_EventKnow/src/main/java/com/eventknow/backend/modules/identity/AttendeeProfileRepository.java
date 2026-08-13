package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.modules.identity.dto.DuplicateCandidateProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendeeProfileRepository extends JpaRepository<AttendeeProfileEntity, UUID> {

    Optional<AttendeeProfileEntity> findByIdAndIsActiveTrue(UUID id);

    Optional<AttendeeProfileEntity> findByEmailIgnoreCaseAndIsActiveTrue(String email);

    @Query(value = "SELECT a.id AS idA, a.full_name AS nameA, b.id AS idB, b.full_name AS nameB, " +
            "COALESCE( " +
            "    CASE WHEN a.email = b.email OR a.phone = b.phone THEN 1.0 END, " +
            "    similarity(a.normalized_name, b.normalized_name) " +
            ") AS score, " +
            "CASE " +
            "    WHEN a.email = b.email THEN 'EXACT_EMAIL' " +
            "    WHEN a.phone = b.phone THEN 'EXACT_PHONE' " +
            "    ELSE 'FUZZY_NAME' " +
            "END AS matchReason " +
            "FROM attendee_profiles a " +
            "JOIN attendee_profiles b ON a.id < b.id " +
            "WHERE a.is_active = true AND b.is_active = true " +
            "  AND ( " +
            "      (a.email = b.email AND a.email IS NOT NULL AND a.email <> '') " +
            "      OR (a.phone = b.phone AND a.phone IS NOT NULL AND a.phone <> '') " +
            "      OR similarity(a.normalized_name, b.normalized_name) > :threshold " +
            "  ) " +
            "ORDER BY score DESC", nativeQuery = true)
    List<DuplicateCandidateProjection> findDuplicates(@Param("threshold") double threshold);

    @Modifying
    @Query(value = "UPDATE attendee_profiles SET merged_into_id = :canonicalId WHERE merged_into_id = :secondaryId", nativeQuery = true)
    int propagateMergedInto(@Param("secondaryId") UUID secondaryId, @Param("canonicalId") UUID canonicalId);

    @Query("SELECT a FROM AttendeeProfileEntity a WHERE a.isActive = true " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(a.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(a.organizationTextRaw) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(a.organization.orgName) LIKE LOWER(CONCAT('%', :search, '%')))" +
            "AND (:role IS NULL OR a.attendeeRole = :role) " +
            "AND (:status IS NULL OR a.followUpStatus = :status)")
    List<AttendeeProfileEntity> searchActiveProfiles(
            @Param("search") String search,
            @Param("role") com.eventknow.backend.model.entity.Core.AttendeeProfileEntity.AttendeeRole role,
            @Param("status") com.eventknow.backend.model.entity.Core.AttendeeProfileEntity.FollowUpStatus status);
}
