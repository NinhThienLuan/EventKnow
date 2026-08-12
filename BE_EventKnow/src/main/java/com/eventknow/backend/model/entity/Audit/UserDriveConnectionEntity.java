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
@Table(name = "user_drive_connections")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserDriveConnectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "refresh_token_encrypted", nullable = false, columnDefinition = "text")
    private String refreshTokenEncrypted;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "granted_scopes")
    @Builder.Default
    private List<String> grantedScopes = List.of("drive.file");

    @CreationTimestamp
    @Column(name = "connected_at", nullable = false, updatable = false)
    private LocalDateTime connectedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}
