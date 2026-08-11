package com.eventknow.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "academic_title_alias")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AcademicTitleAliasEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "raw_alias", nullable = false, unique = true, length = 100)
    private String rawAlias;

    @Enumerated(EnumType.STRING)
    @Column(name = "normalized_tag", nullable = false, length = 20)
    private NormalizedTag normalizedTag;

    @Column(name = "priority_rank", nullable = false)
    @Builder.Default
    private int priorityRank = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum NormalizedTag {
        GS, PGS, TS, ThS, CN, KS, Khac
    }
}
