package com.eventknow.backend.modules.identity;

import com.eventknow.backend.model.entity.Audit.IdentityMergeLogEntity;
import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.model.entity.Core.OrganizationEntity;
import com.eventknow.backend.modules.identity.dto.DuplicateCandidateProjection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class IdentityService {

    private final AttendeeProfileRepository attendeeProfileRepository;
    private final OrganizationRepository organizationRepository;
    private final EventRepository eventRepository;
    private final IdentityMergeLogRepository identityMergeLogRepository;
    private final EventAttendanceRepository eventAttendanceRepository;

    @Autowired
    public IdentityService(AttendeeProfileRepository attendeeProfileRepository,
            OrganizationRepository organizationRepository,
            EventRepository eventRepository,
            IdentityMergeLogRepository identityMergeLogRepository,
            EventAttendanceRepository eventAttendanceRepository) {
        this.attendeeProfileRepository = attendeeProfileRepository;
        this.organizationRepository = organizationRepository;
        this.eventRepository = eventRepository;
        this.identityMergeLogRepository = identityMergeLogRepository;
        this.eventAttendanceRepository = eventAttendanceRepository;
    }

    public List<DuplicateCandidateProjection> findDuplicates(String entityType, double threshold) {
        switch (entityType.toUpperCase()) {
            case "PERSON":
                return attendeeProfileRepository.findDuplicates(threshold);
            case "ORGANIZATION":
                return organizationRepository.findDuplicates(threshold);
            case "EVENT":
                return eventRepository.findDuplicates(threshold);
            default:
                throw new IllegalArgumentException("Unknown entityType: " + entityType);
        }
    }

    public Map<String, Object> merge(String entityType, UUID primaryId, UUID secondaryId, String adminEmail) {
        switch (entityType.toUpperCase()) {
            case "PERSON":
                return mergePerson(primaryId, secondaryId, adminEmail);
            case "ORGANIZATION":
                return mergeOrganization(primaryId, secondaryId, adminEmail);
            case "EVENT":
                return mergeEvent(primaryId, secondaryId, adminEmail);
            default:
                throw new IllegalArgumentException("Unknown entityType: " + entityType);
        }
    }

    private Map<String, Object> mergePerson(UUID primaryId, UUID secondaryId, String adminEmail) {
        AttendeeProfileEntity primary = attendeeProfileRepository.findById(primaryId)
                .orElseThrow(() -> new IllegalArgumentException("Primary profile not found"));
        AttendeeProfileEntity secondary = attendeeProfileRepository.findById(secondaryId)
                .orElseThrow(() -> new IllegalArgumentException("Secondary profile not found"));

        AttendeeProfileEntity canonicalPrimary = resolveProfile(primary);
        AttendeeProfileEntity canonicalSecondary = resolveProfile(secondary);

        if (canonicalPrimary.getId().equals(canonicalSecondary.getId())) {
            throw new IllegalStateException("ALREADY_MERGED");
        }

        // Snapshot secondary
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("id", canonicalSecondary.getId().toString());
        snapshot.put("fullName", canonicalSecondary.getFullName());
        snapshot.put("normalizedName", canonicalSecondary.getNormalizedName());
        snapshot.put("email", canonicalSecondary.getEmail());
        snapshot.put("phone", canonicalSecondary.getPhone());
        snapshot.put("academicTitleRaw", canonicalSecondary.getAcademicTitleRaw());
        snapshot.put("academicTitleNormalized", canonicalSecondary.getAcademicTitleNormalized());
        snapshot.put("attendeeRole",
                canonicalSecondary.getAttendeeRole() != null ? canonicalSecondary.getAttendeeRole().name() : null);
        snapshot.put("position", canonicalSecondary.getPosition());
        snapshot.put("organizationId",
                canonicalSecondary.getOrganization() != null ? canonicalSecondary.getOrganization().getId().toString()
                        : null);
        snapshot.put("organizationTextRaw", canonicalSecondary.getOrganizationTextRaw());
        snapshot.put("followUpStatus",
                canonicalSecondary.getFollowUpStatus() != null ? canonicalSecondary.getFollowUpStatus().name() : null);
        snapshot.put("dynamicAttributes", canonicalSecondary.getDynamicAttributes());
        snapshot.put("mergedFromIds", canonicalSecondary.getMergedFromIds() != null
                ? canonicalSecondary.getMergedFromIds().stream().map(UUID::toString).collect(Collectors.toList())
                : null);

        IdentityMergeLogEntity log = IdentityMergeLogEntity.builder()
                .targetProfileId(canonicalSecondary.getId())
                .mergedEntitySnapshot(snapshot)
                .mergedByEmail(adminEmail)
                .build();
        identityMergeLogRepository.save(log);

        // Survivorship Copy
        if (isBlank(canonicalPrimary.getFullName()))
            canonicalPrimary.setFullName(canonicalSecondary.getFullName());
        if (isBlank(canonicalPrimary.getNormalizedName()))
            canonicalPrimary.setNormalizedName(canonicalSecondary.getNormalizedName());
        if (isBlank(canonicalPrimary.getEmail()))
            canonicalPrimary.setEmail(canonicalSecondary.getEmail());
        if (isBlank(canonicalPrimary.getPhone()))
            canonicalPrimary.setPhone(canonicalSecondary.getPhone());
        if (isBlank(canonicalPrimary.getAcademicTitleRaw()))
            canonicalPrimary.setAcademicTitleRaw(canonicalSecondary.getAcademicTitleRaw());
        if (canonicalPrimary.getAcademicTitleNormalized() == null
                || canonicalPrimary.getAcademicTitleNormalized().isEmpty()) {
            canonicalPrimary.setAcademicTitleNormalized(canonicalSecondary.getAcademicTitleNormalized());
        }
        if (canonicalPrimary.getAttendeeRole() == null)
            canonicalPrimary.setAttendeeRole(canonicalSecondary.getAttendeeRole());
        if (isBlank(canonicalPrimary.getPosition()))
            canonicalPrimary.setPosition(canonicalSecondary.getPosition());
        if (canonicalPrimary.getOrganization() == null)
            canonicalPrimary.setOrganization(canonicalSecondary.getOrganization());
        if (isBlank(canonicalPrimary.getOrganizationTextRaw()))
            canonicalPrimary.setOrganizationTextRaw(canonicalSecondary.getOrganizationTextRaw());
        if (canonicalPrimary.getFollowUpStatus() == AttendeeProfileEntity.FollowUpStatus.CHUA_LIEN_HE
                && canonicalSecondary.getFollowUpStatus() != null) {
            canonicalPrimary.setFollowUpStatus(canonicalSecondary.getFollowUpStatus());
        }

        // JSONB Dynamic Attributes merge rule: secondary_attrs || primary_attrs
        // (primary wins)
        if (canonicalSecondary.getDynamicAttributes() != null) {
            if (canonicalPrimary.getDynamicAttributes() == null) {
                canonicalPrimary.setDynamicAttributes(new HashMap<>(canonicalSecondary.getDynamicAttributes()));
            } else {
                Map<String, Object> merged = new HashMap<>(canonicalSecondary.getDynamicAttributes());
                merged.putAll(canonicalPrimary.getDynamicAttributes());
                canonicalPrimary.setDynamicAttributes(merged);
            }
        }

        // update lists
        List<UUID> primaryFrom = canonicalPrimary.getMergedFromIds();
        if (primaryFrom == null) {
            primaryFrom = new ArrayList<>();
        } else {
            primaryFrom = new ArrayList<>(primaryFrom);
        }
        if (!primaryFrom.contains(canonicalSecondary.getId())) {
            primaryFrom.add(canonicalSecondary.getId());
        }
        if (canonicalSecondary.getMergedFromIds() != null) {
            for (UUID fid : canonicalSecondary.getMergedFromIds()) {
                if (!primaryFrom.contains(fid)) {
                    primaryFrom.add(fid);
                }
            }
        }
        canonicalPrimary.setMergedFromIds(primaryFrom);

        // Deactivate secondary
        canonicalSecondary.setActive(false);
        canonicalSecondary.setMergedInto(canonicalPrimary);
        attendeeProfileRepository.save(canonicalSecondary);
        attendeeProfileRepository.save(canonicalPrimary);

        // Single-hop merge propagation update
        attendeeProfileRepository.propagateMergedInto(canonicalSecondary.getId(), canonicalPrimary.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("status", "merged");
        result.put("survivingId", canonicalPrimary.getId().toString());
        result.put("mergeLogId", log.getId().toString());
        return result;
    }

    private Map<String, Object> mergeOrganization(UUID primaryId, UUID secondaryId, String adminEmail) {
        OrganizationEntity primary = organizationRepository.findById(primaryId)
                .orElseThrow(() -> new IllegalArgumentException("Primary organization not found"));
        OrganizationEntity secondary = organizationRepository.findById(secondaryId)
                .orElseThrow(() -> new IllegalArgumentException("Secondary organization not found"));

        OrganizationEntity canonicalPrimary = resolveOrg(primary);
        OrganizationEntity canonicalSecondary = resolveOrg(secondary);

        if (canonicalPrimary.getId().equals(canonicalSecondary.getId())) {
            throw new IllegalStateException("ALREADY_MERGED");
        }

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("id", canonicalSecondary.getId().toString());
        snapshot.put("orgName", canonicalSecondary.getOrgName());
        snapshot.put("normalizedName", canonicalSecondary.getNormalizedName());
        snapshot.put("emailDomain", canonicalSecondary.getEmailDomain());
        snapshot.put("dynamicAttributes", canonicalSecondary.getDynamicAttributes());
        snapshot.put("mergedFromIds", canonicalSecondary.getMergedFromIds() != null
                ? canonicalSecondary.getMergedFromIds().stream().map(UUID::toString).collect(Collectors.toList())
                : null);

        IdentityMergeLogEntity log = IdentityMergeLogEntity.builder()
                .targetOrgId(canonicalSecondary.getId())
                .mergedEntitySnapshot(snapshot)
                .mergedByEmail(adminEmail)
                .build();
        identityMergeLogRepository.save(log);

        if (isBlank(canonicalPrimary.getOrgName()))
            canonicalPrimary.setOrgName(canonicalSecondary.getOrgName());
        if (isBlank(canonicalPrimary.getNormalizedName()))
            canonicalPrimary.setNormalizedName(canonicalSecondary.getNormalizedName());
        if (isBlank(canonicalPrimary.getEmailDomain()))
            canonicalPrimary.setEmailDomain(canonicalSecondary.getEmailDomain());

        // JSONB Dynamic Attributes merge rule
        if (canonicalSecondary.getDynamicAttributes() != null) {
            if (canonicalPrimary.getDynamicAttributes() == null) {
                canonicalPrimary.setDynamicAttributes(new HashMap<>(canonicalSecondary.getDynamicAttributes()));
            } else {
                Map<String, Object> merged = new HashMap<>(canonicalSecondary.getDynamicAttributes());
                merged.putAll(canonicalPrimary.getDynamicAttributes());
                canonicalPrimary.setDynamicAttributes(merged);
            }
        }

        List<UUID> primaryFrom = canonicalPrimary.getMergedFromIds();
        if (primaryFrom == null) {
            primaryFrom = new ArrayList<>();
        } else {
            primaryFrom = new ArrayList<>(primaryFrom);
        }
        if (!primaryFrom.contains(canonicalSecondary.getId())) {
            primaryFrom.add(canonicalSecondary.getId());
        }
        if (canonicalSecondary.getMergedFromIds() != null) {
            for (UUID fid : canonicalSecondary.getMergedFromIds()) {
                if (!primaryFrom.contains(fid)) {
                    primaryFrom.add(fid);
                }
            }
        }
        canonicalPrimary.setMergedFromIds(primaryFrom);

        canonicalSecondary.setActive(false);
        canonicalSecondary.setMergedInto(canonicalPrimary);
        organizationRepository.save(canonicalSecondary);
        organizationRepository.save(canonicalPrimary);

        organizationRepository.propagateMergedInto(canonicalSecondary.getId(), canonicalPrimary.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("status", "merged");
        result.put("survivingId", canonicalPrimary.getId().toString());
        result.put("mergeLogId", log.getId().toString());
        return result;
    }

    private Map<String, Object> mergeEvent(UUID primaryId, UUID secondaryId, String adminEmail) {
        EventEntity primary = eventRepository.findById(primaryId)
                .orElseThrow(() -> new IllegalArgumentException("Primary event not found"));
        EventEntity secondary = eventRepository.findById(secondaryId)
                .orElseThrow(() -> new IllegalArgumentException("Secondary event not found"));

        EventEntity canonicalPrimary = resolveEvent(primary);
        EventEntity canonicalSecondary = resolveEvent(secondary);

        if (canonicalPrimary.getId().equals(canonicalSecondary.getId())) {
            throw new IllegalStateException("ALREADY_MERGED");
        }

        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("id", canonicalSecondary.getId().toString());
        snapshot.put("eventName", canonicalSecondary.getEventName());
        snapshot.put("eventDate",
                canonicalSecondary.getEventDate() != null ? canonicalSecondary.getEventDate().toString() : null);
        snapshot.put("department", canonicalSecondary.getDepartment());
        snapshot.put("mergedFromIds", canonicalSecondary.getMergedFromIds() != null
                ? canonicalSecondary.getMergedFromIds().stream().map(UUID::toString).collect(Collectors.toList())
                : null);

        IdentityMergeLogEntity log = IdentityMergeLogEntity.builder()
                .targetEventId(canonicalSecondary.getId())
                .mergedEntitySnapshot(snapshot)
                .mergedByEmail(adminEmail)
                .build();
        identityMergeLogRepository.save(log);

        if (isBlank(canonicalPrimary.getEventName()))
            canonicalPrimary.setEventName(canonicalSecondary.getEventName());
        if (canonicalPrimary.getEventDate() == null)
            canonicalPrimary.setEventDate(canonicalSecondary.getEventDate());
        if (isBlank(canonicalPrimary.getDepartment()))
            canonicalPrimary.setDepartment(canonicalSecondary.getDepartment());

        List<UUID> primaryFrom = canonicalPrimary.getMergedFromIds();
        if (primaryFrom == null) {
            primaryFrom = new ArrayList<>();
        } else {
            primaryFrom = new ArrayList<>(primaryFrom);
        }
        if (!primaryFrom.contains(canonicalSecondary.getId())) {
            primaryFrom.add(canonicalSecondary.getId());
        }
        if (canonicalSecondary.getMergedFromIds() != null) {
            for (UUID fid : canonicalSecondary.getMergedFromIds()) {
                if (!primaryFrom.contains(fid)) {
                    primaryFrom.add(fid);
                }
            }
        }
        canonicalPrimary.setMergedFromIds(primaryFrom);

        canonicalSecondary.setActive(false);
        canonicalSecondary.setMergedInto(canonicalPrimary);
        eventRepository.save(canonicalSecondary);
        eventRepository.save(canonicalPrimary);

        eventRepository.propagateMergedInto(canonicalSecondary.getId(), canonicalPrimary.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("status", "merged");
        result.put("survivingId", canonicalPrimary.getId().toString());
        result.put("mergeLogId", log.getId().toString());
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> split(UUID mergeLogId, String adminEmail) {
        IdentityMergeLogEntity log = identityMergeLogRepository.findByIdAndSplitAtIsNull(mergeLogId)
                .orElseThrow(() -> new IllegalArgumentException("Active merge log not found or already split"));

        Map<String, Object> snapshot = log.getMergedEntitySnapshot();
        UUID newEntityId;

        if (log.getTargetProfileId() != null) {
            AttendeeProfileEntity restored = new AttendeeProfileEntity();
            restored.setId(UUID.fromString((String) snapshot.get("id")));
            restored.setFullName((String) snapshot.get("fullName"));
            restored.setNormalizedName((String) snapshot.get("normalizedName"));
            restored.setEmail((String) snapshot.get("email"));
            restored.setPhone((String) snapshot.get("phone"));
            restored.setAcademicTitleRaw((String) snapshot.get("academicTitleRaw"));
            restored.setAcademicTitleNormalized((List<String>) snapshot.get("academicTitleNormalized"));
            String roleStr = (String) snapshot.get("attendeeRole");
            if (roleStr != null)
                restored.setAttendeeRole(AttendeeProfileEntity.AttendeeRole.valueOf(roleStr));
            restored.setPosition((String) snapshot.get("position"));
            String orgIdStr = (String) snapshot.get("organizationId");
            if (orgIdStr != null) {
                organizationRepository.findById(UUID.fromString(orgIdStr)).ifPresent(restored::setOrganization);
            }
            restored.setOrganizationTextRaw((String) snapshot.get("organizationTextRaw"));
            String statusStr = (String) snapshot.get("followUpStatus");
            if (statusStr != null)
                restored.setFollowUpStatus(AttendeeProfileEntity.FollowUpStatus.valueOf(statusStr));
            restored.setDynamicAttributes((Map<String, Object>) snapshot.get("dynamicAttributes"));
            List<String> mfStrList = (List<String>) snapshot.get("mergedFromIds");
            if (mfStrList != null) {
                restored.setMergedFromIds(mfStrList.stream().map(UUID::fromString).collect(Collectors.toList()));
            }
            restored.setActive(true);
            restored.setMergedInto(null);
            attendeeProfileRepository.save(restored);
            newEntityId = restored.getId();
        } else if (log.getTargetOrgId() != null) {
            OrganizationEntity restored = new OrganizationEntity();
            restored.setId(UUID.fromString((String) snapshot.get("id")));
            restored.setOrgName((String) snapshot.get("orgName"));
            restored.setNormalizedName((String) snapshot.get("normalizedName"));
            restored.setEmailDomain((String) snapshot.get("emailDomain"));
            restored.setDynamicAttributes((Map<String, Object>) snapshot.get("dynamicAttributes"));
            List<String> mfStrList = (List<String>) snapshot.get("mergedFromIds");
            if (mfStrList != null) {
                restored.setMergedFromIds(mfStrList.stream().map(UUID::fromString).collect(Collectors.toList()));
            }
            restored.setActive(true);
            restored.setMergedInto(null);
            organizationRepository.save(restored);
            newEntityId = restored.getId();
        } else if (log.getTargetEventId() != null) {
            EventEntity restored = new EventEntity();
            restored.setId(UUID.fromString((String) snapshot.get("id")));
            restored.setEventName((String) snapshot.get("eventName"));
            String dateStr = (String) snapshot.get("eventDate");
            if (dateStr != null)
                restored.setEventDate(LocalDate.parse(dateStr));
            restored.setDepartment((String) snapshot.get("department"));
            List<String> mfStrList = (List<String>) snapshot.get("mergedFromIds");
            if (mfStrList != null) {
                restored.setMergedFromIds(mfStrList.stream().map(UUID::fromString).collect(Collectors.toList()));
            }
            restored.setActive(true);
            restored.setMergedInto(null);
            eventRepository.save(restored);
            newEntityId = restored.getId();
        } else {
            throw new IllegalStateException("Malformed merge log snap state");
        }

        log.setSplitAt(LocalDateTime.now());
        log.setSplitByEmail(adminEmail);
        identityMergeLogRepository.save(log);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "split");
        result.put("newEntityId", newEntityId.toString());
        result.put("originalSnapshot", snapshot);
        return result;
    }

    public Map<String, Object> reassignAttendance(List<UUID> attendanceIds, UUID newAttendeeProfileId) {
        AttendeeProfileEntity profile = attendeeProfileRepository.findByIdAndIsActiveTrue(newAttendeeProfileId)
                .orElseThrow(() -> new IllegalArgumentException("Active attendee profile not found"));

        int count = eventAttendanceRepository.reassignAttendeeProfiles(attendanceIds, profile);

        Map<String, Object> result = new HashMap<>();
        result.put("status", "reassigned");
        result.put("count", count);
        return result;
    }

    // Helper single-hop resolve person
    private AttendeeProfileEntity resolveProfile(AttendeeProfileEntity profile) {
        AttendeeProfileEntity current = profile;
        while (current.getMergedInto() != null) {
            current = current.getMergedInto();
        }
        return current;
    }

    // Helper single-hop resolve org
    private OrganizationEntity resolveOrg(OrganizationEntity org) {
        OrganizationEntity current = org;
        while (current.getMergedInto() != null) {
            current = current.getMergedInto();
        }
        return current;
    }

    // Helper single-hop resolve event
    private EventEntity resolveEvent(EventEntity val) {
        EventEntity current = val;
        while (current.getMergedInto() != null) {
            current = current.getMergedInto();
        }
        return current;
    }

    private boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
}
