package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Core.OrganizationEntity;
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
public interface OrganizationRepository extends JpaRepository<OrganizationEntity, UUID> {

    Optional<OrganizationEntity> findByIdAndIsActiveTrue(UUID id);

    Optional<OrganizationEntity> findByEmailDomainIgnoreCaseAndIsActiveTrue(String emailDomain);

    Optional<OrganizationEntity> findByNormalizedNameAndIsActiveTrue(String normalizedName);

    Optional<OrganizationEntity> findByOrgNameIgnoreCaseAndIsActiveTrue(String orgName);

    @Query(value = "SELECT a.id AS idA, a.org_name AS nameA, b.id AS idB, b.org_name AS nameB, " +
            "COALESCE( " +
            "    CASE WHEN a.email_domain = b.email_domain THEN 1.0 END, " +
            "    similarity(a.normalized_name, b.normalized_name) " +
            ") AS score, " +
            "CASE " +
            "    WHEN a.email_domain = b.email_domain THEN 'EXACT_DOMAIN' " +
            "    ELSE 'FUZZY_NAME' " +
            "END AS matchReason " +
            "FROM organizations a " +
            "JOIN organizations b ON a.id < b.id " +
            "WHERE a.is_active = true AND b.is_active = true " +
            "  AND ( " +
            "      (a.email_domain = b.email_domain AND a.email_domain IS NOT NULL AND a.email_domain <> '') " +
            "      OR similarity(a.normalized_name, b.normalized_name) > :threshold " +
            "  ) " +
            "ORDER BY score DESC", nativeQuery = true)
    List<DuplicateCandidateProjection> findDuplicates(@Param("threshold") double threshold);

    @Modifying
    @Query(value = "UPDATE organizations SET merged_into_id = :canonicalId WHERE merged_into_id = :secondaryId", nativeQuery = true)
    int propagateMergedInto(@Param("secondaryId") UUID secondaryId, @Param("canonicalId") UUID canonicalId);

    @Query("SELECT o FROM OrganizationEntity o WHERE o.isActive = true " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(o.orgName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(o.emailDomain) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(o.normalizedName) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<OrganizationEntity> searchActiveOrganizations(@Param("search") String search);
}
