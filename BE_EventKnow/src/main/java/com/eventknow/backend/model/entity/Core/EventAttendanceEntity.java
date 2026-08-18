package com.eventknow.backend.model.entity.Core;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.eventknow.backend.common.infrastructure.BaseEntity;

import java.util.Map;

@Entity
@Table(name = "event_attendance")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EventAttendanceEntity extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raw_event_id", nullable = false)
    private RawEventEntity rawEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendee_profile_id")
    private AttendeeProfileEntity attendeeProfile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private OrganizationEntity organization;

    @Column(name = "source_row_number")
    private Integer sourceRowNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", length = 20)
    @Builder.Default
    private AttendanceStatus attendanceStatus = AttendanceStatus.CONFIRMED;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_data", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> snapshotData;

    @Column(name = "is_deleted_in_source", nullable = false)
    @Builder.Default
    private boolean isDeletedInSource = false;

    public enum AttendanceStatus {
        CONFIRMED, ATTENDED, ABSENT, CANCELLED
    }
}
