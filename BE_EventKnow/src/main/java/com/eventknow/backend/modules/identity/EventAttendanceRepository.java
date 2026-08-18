package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.model.entity.Core.OrganizationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EventAttendanceRepository extends JpaRepository<EventAttendanceEntity, UUID> {

    @Modifying
    @Query("UPDATE EventAttendanceEntity ea SET ea.attendeeProfile = :newProfile WHERE ea.id IN :ids")
    int reassignAttendeeProfiles(@Param("ids") List<UUID> ids, @Param("newProfile") AttendeeProfileEntity newProfile);

    List<EventAttendanceEntity> findByAttendeeProfile(AttendeeProfileEntity attendeeProfile);

    List<EventAttendanceEntity> findByOrganization(OrganizationEntity organization);

    @Query("SELECT DISTINCT ea FROM EventAttendanceEntity ea " +
            "JOIN FETCH ea.attendeeProfile ap " +
            "WHERE ea.rawEvent.id = :rawEventId " +
            "  AND ea.sourceRowNumber BETWEEN :rowStart AND :rowEnd " +
            "  AND ap.aiLabeled = false " +
            "  AND ap.isActive = true " +
            "  AND ea.isDeletedInSource = false " +
            "ORDER BY ea.sourceRowNumber ASC")
    List<EventAttendanceEntity> findPendingAttendancesForJob(
            @Param("rawEventId") UUID rawEventId,
            @Param("rowStart") int rowStart,
            @Param("rowEnd") int rowEnd);
}
