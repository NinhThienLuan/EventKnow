package com.eventknow.backend.model.entity.Audit;

import com.eventknow.backend.model.entity.Core.RawEventEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "extraction_jobs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ExtractionJobEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raw_event_id", nullable = false)
    private RawEventEntity rawEvent;

    @Column(name = "batch_index", nullable = false)
    private int batchIndex;

    @Column(name = "row_start", nullable = false)
    private int rowStart;

    @Column(name = "row_end", nullable = false)
    private int rowEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExtractionStatus status = ExtractionStatus.PENDING;

    @Column(name = "retry_count", nullable = false)
    @Builder.Default
    private int retryCount = 0;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "raw_header_cols", columnDefinition = "text")
    private String rawHeaderCols;

    @Column(name = "raw_rows_content", columnDefinition = "text")
    private String rawRowsContent;

    @Column(name = "source_sheet_name", length = 255)
    private String sourceSheetName;

    public enum ExtractionStatus {
        PENDING, PROCESSING, DONE, FAILED, RETRYING
    }
}
