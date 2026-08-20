package com.eventknow.backend.modules.ingestion.service;

import com.eventknow.backend.modules.ingestion.normalizer.RuleBasedTitleNormalizer;
import com.eventknow.backend.modules.ingestion.normalizer.OrganizationSanitizer;
import com.eventknow.backend.modules.ingestion.repository.RawEventRepository;

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
import com.eventknow.backend.integration.llm.IngestionModels;

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
    private final OrganizationSanitizer organizationSanitizer;

    @Transactional
    public void processBatchRows(
            UUID rawEventId,
            List<IngestionModels.BatchRowResult> batchRows) {
        log.info("Processing result entities for rawEventId: {}, count row batches: {}", rawEventId, batchRows.size());

        RawEventEntity rawEvent = rawEventRepository.findById(rawEventId)
                .orElseThrow(() -> new IllegalArgumentException("RawEvent not found for ID: " + rawEventId));

        Map<String, OrganizationEntity> localResolvedOrgs = new HashMap<>(); // key: rawName, value: Entity
        Map<String, AttendeeProfileEntity> localResolvedAttendees = new HashMap<>(); // key: email or
                                                                                     // normalizedName_phone

        for (IngestionModels.BatchRowResult rowResult : batchRows) {
            int rowNum = rowResult.rowNumber();
            List<IngestionModels.ExtractedEntity> entities = rowResult.entities();
            if (entities == null || entities.isEmpty()) {
                continue;
            }

            // Separate into Organization and Person groups for local linking
            List<IngestionModels.ExtractedEntity> orgEntities = new ArrayList<>();
            List<IngestionModels.ExtractedEntity> personEntities = new ArrayList<>();

            for (IngestionModels.ExtractedEntity entity : entities) {
                if ("ORGANIZATION".equalsIgnoreCase(entity.entityType())) {
                    orgEntities.add(entity);
                } else if ("PERSON".equalsIgnoreCase(entity.entityType())) {
                    personEntities.add(entity);
                }
            }

            // 1. Process Organizations
            for (IngestionModels.ExtractedEntity orgEnt : orgEntities) {
                String orgName = orgEnt.orgName();
                if (orgName == null || orgName.trim().isEmpty()) {
                    continue;
                }

                String orgKey = organizationSanitizer.sanitizeAndGetNormalizedName(orgName);
                if (orgKey == null) {
                    continue;
                }
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
            for (IngestionModels.ExtractedEntity pEnt : personEntities) {
                String fullName = pEnt.fullName();
                if (fullName == null || fullName.trim().isEmpty()) {
                    continue;
                }

                // Resolve organization relation
                OrganizationEntity linkedOrg = null;
                String orgTextRaw = pEnt.organizationTextRaw();
                if (orgTextRaw != null && !orgTextRaw.trim().isEmpty()) {
                    orgTextRaw = orgTextRaw.trim();
                    String orgKeyRaw = organizationSanitizer.sanitizeAndGetNormalizedName(orgTextRaw);
                    // First try to match organization extracted on the same row / batch
                    linkedOrg = (orgKeyRaw != null) ? localResolvedOrgs.get(orgKeyRaw) : null;
                    if (linkedOrg == null) {
                        // Query database or create
                        linkedOrg = resolveOrCreateOrganization(orgTextRaw, null, new HashMap<>());
                        if (linkedOrg != null && orgKeyRaw != null) {
                            localResolvedOrgs.put(orgKeyRaw, linkedOrg);
                        }
                    }
                } else if (!localResolvedOrgs.isEmpty()) {
                    // Fallback to first organization extracted in batch
                    linkedOrg = localResolvedOrgs.values().iterator().next();
                }

                String email = normalizeEmail(pEnt.email());
                String phone = normalizePhone(pEnt.phone());
                AttendeeProfileEntity personEntity = null;
                if (email != null && !email.isEmpty()) {
                    personEntity = localResolvedAttendees.get(email);
                }

                // Also support local cache lookup by (normalizedName + phone) for blank email
                // attendees!
                if (personEntity == null && (email == null || email.isEmpty())) {
                    String normName = normalizeString(fullName);
                    if (phone != null && !phone.isEmpty()) {
                        personEntity = localResolvedAttendees.get(normName + "_" + phone);
                    }
                }

                Map<String, Object> profileAttributes = new HashMap<>();
                Map<String, Object> attendanceAttributes = new HashMap<>();
                if (pEnt.dynamicAttributes() != null) {
                    for (Map.Entry<String, Object> entry : pEnt.dynamicAttributesMap().entrySet()) {
                        String key = entry.getKey();
                        Object val = entry.getValue();
                        if ("ai_labeled".equalsIgnoreCase(key)) {
                            continue;
                        }
                        if (isProfileAttribute(key)) {
                            profileAttributes.put(key, val);
                        } else {
                            attendanceAttributes.put(key, val);
                        }
                    }
                }

                if (personEntity == null) {
                    personEntity = resolveOrCreateAttendee(pEnt, email, phone, linkedOrg, profileAttributes);

                    if (email != null && !email.isEmpty()) {
                        localResolvedAttendees.put(email, personEntity);
                    } else {
                        String normName = normalizeString(fullName);
                        if (phone != null && !phone.isEmpty()) {
                            localResolvedAttendees.put(normName + "_" + phone, personEntity);
                        }
                    }
                } else {
                    Map<String, Object> existingDynAttrs = personEntity.getDynamicAttributes();
                    if (existingDynAttrs == null) {
                        existingDynAttrs = new HashMap<>();
                    } else {
                        existingDynAttrs = new HashMap<>(existingDynAttrs);
                    }
                    boolean changed = false;
                    for (Map.Entry<String, Object> entry : profileAttributes.entrySet()) {
                        String key = entry.getKey();
                        Object val = entry.getValue();
                        if (!existingDynAttrs.containsKey(key) || existingDynAttrs.get(key) == null
                                || String.valueOf(existingDynAttrs.get(key)).trim().isEmpty()) {
                            existingDynAttrs.put(key, val);
                            changed = true;
                        }
                    }
                    if (changed) {
                        personEntity.setDynamicAttributes(existingDynAttrs);
                        attendeeProfileRepository.saveAndFlush(personEntity);
                    }
                }

                // Create attendance record for the person
                Map<String, Object> snapshotData = new HashMap<>();
                snapshotData.putAll(attendanceAttributes);
                snapshotData.put("extracted_full_name", fullName);
                snapshotData.put("extracted_email", pEnt.email());
                snapshotData.put("extracted_phone", pEnt.phone());
                snapshotData.put("extracted_academic_title_raw", pEnt.academicTitleRaw());
                snapshotData.put("title_at_event", pEnt.position() != null ? pEnt.position().trim() : "");
                snapshotData.put("company_at_event",
                        pEnt.organizationTextRaw() != null ? pEnt.organizationTextRaw().trim() : "");

                createAttendanceRecord(rawEvent, personEntity, linkedOrg, rowNum, snapshotData);
            }
        }
    }

    private static final Set<String> PUBLIC_EMAIL_DOMAINS = Set.of(
            "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.vn",
            "outlook.com", "hotmail.com", "icloud.com", "mail.com", "protonmail.com");

    private boolean isCorporateDomain(String domain) {
        if (domain == null || domain.isBlank())
            return false;
        return !PUBLIC_EMAIL_DOMAINS.contains(domain.toLowerCase().trim());
    }

    private OrganizationEntity resolveOrCreateOrganization(String orgName, String emailDomain,
            Map<String, Object> dynAttrs) {
        if (orgName == null || orgName.isBlank()) {
            return null; // Không tạo tổ chức rỗng
        }

        if (organizationSanitizer.isExcluded(orgName)) {
            return null;
        }

        String cleanName = orgName.trim();
        String normalizedName = organizationSanitizer.sanitizeAndGetNormalizedName(orgName);

        if (normalizedName == null || normalizedName.isEmpty()) {
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

    private boolean isProfileAttribute(String key) {
        if (key == null)
            return false;
        String norm = normalizeString(key);
        return norm.contains("cccd") || norm.contains("cmt") || norm.contains("cmnd") ||
                norm.contains("mst") || norm.contains("tax") || norm.contains("ma so thue") ||
                norm.contains("linkedin") || norm.contains("github") || norm.contains("facebook") ||
                norm.contains("portfolio") || norm.contains("cv") || norm.contains("website") ||
                norm.contains("trang web") || norm.contains("so dinh danh");
    }

    private AttendeeProfileEntity resolveOrCreateAttendee(
            IngestionModels.ExtractedEntity pEnt,
            String email,
            String phone,
            OrganizationEntity linkedOrg,
            Map<String, Object> profileAttributes) {
        Optional<AttendeeProfileEntity> matched = Optional.empty();

        if (email != null && !email.isEmpty()) {
            matched = attendeeProfileRepository.findByEmailIgnoreCaseAndIsActiveTrue(email);
        } else {
            String normalizedName = normalizeString(pEnt.fullName());
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

            // Survivorship Strategy for Profile Attributes
            Map<String, Object> existingDynAttrs = person.getDynamicAttributes();
            if (existingDynAttrs == null) {
                existingDynAttrs = new HashMap<>();
            } else {
                existingDynAttrs = new HashMap<>(existingDynAttrs);
            }
            boolean changed = false;
            for (Map.Entry<String, Object> entry : profileAttributes.entrySet()) {
                String key = entry.getKey();
                Object val = entry.getValue();
                if (!existingDynAttrs.containsKey(key) || existingDynAttrs.get(key) == null
                        || String.valueOf(existingDynAttrs.get(key)).trim().isEmpty()) {
                    existingDynAttrs.put(key, val);
                    changed = true;
                }
            }
            if (changed) {
                person.setDynamicAttributes(existingDynAttrs);
                attendeeProfileRepository.saveAndFlush(person);
            }

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
                .email(email)
                .phone(phone)
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
                .dynamicAttributes(profileAttributes != null ? profileAttributes : new HashMap<>())
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

    public static String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.trim()
                .replace('O', '0')
                .replace('o', '0');
        String digits = cleaned.replaceAll("[^0-9a-zA-Z+]", "");
        if (digits.startsWith("+84")) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }
        return digits;
    }

    public static String normalizeEmail(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String cleaned = raw.trim().toLowerCase();
        cleaned = cleaned.replaceAll("\\s*@\\s*", "@");
        cleaned = cleaned.replaceAll("\\s*\\.\\s*", ".");
        return cleaned;
    }
}