package com.eventknow.backend.model.entity.Core;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.eventknow.backend.common.infrastructure.BaseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "events")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EventEntity extends BaseEntity {

    @Column(name = "event_name", nullable = false, length = 255)
    private String eventName;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "department", length = 255)
    private String department;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "merged_from_ids")
    private List<UUID> mergedFromIds;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "merged_into_id")
    private EventEntity mergedInto;
}
