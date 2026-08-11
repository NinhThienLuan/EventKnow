package com.eventknow.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "department_folder_mapping")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DepartmentFolderMappingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "google_drive_folder_id", nullable = false, unique = true, length = 255)
    private String googleDriveFolderId;

    @Column(name = "department", nullable = false, length = 255)
    private String department;

    @Column(name = "created_by_email", nullable = false, length = 255)
    private String createdByEmail;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
