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

        Optional<AttendeeProfileEntity> findByNormalizedNameAndPhoneAndIsActiveTrue(String normalizedName,
                        String phone);

        List<AttendeeProfileEntity> findTop30ByAiLabeledFalseAndIsActiveTrue();

        @Query("SELECT DISTINCT ap FROM AttendeeProfileEntity ap " +
                        "JOIN EventAttendanceEntity ea ON ea.attendeeProfile = ap " +
                        "WHERE ea.rawEvent.id = :rawEventId " +
                        "  AND ea.sourceRowNumber BETWEEN :rowStart AND :rowEnd " +
                        "  AND ap.aiLabeled = false " +
                        "  AND ap.isActive = true " +
                        "  AND ea.isDeletedInSource = false")
        List<AttendeeProfileEntity> findPendingForJob(
                        @Param("rawEventId") UUID rawEventId,
                        @Param("rowStart") int rowStart,
                        @Param("rowEnd") int rowEnd);

        @Query(value = "SELECT a.id AS idA, a.full_name AS nameA, b.id AS idB, b.full_name AS nameB, " +
                        "COALESCE( " +
                        "    CASE WHEN a.email = b.email THEN 1.0 END, " +
                        "    similarity(a.normalized_name, b.normalized_name) " +
                        ") AS score, " +
                        "CASE " +
                        "    WHEN a.email = b.email THEN 'EXACT' " +
                        "    ELSE 'SUGGESTED' " +
                        "END AS matchReason " +
                        "FROM attendee_profiles a " +
                        "JOIN attendee_profiles b ON a.id < b.id " +
                        "WHERE a.is_active = true AND b.is_active = true " +
                        "  AND ( " +
                        "      (a.email = b.email AND a.email IS NOT NULL AND a.email <> '') " +
                        "      OR (a.phone = b.phone AND a.phone IS NOT NULL AND a.phone <> '' AND similarity(a.normalized_name, b.normalized_name) > :threshold) "
                        +
                        "      OR similarity(a.normalized_name, b.normalized_name) > :threshold " +
                        "  ) " +
                        "ORDER BY score DESC", nativeQuery = true)
        List<DuplicateCandidateProjection> findDuplicates(@Param("threshold") double threshold);

        @Modifying
        @Query(value = "UPDATE attendee_profiles SET merged_into_id = :canonicalId WHERE merged_into_id = :secondaryId", nativeQuery = true)
        int propagateMergedInto(@Param("secondaryId") UUID secondaryId, @Param("canonicalId") UUID canonicalId);

        @Query("SELECT a FROM AttendeeProfileEntity a LEFT JOIN a.organization org WHERE a.isActive = true " +
                        "AND (:search IS NULL OR :search = '' OR " +
                        "     LOWER(a.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "     LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "     LOWER(a.organizationTextRaw) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
                        "     LOWER(org.orgName) LIKE LOWER(CONCAT('%', :search, '%')))" +
                        "AND (:role IS NULL OR a.attendeeRole = :role) " +
                        "AND (:status IS NULL OR a.followUpStatus = :status)")
        List<AttendeeProfileEntity> searchActiveProfiles(
                        @Param("search") String search,
                        @Param("role") com.eventknow.backend.model.entity.Core.AttendeeProfileEntity.AttendeeRole role,
                        @Param("status") com.eventknow.backend.model.entity.Core.AttendeeProfileEntity.FollowUpStatus status);

        @Query(value = "SELECT DISTINCT a.* FROM attendee_profiles a " +
                        "LEFT JOIN organizations org ON a.organization_id = org.id " +
                        "LEFT JOIN event_attendance ea ON a.id = ea.attendee_profile_id AND ea.is_deleted_in_source = false "
                        +
                        "LEFT JOIN raw_events re ON ea.raw_event_id = re.id " +
                        "WHERE a.is_active = true " +
                        "  AND (:search IS NULL OR :search = '' OR " +
                        "       a.full_name ILIKE CONCAT('%', :search, '%') OR " +
                        "       a.email ILIKE CONCAT('%', :search, '%') OR " +
                        "       a.organization_text_raw ILIKE CONCAT('%', :search, '%') OR " +
                        "       org.org_name ILIKE CONCAT('%', :search, '%')) " +
                        "  AND (:role IS NULL OR :role = '' OR a.attendee_role = :role) " +
                        "  AND (:status IS NULL OR :status = '' OR a.follow_up_status = :status) " +
                        "  AND (:domain IS NULL OR :domain = '' OR a.research_domains && CAST(string_to_array(:domain, ',') AS varchar[])) "
                        +
                        "  AND (:academicTitle IS NULL OR :academicTitle = '' OR a.academic_title_normalized && CAST(string_to_array(:academicTitle, ',') AS varchar[])) "
                        +
                        "  AND (:position IS NULL OR :position = '' OR a.position ILIKE CONCAT('%', :position, '%')) " +
                        "  AND (:department IS NULL OR :department = '' OR re.department = :department) " +
                        "  AND (:startDate IS NULL OR :startDate = '' OR re.event_date >= CAST(:startDate AS date)) " +
                        "  AND (:endDate IS NULL OR :endDate = '' OR re.event_date <= CAST(:endDate AS date))", nativeQuery = true)
        List<AttendeeProfileEntity> searchActiveProfilesMultivariate(
                        @Param("search") String search,
                        @Param("role") String role,
                        @Param("status") String status,
                        @Param("domain") String domain,
                        @Param("academicTitle") String academicTitle,
                        @Param("position") String position,
                        @Param("department") String department,
                        @Param("startDate") String startDate,
                        @Param("endDate") String endDate);

        @Query(value = "SELECT a.* FROM attendee_profiles a " +
                        "JOIN events e ON e.id = :eventId " +
                        "WHERE a.is_active = true " +
                        "  AND a.expertise_tags && e.topic_tags " +
                        "ORDER BY (SELECT COUNT(*) FROM (SELECT unnest(a.expertise_tags) INTERSECT SELECT unnest(e.topic_tags)) x) DESC, a.full_name ASC "
                        +
                        "LIMIT :limit", nativeQuery = true)
        List<AttendeeProfileEntity> findRecommendationsForEvent(
                        @Param("eventId") UUID eventId,
                        @Param("limit") int limit);

        long countByOrganizationAndIsActiveTrue(
                        com.eventknow.backend.model.entity.Core.OrganizationEntity organization);
}
