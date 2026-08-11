package com.eventknow.backend.model.entity.Core;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.eventknow.backend.common.infrastructure.BaseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "attendee_profiles")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttendeeProfileEntity extends BaseEntity {

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(name = "normalized_name", nullable = false, length = 255)
    private String normalizedName;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "academic_title_raw", length = 100)
    private String academicTitleRaw;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "academic_title_normalized")
    private List<String> academicTitleNormalized;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendee_role", length = 20)
    private AttendeeRole attendeeRole;

    @Column(name = "position", length = 255)
    private String position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private OrganizationEntity organization;

    @Column(name = "organization_text_raw", length = 500)
    private String organizationTextRaw;

    @Enumerated(EnumType.STRING)
    @Column(name = "follow_up_status", nullable = false, length = 20)
    @Builder.Default
    private FollowUpStatus followUpStatus = FollowUpStatus.CHUA_LIEN_HE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_attributes", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> dynamicAttributes;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "merged_from_ids")
    private List<UUID> mergedFromIds;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merged_into_id")
    private AttendeeProfileEntity mergedInto;

    public enum AttendeeRole {
        SPEAKER, EXPERT, GUEST, SPONSOR
    }

    public enum FollowUpStatus {
        CHUA_LIEN_HE, DA_LIEN_HE, TU_CHOI
    }
}
