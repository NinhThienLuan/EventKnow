package com.eventknow.backend.model.entity.Audit;

import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
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
@Table(name = "attendance_snapshot_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AttendanceSnapshotHistoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    private EventAttendanceEntity attendance;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_data", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> snapshotData;

    @CreationTimestamp
    @Column(name = "forked_at", nullable = false, updatable = false)
    private LocalDateTime forkedAt;
}
