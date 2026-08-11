package com.eventknow.backend.model.entity;

import com.eventknow.backend.infrastructure.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class OrganizationEntity extends BaseEntity {

    @Column(name = "org_name", nullable = false, length = 500)
    private String orgName;

    @Column(name = "normalized_name", nullable = false, length = 500)
    private String normalizedName;

    @Column(name = "email_domain", length = 255)
    private String emailDomain;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_attributes", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> dynamicAttributes;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "merged_from_ids", columnDefinition = "uuid[]")
    private List<UUID> mergedFromIds;
}
