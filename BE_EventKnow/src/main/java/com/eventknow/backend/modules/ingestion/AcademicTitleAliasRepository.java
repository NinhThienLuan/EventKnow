package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.AcademicTitleAliasEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcademicTitleAliasRepository extends JpaRepository<AcademicTitleAliasEntity, UUID> {
    Optional<AcademicTitleAliasEntity> findByRawAliasIgnoreCase(String rawAlias);
}
