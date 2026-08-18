package com.eventknow.backend.model.entity.Audit;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "identity_merge_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IdentityMergeLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "target_profile_id")
    private UUID targetProfileId;

    @Column(name = "target_org_id")
    private UUID targetOrgId;

    @Column(name = "target_event_id")
    private UUID targetEventId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "merged_entity_snapshot", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> mergedEntitySnapshot;

    @Column(name = "merged_by_email", nullable = false, length = 255)
    private String mergedByEmail;

    @CreationTimestamp
    @Column(name = "merged_at", nullable = false, updatable = false)
    private LocalDateTime mergedAt;

    @Column(name = "split_at")
    private LocalDateTime splitAt;

    @Column(name = "split_by_email", length = 255)
    private String splitByEmail;
}
