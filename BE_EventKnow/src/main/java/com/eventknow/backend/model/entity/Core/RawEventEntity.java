package com.eventknow.backend.model.entity.Core;

import com.eventknow.backend.common.infrastructure.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "raw_events")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RawEventEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private EventEntity event;

    @Column(name = "event_name", nullable = false, length = 255)
    private String eventName;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "department", length = 255)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SourceType sourceType;

    @Column(name = "source_file_name", nullable = false, length = 500)
    private String sourceFileName;

    @Column(name = "google_drive_file_id", length = 255)
    private String googleDriveFileId;

    @Column(name = "drive_folder_path", columnDefinition = "text")
    private String driveFolderPath;

    @Column(name = "drive_owner_email", length = 255)
    private String driveOwnerEmail;

    @Column(name = "sheet_name", length = 255)
    private String sheetName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_header_map", columnDefinition = "jsonb")
    private Map<String, Object> rawHeaderMap;

    @Column(name = "drive_modified_time")
    private LocalDateTime driveModifiedTime;

    @Column(name = "last_synced_at")
    private LocalDateTime lastSyncedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "ingestion_status", nullable = false, length = 20)
    @Builder.Default
    private IngestionStatus ingestionStatus = IngestionStatus.PENDING;

    @Column(name = "row_count")
    @Builder.Default
    private int rowCount = 0;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    public enum SourceType {
        EXCEL, GOOGLE_FORM, SCAN_OCR
    }

    public enum IngestionStatus {
        PENDING, PROCESSING, DONE, FAILED
    }
}
