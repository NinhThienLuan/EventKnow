package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.model.entity.Core.OrganizationEntity;
import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import com.eventknow.backend.modules.identity.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExtractionResultProcessor {

    private final AttendeeProfileRepository attendeeProfileRepository;
    private final OrganizationRepository organizationRepository;
    private final EventAttendanceRepository eventAttendanceRepository;
    private final RawEventRepository rawEventRepository;
    private final RuleBasedTitleNormalizer titleNormalizer;

    @Transactional
    public void processBatchRows(
            UUID rawEventId,
            List<GeminiExtractionClient.BatchRowResult> batchRows) {
        log.info("Processing result entities for rawEventId: {}, count row batches: {}", rawEventId, batchRows.size());

        RawEventEntity rawEvent = rawEventRepository.findById(rawEventId)
                .orElseThrow(() -> new IllegalArgumentException("RawEvent not found for ID: " + rawEventId));

        for (GeminiExtractionClient.BatchRowResult rowResult : batchRows) {
            int rowNum = rowResult.rowNumber();
            List<GeminiExtractionClient.ExtractedEntity> entities = rowResult.entities();
            if (entities == null || entities.isEmpty()) {
                continue;
            }

            // Separate into Organization and Person groups for local linking
            List<GeminiExtractionClient.ExtractedEntity> orgEntities = new ArrayList<>();
            List<GeminiExtractionClient.ExtractedEntity> personEntities = new ArrayList<>();

            for (GeminiExtractionClient.ExtractedEntity entity : entities) {
                if ("ORGANIZATION".equalsIgnoreCase(entity.entityType())) {
                    orgEntities.add(entity);
                } else if ("PERSON".equalsIgnoreCase(entity.entityType())) {
                    personEntities.add(entity);
                }
            }

            // 1. Process Organizations
            Map<String, OrganizationEntity> localResolvedOrgs = new HashMap<>(); // key: rawName, value: Entity
            for (GeminiExtractionClient.ExtractedEntity orgEnt : orgEntities) {
                String orgName = orgEnt.orgName();
                if (orgName == null || orgName.trim().isEmpty()) {
                    continue;
                }

                OrganizationEntity orgEntity = resolveOrCreateOrganization(orgName.trim(), orgEnt.emailDomain(),
                        orgEnt.dynamicAttributesMap());
                localResolvedOrgs.put(orgName.trim().toLowerCase(), orgEntity);

                // Create attendance record for the organization
                createAttendanceRecord(rawEvent, null, orgEntity, rowNum, orgEnt.dynamicAttributesMap());
            }

            // 2. Process Persons
            for (GeminiExtractionClient.ExtractedEntity pEnt : personEntities) {
                String fullName = pEnt.fullName();
                if (fullName == null || fullName.trim().isEmpty()) {
                    continue;
                }

                // Resolve organization relation
                OrganizationEntity linkedOrg = null;
                String orgTextRaw = pEnt.organizationTextRaw();
                if (orgTextRaw != null && !orgTextRaw.trim().isEmpty()) {
                    orgTextRaw = orgTextRaw.trim();
                    // First try to match organization extracted on the same row
                    linkedOrg = localResolvedOrgs.get(orgTextRaw.toLowerCase());
                    if (linkedOrg == null) {
                        // Query database or create
                        linkedOrg = resolveOrCreateOrganization(orgTextRaw, null, new HashMap<>());
                    }
                } else if (!localResolvedOrgs.isEmpty()) {
                    // Fallback to first organization extracted on same row if organizationTextRaw
                    // was omitted
                    linkedOrg = localResolvedOrgs.values().iterator().next();
                }

                AttendeeProfileEntity personEntity = resolveOrCreateAttendee(pEnt, linkedOrg);

                // Create attendance record for the person
                Map<String, Object> snapshotData = new HashMap<>();
                if (pEnt.dynamicAttributes() != null) {
                    snapshotData.putAll(pEnt.dynamicAttributesMap());
                }
                snapshotData.put("extracted_full_name", fullName);
                snapshotData.put("extracted_email", pEnt.email());
                snapshotData.put("extracted_phone", pEnt.phone());
                snapshotData.put("extracted_academic_title_raw", pEnt.academicTitleRaw());

                createAttendanceRecord(rawEvent, personEntity, linkedOrg, rowNum, snapshotData);
            }
        }
    }

    private OrganizationEntity resolveOrCreateOrganization(String orgName, String emailDomain,
            Map<String, Object> dynAttrs) {
        String cleanName = orgName.trim();
        String normalizedName = normalizeString(cleanName);
        String cleanDomain = emailDomain != null ? emailDomain.trim().toLowerCase() : null;

        Optional<OrganizationEntity> matched = Optional.empty();

        // Exact dedupe checks
        if (cleanDomain != null && !cleanDomain.isEmpty()) {
            matched = organizationRepository.findByEmailDomainIgnoreCaseAndIsActiveTrue(cleanDomain);
        }
        if (matched.isEmpty()) {
            matched = organizationRepository.findByNormalizedNameAndIsActiveTrue(normalizedName);
        }
        if (matched.isEmpty()) {
            matched = organizationRepository.findByOrgNameIgnoreCaseAndIsActiveTrue(cleanName);
        }

        if (matched.isPresent()) {
            OrganizationEntity org = matched.get();
            // Single-hop merge check
            if (org.getMergedInto() != null) {
                org = getCanonicalOrg(org);
            }
            log.info("Deduplicated Organization: {} matching existing orgId {}", cleanName, org.getId());
            return org;
        }

        // Create new organization
        OrganizationEntity newOrg = OrganizationEntity.builder()
                .orgName(cleanName)
                .normalizedName(normalizedName)
                .emailDomain(cleanDomain)
                .dynamicAttributes(dynAttrs != null ? dynAttrs : new HashMap<>())
                .isActive(true)
                .build();

        OrganizationEntity saved = organizationRepository.save(newOrg);
        log.info("Created new Organization: {} with orgId {}", cleanName, saved.getId());
        return saved;
    }

    private AttendeeProfileEntity resolveOrCreateAttendee(GeminiExtractionClient.ExtractedEntity pEnt,
            OrganizationEntity linkedOrg) {
        String email = pEnt.email();
        Optional<AttendeeProfileEntity> matched = Optional.empty();

        if (email != null && !email.trim().isEmpty()) {
            matched = attendeeProfileRepository.findByEmailIgnoreCaseAndIsActiveTrue(email.trim());
        }

        if (matched.isPresent()) {
            AttendeeProfileEntity person = matched.get();
            if (person.getMergedInto() != null) {
                person = getCanonicalProfile(person);
            }
            log.info("Deduplicated Attendee: {} matching existing attendeeId {}", person.getFullName(), person.getId());
            return person;
        }

        // Choose AttendeeRole Enum
        AttendeeProfileEntity.AttendeeRole finalRole = null;
        if (pEnt.attendeeRole() != null) {
            try {
                finalRole = AttendeeProfileEntity.AttendeeRole.valueOf(pEnt.attendeeRole().toUpperCase().trim());
            } catch (Exception e) {
                log.warn("Invalid extracted attendee role '{}', mapping to null", pEnt.attendeeRole());
            }
        }

        // Normalize Academic Titles
        List<String> normalizedTitles = new ArrayList<>();
        if (pEnt.academicTitleRaw() != null) {
            normalizedTitles = titleNormalizer.normalize(pEnt.academicTitleRaw());
        }

        // Create new profile
        AttendeeProfileEntity newPerson = AttendeeProfileEntity.builder()
                .fullName(pEnt.fullName().trim())
                .normalizedName(normalizeString(pEnt.fullName()))
                .email(email != null ? email.trim() : null)
                .phone(pEnt.phone() != null ? pEnt.phone().trim() : null)
                .academicTitleRaw(pEnt.academicTitleRaw())
                .academicTitleNormalized(normalizedTitles)
                .attendeeRole(finalRole)
                .position(pEnt.position() != null ? pEnt.position().trim() : null)
                .organization(linkedOrg)
                .organizationTextRaw(pEnt.organizationTextRaw())
                .followUpStatus(AttendeeProfileEntity.FollowUpStatus.CHUA_LIEN_HE)
                .dynamicAttributes(pEnt.dynamicAttributes() != null ? pEnt.dynamicAttributesMap() : new HashMap<>())
                .isActive(true)
                .build();

        AttendeeProfileEntity saved = attendeeProfileRepository.save(newPerson);
        log.info("Created new AttendeeProfile: {} with attendeeId {}", saved.getFullName(), saved.getId());
        return saved;
    }

    private void createAttendanceRecord(
            RawEventEntity rawEvent,
            AttendeeProfileEntity attendee,
            OrganizationEntity org,
            int rowNumber,
            Map<String, Object> snapshotData) {
        EventAttendanceEntity attendance = EventAttendanceEntity.builder()
                .rawEvent(rawEvent)
                .attendeeProfile(attendee)
                .organization(org)
                .sourceRowNumber(rowNumber)
                .attendanceStatus(EventAttendanceEntity.AttendanceStatus.CONFIRMED)
                .snapshotData(snapshotData != null ? snapshotData : new HashMap<>())
                .isDeletedInSource(false)
                .build();

        eventAttendanceRepository.save(attendance);
    }

    private AttendeeProfileEntity getCanonicalProfile(AttendeeProfileEntity profile) {
        AttendeeProfileEntity current = profile;
        while (current.getMergedInto() != null) {
            current = current.getMergedInto();
        }
        return current;
    }

    private OrganizationEntity getCanonicalOrg(OrganizationEntity org) {
        OrganizationEntity current = org;
        while (current.getMergedInto() != null) {
            current = current.getMergedInto();
        }
        return current;
    }

    public static String normalizeString(String text) {
        if (text == null) {
            return "";
        }
        String temp = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String removed = pattern.matcher(temp).replaceAll("")
                .toLowerCase()
                .replace("đ", "d")
                .replace("Đ", "d");
        return removed.replaceAll("[^a-zA-Z0-9\\s]", "").trim().replaceAll("\\s+", " ");
    }
}
