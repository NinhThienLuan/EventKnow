package com.eventknow.backend.model.entity;

import com.eventknow.backend.infrastructure.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @Column(name = "merged_from_ids", columnDefinition = "uuid[]")
    private List<UUID> mergedFromIds;
}
