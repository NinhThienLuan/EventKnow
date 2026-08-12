package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
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
}
