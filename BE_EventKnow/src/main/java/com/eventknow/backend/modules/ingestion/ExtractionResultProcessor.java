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
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional
    public void processBatchRows(
            UUID rawEventId,
            List<GeminiExtractionClient.BatchRowResult> batchRows) {
        log.info("Processing result entities for rawEventId: {}, count row batches: {}", rawEventId, batchRows.size());

        RawEventEntity rawEvent = rawEventRepository.findById(rawEventId)
                .orElseThrow(() -> new IllegalArgumentException("RawEvent not found for ID: " + rawEventId));

        Map<String, OrganizationEntity> localResolvedOrgs = new HashMap<>(); // key: rawName, value: Entity
        Map<String, AttendeeProfileEntity> localResolvedAttendees = new HashMap<>(); // key: email or
                                                                                     // normalizedName_phone

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
            for (GeminiExtractionClient.ExtractedEntity orgEnt : orgEntities) {
                String orgName = orgEnt.orgName();
                if (orgName == null || orgName.trim().isEmpty()) {
                    continue;
                }

                String orgKey = orgName.trim().toLowerCase();
                OrganizationEntity orgEntity = localResolvedOrgs.get(orgKey);
                if (orgEntity == null) {
                    orgEntity = resolveOrCreateOrganization(orgName.trim(), orgEnt.emailDomain(),
                            orgEnt.dynamicAttributesMap());
                }

                if (orgEntity == null) {
                    continue;
                }
                localResolvedOrgs.put(orgKey, orgEntity);

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
                    // First try to match organization extracted on the same row / batch
                    linkedOrg = localResolvedOrgs.get(orgTextRaw.toLowerCase());
                    if (linkedOrg == null) {
                        // Query database or create
                        linkedOrg = resolveOrCreateOrganization(orgTextRaw, null, new HashMap<>());
                        if (linkedOrg != null) {
                            localResolvedOrgs.put(orgTextRaw.toLowerCase(), linkedOrg);
                        }
                    }
                } else if (!localResolvedOrgs.isEmpty()) {
                    // Fallback to first organization extracted in batch
                    linkedOrg = localResolvedOrgs.values().iterator().next();
                }

                String email = pEnt.email();
                AttendeeProfileEntity personEntity = null;
                if (email != null && !email.trim().isEmpty()) {
                    personEntity = localResolvedAttendees.get(email.trim().toLowerCase());
                }

                // Also support local cache lookup by (normalizedName + phone) for blank email
                // attendees!
                if (personEntity == null && (email == null || email.trim().isEmpty())) {
                    String normName = normalizeString(fullName);
                    String phone = pEnt.phone();
                    if (phone != null && !phone.trim().isEmpty()) {
                        personEntity = localResolvedAttendees.get(normName + "_" + phone.trim());
                    }
                }

                if (personEntity == null) {
                    personEntity = resolveOrCreateAttendee(pEnt, linkedOrg);

                    if (email != null && !email.trim().isEmpty()) {
                        localResolvedAttendees.put(email.trim().toLowerCase(), personEntity);
                    } else {
                        String normName = normalizeString(fullName);
                        String phone = pEnt.phone();
                        if (phone != null && !phone.trim().isEmpty()) {
                            localResolvedAttendees.put(normName + "_" + phone.trim(), personEntity);
                        }
                    }
                }

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

    private static final Set<String> PUBLIC_EMAIL_DOMAINS = Set.of(
            "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn",
            "outlook.com", "hotmail.com", "icloud.com", "mail.com", "protonmail.com");

    private static final Set<String> ORG_STOP_WORDS = Set.of(
            "co", "khong", "ca nhan", "none", "null", "chua co", "tu do", "freelance", "nan", "-");

    private boolean isCorporateDomain(String domain) {
        if (domain == null || domain.isBlank())
            return false;
        return !PUBLIC_EMAIL_DOMAINS.contains(domain.toLowerCase().trim());
    }

    private boolean isValidOrgName(String normalizedName) {
        if (normalizedName == null || normalizedName.length() < 2)
            return false;
        return !ORG_STOP_WORDS.contains(normalizedName);
    }

    private OrganizationEntity resolveOrCreateOrganization(String orgName, String emailDomain,
            Map<String, Object> dynAttrs) {
        if (orgName == null || orgName.isBlank()) {
            return null; // Không tạo tổ chức rỗng
        }

        String cleanName = orgName.trim();
        String normalizedName = normalizeString(cleanName);

        // Chặn stopwords (Có, Không, Cá nhân,...)
        if (!isValidOrgName(normalizedName)) {
            return null;
        }

        String cleanDomain = (emailDomain != null) ? emailDomain.trim().toLowerCase() : null;
        Optional<OrganizationEntity> matched = Optional.empty();

        // 1. Chỉ dedupe theo Domain NẾU là Domain doanh nghiệp/trường viện riêng
        if (isCorporateDomain(cleanDomain)) {
            matched = organizationRepository.findByEmailDomainIgnoreCaseAndIsActiveTrue(cleanDomain);
        }

        // 2. Dedupe theo Normalized Name
        if (matched.isEmpty()) {
            matched = organizationRepository.findByNormalizedNameAndIsActiveTrue(normalizedName);
        }

        // 3. Dedupe theo Clean Name
        if (matched.isEmpty()) {
            matched = organizationRepository.findByOrgNameIgnoreCaseAndIsActiveTrue(cleanName);
        }

        if (matched.isPresent()) {
            OrganizationEntity org = matched.get();
            if (org.getMergedInto() != null) {
                org = getCanonicalOrg(org);
            }
            log.info("Deduplicated Organization: {} matching existing orgId {}", cleanName, org.getId());
            return org;
        }

        // 4. Tạo mới (chỉ lưu emailDomain nếu không phải public domain)
        OrganizationEntity newOrg = OrganizationEntity.builder()
                .orgName(cleanName)
                .normalizedName(normalizedName)
                .emailDomain(isCorporateDomain(cleanDomain) ? cleanDomain : null)
                .dynamicAttributes(dynAttrs != null ? dynAttrs : new HashMap<>())
                .isActive(true)
                .build();

        OrganizationEntity saved = organizationRepository.saveAndFlush(newOrg);
        log.info("Created new Organization: {} with orgId {}", cleanName, saved.getId());
        return saved;
    }

    private AttendeeProfileEntity resolveOrCreateAttendee(GeminiExtractionClient.ExtractedEntity pEnt,
            OrganizationEntity linkedOrg) {
        String email = pEnt.email();
        Optional<AttendeeProfileEntity> matched = Optional.empty();

        if (email != null && !email.trim().isEmpty()) {
            matched = attendeeProfileRepository.findByEmailIgnoreCaseAndIsActiveTrue(email.trim());
        } else {
            String normalizedName = normalizeString(pEnt.fullName());
            String phone = (pEnt.phone() != null) ? pEnt.phone().trim() : null;
            if (phone != null && !phone.isEmpty()) {
                matched = attendeeProfileRepository.findByNormalizedNameAndPhoneAndIsActiveTrue(normalizedName, phone);
            }
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

        // Manage detached organization if it exists in the REQUIRES_NEW session
        OrganizationEntity managedOrg = null;
        if (linkedOrg != null) {
            managedOrg = entityManager.merge(linkedOrg);
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
                .organization(managedOrg)
                .organizationTextRaw(pEnt.organizationTextRaw())
                .researchFieldsRaw(
                        pEnt.researchFieldsRaw() != null ? pEnt.researchFieldsRaw() : Collections.emptyList())
                .researchDomains(pEnt.researchDomains() != null ? pEnt.researchDomains() : Collections.emptyList())
                .expertiseTags(pEnt.expertiseTags() != null ? pEnt.expertiseTags() : Collections.emptyList())
                .followUpStatus(AttendeeProfileEntity.FollowUpStatus.CHUA_LIEN_HE)
                .aiLabeled(false) // First core ingestion path always sets to false (enrichment is async)
                .dynamicAttributes(pEnt.dynamicAttributes() != null ? pEnt.dynamicAttributesMap() : new HashMap<>())
                .isActive(true)
                .build();

        AttendeeProfileEntity saved = attendeeProfileRepository.saveAndFlush(newPerson);
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
