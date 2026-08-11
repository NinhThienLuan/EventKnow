package com.eventknow.backend.model.entity.Audit;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "ai_insight_reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AiInsightReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "query_text", nullable = false, columnDefinition = "text")
    private String queryText;

    @Column(name = "generated_sql", columnDefinition = "text")
    private String generatedSql;

    @Column(name = "report_markdown", nullable = false, columnDefinition = "text")
    private String reportMarkdown;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "source_departments")
    private List<String> sourceDepartments;

    @Column(name = "requested_by_email", length = 255)
    private String requestedByEmail;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
