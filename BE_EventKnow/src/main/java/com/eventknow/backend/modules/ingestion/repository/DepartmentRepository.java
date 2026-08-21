package com.eventknow.backend.modules.ingestion.repository;

import com.eventknow.backend.model.entity.Audit.DepartmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DepartmentRepository extends JpaRepository<DepartmentEntity, UUID> {
}
