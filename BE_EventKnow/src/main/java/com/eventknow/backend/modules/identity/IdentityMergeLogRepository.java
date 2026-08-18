package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Audit.IdentityMergeLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdentityMergeLogRepository extends JpaRepository<IdentityMergeLogEntity, UUID> {
    Optional<IdentityMergeLogEntity> findByIdAndSplitAtIsNull(UUID id);
}
