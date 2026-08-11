package com.eventknow.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_citations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ReportCitationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private AiInsightReportEntity report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    private EventAttendanceEntity attendance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_history_id")
    private AttendanceSnapshotHistoryEntity snapshotHistory;

    @Column(name = "citation_label", nullable = false, length = 255)
    private String citationLabel;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
