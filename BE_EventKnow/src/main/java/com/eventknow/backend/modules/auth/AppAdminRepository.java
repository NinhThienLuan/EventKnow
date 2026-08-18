package com.eventknow.backend.modules.auth;

import com.eventknow.backend.model.entity.Audit.AppAdminEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AppAdminRepository extends JpaRepository<AppAdminEntity, UUID> {
    Optional<AppAdminEntity> findByEmailAndRevokedAtIsNull(String email);
}
