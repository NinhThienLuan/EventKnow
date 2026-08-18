package com.eventknow.backend.modules.auth;

import com.eventknow.backend.model.entity.Audit.UserDriveConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserDriveConnectionRepository extends JpaRepository<UserDriveConnectionEntity, UUID> {
    Optional<UserDriveConnectionEntity> findByEmailAndRevokedAtIsNull(String email);
}
