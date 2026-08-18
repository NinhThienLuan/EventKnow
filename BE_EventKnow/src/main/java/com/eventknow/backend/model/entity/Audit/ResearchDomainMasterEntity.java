package com.eventknow.backend.model.entity.Audit;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "research_domain_master")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ResearchDomainMasterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "domain_code", nullable = false, unique = true, length = 30)
    private String domainCode;

    @Column(name = "domain_name_vi", nullable = false, length = 100)
    private String domainNameVi;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
