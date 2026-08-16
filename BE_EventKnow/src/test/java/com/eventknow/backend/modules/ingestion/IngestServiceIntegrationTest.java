package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.AcademicTitleAliasEntity;
import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.model.entity.Core.EventEntity;
import com.eventknow.backend.model.entity.Core.OrganizationEntity;
import com.eventknow.backend.model.entity.Core.RawEventEntity;
import com.eventknow.backend.modules.identity.AttendeeProfileRepository;
import com.eventknow.backend.modules.identity.EventAttendanceRepository;
import com.eventknow.backend.modules.identity.OrganizationRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;

@SpringBootTest
@Transactional
public class IngestServiceIntegrationTest {

        @Autowired
        private IngestService ingestService;

        @Autowired
        private ExtractionJobWorker jobWorker;

        @Autowired
        private RawEventRepository rawEventRepository;

        @Autowired
        private AttendeeProfileRepository attendeeProfileRepository;

        @Autowired
        private OrganizationRepository organizationRepository;

        @Autowired
        private EventAttendanceRepository eventAttendanceRepository;

        @Autowired
        private AcademicTitleAliasRepository academicTitleAliasRepository;

        @Autowired
        private com.eventknow.backend.modules.identity.EventRepository eventRepository;

        @Autowired
        private com.eventknow.backend.modules.attendee.AttendeeController attendeeController;

        @Autowired
        private com.eventknow.backend.modules.organization.OrganizationController organizationController;

        @Autowired
        private com.eventknow.backend.modules.recommendation.RecommendationController recommendationController;

        @Autowired
        private com.eventknow.backend.modules.dashboard.DashboardController dashboardController;

        @MockBean
        private GeminiExtractionClient geminiExtractionClient;

        private byte[] excelBytes;

        @BeforeEach
        public void setUp() throws IOException {
                academicTitleAliasRepository.deleteAll();
                academicTitleAliasRepository.flush();
                // Seeds some academic titles aliases
                academicTitleAliasRepository.save(AcademicTitleAliasEntity.builder()
                                .rawAlias("GS")
                                .normalizedTag(AcademicTitleAliasEntity.NormalizedTag.GS)
                                .build());
                academicTitleAliasRepository.save(AcademicTitleAliasEntity.builder()
                                .rawAlias("TS")
                                .normalizedTag(AcademicTitleAliasEntity.NormalizedTag.TS)
                                .build());
                academicTitleAliasRepository.save(AcademicTitleAliasEntity.builder()
                                .rawAlias("Th.S")
                                .normalizedTag(AcademicTitleAliasEntity.NormalizedTag.ThS)
                                .build());

                // Create Excel byte array representing mock attendee roster
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Danh sách");
                        Row header = sheet.createRow(0);
                        String[] heads = { "STT", "Họ tên", "Học hàm/vị", "Đơn vị công tác", "Email", "Vị trí" };
                        for (int i = 0; i < heads.length; i++) {
                                Cell cell = header.createCell(i);
                                cell.setCellValue(heads[i]);
                        }

                        Row r1 = sheet.createRow(1);
                        r1.createCell(0).setCellValue(1);
                        r1.createCell(1).setCellValue("Nguyễn Văn A");
                        r1.createCell(2).setCellValue("GS.TS");
                        r1.createCell(3).setCellValue("HUST");
                        r1.createCell(4).setCellValue("a.nguyen@hust.edu.vn");
                        r1.createCell(5).setCellValue("Diễn giả");

                        Row r2 = sheet.createRow(2);
                        r2.createCell(0).setCellValue(2);
                        r2.createCell(1).setCellValue("Trần Thị B");
                        r2.createCell(2).setCellValue("Th.S");
                        r2.createCell(3).setCellValue("VNU");
                        r2.createCell(4).setCellValue("b.tran@vnu.edu.vn");
                        r2.createCell(5).setCellValue("Khách mời");

                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        workbook.write(bos);
                        excelBytes = bos.toByteArray();
                }
        }

        @Test
        public void testFullIngestionFlow() {
                // 1. Setup mock response for Gemini client matching the structured JSON
                // extraction schema specifications
                GeminiExtractionClient.ExtractedEntity p1 = new GeminiExtractionClient.ExtractedEntity(
                                "PERSON", "Nguyễn Văn A", "a.nguyen@hust.edu.vn", null, "GS.TS",
                                "SPEAKER", "Diễn giả", "HUST", null, null,
                                List.of("Chuyên gia AI"), List.of("AI_ML"), List.of("NLP"),
                                List.of(new GeminiExtractionClient.DynamicAttributeDto("STT", "1")));
                GeminiExtractionClient.ExtractedEntity o1 = new GeminiExtractionClient.ExtractedEntity(
                                "ORGANIZATION", null, null, null, null,
                                null, null, null, "HUST", "hust.edu.vn",
                                List.of(), List.of(), List.of(), List.of());

                GeminiExtractionClient.ExtractedEntity p2 = new GeminiExtractionClient.ExtractedEntity(
                                "PERSON", "Trần Thị B", "b.tran@vnu.edu.vn", null, "Th.S",
                                "GUEST", "Khách mời", "VNU", null, null,
                                List.of("Nông nghiệp Xanh"), List.of("GREENTECH"), List.of("Organic"),
                                List.of(new GeminiExtractionClient.DynamicAttributeDto("STT", "2")));
                GeminiExtractionClient.ExtractedEntity o2 = new GeminiExtractionClient.ExtractedEntity(
                                "ORGANIZATION", null, null, null, null,
                                null, null, null, "VNU", "vnu.edu.vn",
                                List.of(), List.of(), List.of(), List.of());

                GeminiExtractionClient.BatchRowResult rRes1 = new GeminiExtractionClient.BatchRowResult(2,
                                List.of(p1, o1));
                GeminiExtractionClient.BatchRowResult rRes2 = new GeminiExtractionClient.BatchRowResult(3,
                                List.of(p2, o2));

                GeminiExtractionClient.GeminiExtractionResponse mockGeminiResp = new GeminiExtractionClient.GeminiExtractionResponse(
                                List.of(rRes1, rRes2));

                Mockito.when(geminiExtractionClient.extractBatch(any(), any(), anyString(), anyString(), anyInt(),
                                anyInt()))
                                .thenReturn(mockGeminiResp);

                // 2. Clear pre-existing profiles/orgs
                orgRepositoryCheckReset();

                // 3. Initiate ingestion
                UUID rawEventId = ingestService.initiateIngestion(
                                excelBytes,
                                "Hoi_thao_AI_2026-10-25.xlsx",
                                null,
                                "IT",
                                "Hội thảo AI",
                                LocalDate.of(2026, 10, 25),
                                "admin@eventknow.com",
                                null);

                assertNotNull(rawEventId);

                // Verify raw event status is initially PROCESSING
                RawEventEntity rawEvent = rawEventRepository.findById(rawEventId).orElseThrow();
                assertEquals(RawEventEntity.IngestionStatus.PROCESSING, rawEvent.getIngestionStatus());
                assertEquals("IT", rawEvent.getDepartment());

                // 4. Run Scheduled background worker manually
                jobWorker.pollAndProcessJobs();

                // 5. Verify Ingestion status transitions to DONE
                RawEventEntity completedRaw = rawEventRepository.findById(rawEventId).orElseThrow();
                assertEquals(RawEventEntity.IngestionStatus.DONE, completedRaw.getIngestionStatus());
                assertNull(completedRaw.getErrorMessage());

                // 6. Verify Orgs and Attendees and Attendance records are saved
                List<OrganizationEntity> savedOrgs = organizationRepository.findAll();
                // Since we have two organizations (HUST, VNU), they should exist.
                assertTrue(savedOrgs.size() >= 2);
                boolean hasHust = savedOrgs.stream().anyMatch(o -> "HUST".equalsIgnoreCase(o.getOrgName()));
                boolean hasVnu = savedOrgs.stream().anyMatch(o -> "VNU".equalsIgnoreCase(o.getOrgName()));
                assertTrue(hasHust);
                assertTrue(hasVnu);

                List<AttendeeProfileEntity> savedAttendees = attendeeProfileRepository.findAll();
                assertTrue(savedAttendees.size() >= 2);

                AttendeeProfileEntity aNguyen = savedAttendees.stream()
                                .filter(a -> "Nguyễn Văn A".equals(a.getFullName()))
                                .findFirst().orElseThrow();
                assertEquals("a.nguyen@hust.edu.vn", aNguyen.getEmail());
                assertEquals("GS.TS", aNguyen.getAcademicTitleRaw());
                // Verify academic titles normalized successfully (GS, TS)
                assertTrue(aNguyen.getAcademicTitleNormalized().contains("GS"));
                assertTrue(aNguyen.getAcademicTitleNormalized().contains("TS"));
                assertEquals(AttendeeProfileEntity.AttendeeRole.SPEAKER, aNguyen.getAttendeeRole());
                assertEquals("HUST", aNguyen.getOrganization().getOrgName());

                AttendeeProfileEntity bTran = savedAttendees.stream().filter(a -> "Trần Thị B".equals(a.getFullName()))
                                .findFirst().orElseThrow();
                assertEquals("b.tran@vnu.edu.vn", bTran.getEmail());
                assertEquals("Th.S", bTran.getAcademicTitleRaw());
                assertTrue(bTran.getAcademicTitleNormalized().contains("ThS"));
                assertEquals(AttendeeProfileEntity.AttendeeRole.GUEST, bTran.getAttendeeRole());

                // Verify event attendance counts
                List<EventAttendanceEntity> attendances = eventAttendanceRepository.findAll();
                System.out.println("DEBUG ATTENDANCES SIZE: " + attendances.size());
                for (EventAttendanceEntity att : attendances) {
                        System.out.println("DEBUG ATTENDANCE: ID=" + att.getId() +
                                        ", Attendee="
                                        + (att.getAttendeeProfile() != null ? att.getAttendeeProfile().getFullName()
                                                        : "null")
                                        +
                                        ", Org=" + (att.getOrganization() != null ? att.getOrganization().getOrgName()
                                                        : "null"));
                }
                assertTrue(attendances.size() >= 4);

                // Verify status counts query
                Map<String, Object> progress = ingestService.getIngestStatus(rawEventId);
                assertEquals("DONE", progress.get("status"));
                assertEquals(1L, progress.get("totalJobs"));
                assertEquals(1L, progress.get("successJobs"));
                assertEquals(0L, progress.get("failedJobs"));
                assertEquals(100.0, progress.get("progressPercent"));
                assertEquals(100.0, progress.get("progressPercent"));
        }

        @Test
        public void testSearchActiveProfiles() {
                // Seed database first using setup mock
                testFullIngestionFlow();
                List<AttendeeProfileEntity> all = attendeeProfileRepository.findAll();
                System.out.println("ALL ATTENDEES SIZE: " + all.size());
                List<AttendeeProfileEntity> searchResults = attendeeProfileRepository.searchActiveProfiles("", null,
                                null);
                System.out.println("SEARCH RESULTS SIZE: " + searchResults.size());
                assertFalse(searchResults.isEmpty());
        }

        @Test
        public void testControllerGetAttendeesAndOrgs() {
                testFullIngestionFlow();
                // Call attendees controller
                org.springframework.http.ResponseEntity<Map<String, Object>> attResp = attendeeController
                                .getAttendees("", null, null, "ALL", null, null, null, null, null);
                assertEquals(org.springframework.http.HttpStatus.OK, attResp.getStatusCode());
                assertNotNull(attResp.getBody());
                System.out.println("CONTROLLER ATTENDEES RESP: " + attResp.getBody());

                // Call organizations controller
                org.springframework.http.ResponseEntity<Map<String, Object>> orgResp = organizationController
                                .getOrganizations("", "ALL");
                assertEquals(org.springframework.http.HttpStatus.OK, orgResp.getStatusCode());
                assertNotNull(orgResp.getBody());
                System.out.println("CONTROLLER ORGS RESP: " + orgResp.getBody());
        }

        @Test
        public void testAdvancedSearchAndRecommendations() {
                testFullIngestionFlow();

                // Verify Advanced Search works
                List<AttendeeProfileEntity> searchResp = attendeeProfileRepository.searchActiveProfilesMultivariate(
                                "", null, null, "AI_ML", "GS", null, null, null, null);
                assertFalse(searchResp.isEmpty());
                assertTrue(searchResp.stream().anyMatch(a -> "Nguyễn Văn A".equals(a.getFullName())));

                // Match Trần Thị B with GREENTECH
                List<AttendeeProfileEntity> searchResp2 = attendeeProfileRepository.searchActiveProfilesMultivariate(
                                "", null, null, "GREENTECH", null, null, null, null, null);
                assertFalse(searchResp2.isEmpty());
                assertTrue(searchResp2.stream().anyMatch(a -> "Trần Thị B".equals(a.getFullName())));

                // Seed an event and test Recommendations
                List<EventEntity> savedEvents = eventRepository.findAll();
                assertFalse(savedEvents.isEmpty());
                EventEntity targetEvent = savedEvents.get(0);
                targetEvent.setTopicTags(List.of("NLP", "AI"));
                eventRepository.save(targetEvent);

                List<AttendeeProfileEntity> recs = attendeeProfileRepository
                                .findRecommendationsForEvent(targetEvent.getId(), 5);
                System.out.println("RECOMMENDATIONS SIZE: " + recs.size());
                assertFalse(recs.isEmpty());
                assertTrue(recs.stream().anyMatch(a -> "Nguyễn Văn A".equals(a.getFullName())));
        }

        @Test
        public void testDashboardAnalytics() {
                // 1. Seed data by running full ingestion (Excel upload, which creates 2
                // attendees)
                testFullIngestionFlow();

                // 2. Fetch aggregate with parameter normalization checking ("ALL" is passed)
                org.springframework.security.core.Authentication mockAuth = Mockito
                                .mock(org.springframework.security.core.Authentication.class);
                Mockito.when(mockAuth.getName()).thenReturn("admin@eventknow.com");
                Mockito.when(mockAuth.isAuthenticated()).thenReturn(true);
                Mockito.doReturn(List.of((org.springframework.security.core.GrantedAuthority) () -> "ROLE_ADMIN"))
                                .when(mockAuth).getAuthorities();

                // Set authentication in security context holder for method security
                // (@PreAuthorize)
                org.springframework.security.core.context.SecurityContext context = org.springframework.security.core.context.SecurityContextHolder
                                .createEmptyContext();
                context.setAuthentication(mockAuth);
                org.springframework.security.core.context.SecurityContextHolder.setContext(context);

                try {
                        org.springframework.http.ResponseEntity<com.eventknow.backend.modules.dashboard.dto.DashboardAggregateResponse> response = dashboardController
                                        .getAggregate(null, null, "ALL", "ALL", "ALL", mockAuth);
                        assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());
                        assertNotNull(response.getBody());

                        com.eventknow.backend.modules.dashboard.dto.DashboardAggregateResponse agg = response.getBody();
                        assertNotNull(agg.getSummary());

                        // Check academic title breakdowns normalization
                        Map<String, Integer> titles = agg.getSummary().getAcademicTitleBreakdown();
                        System.out.println("DEBUG TITLE BREAKDOWN: " + titles);
                        assertTrue(titles.containsKey("GS"));
                        assertTrue(titles.containsKey("TS"));
                        assertTrue(titles.containsKey("ThS"));

                        // Check role breakdown
                        Map<String, Integer> roles = agg.getSummary().getAttendeeRoleBreakdown();
                        System.out.println("DEBUG ROLE BREAKDOWN: " + roles);
                        assertTrue(roles.containsKey("SPEAKER"));
                        assertTrue(roles.containsKey("GUEST"));

                        // Validate Fix 2: Research domains breakdown check
                        Map<String, Integer> domains = agg.getSummary().getResearchDomainBreakdown();
                        System.out.println("DEBUG DOMAIN BREAKDOWN: " + domains);
                        assertNotNull(domains);
                        assertTrue(domains.containsKey("AI_ML"));
                        assertTrue(domains.containsKey("GREENTECH"));

                        // Validate Fix 3 (Show-up Rate):
                        // Seeding a registered attendee from GOOGLE_FORM source
                        RawEventEntity regRaw = RawEventEntity.builder()
                                        .sourceFileName("registration.csv")
                                        .eventName("Hội thảo AI")
                                        .sourceType(RawEventEntity.SourceType.GOOGLE_FORM)
                                        .ingestionStatus(RawEventEntity.IngestionStatus.DONE)
                                        .department("IT")
                                        .event(eventRepository.findAll().get(0))
                                        .build();
                        rawEventRepository.saveAndFlush(regRaw);

                        AttendeeProfileEntity regAttendee = AttendeeProfileEntity.builder()
                                        .fullName("Registered User")
                                        .normalizedName("registered user")
                                        .dynamicAttributes(Map.of())
                                        .isActive(true)
                                        .email("reg@test.com")
                                        .build();
                        attendeeProfileRepository.saveAndFlush(regAttendee);

                        eventAttendanceRepository.saveAndFlush(EventAttendanceEntity.builder()
                                        .rawEvent(regRaw)
                                        .attendeeProfile(regAttendee)
                                        .snapshotData(Map.of())
                                        .isDeletedInSource(false)
                                        .build());

                        // Re-fetch to verify Show-up Rate (2 attended in Excel / 1 registered in Google
                        // Form = 2.0. Note: This ratio of 2.0 (200%) represents a scenario where actual
                        // attended entities exceed initial google form registrations, which is common
                        // due to offline walk-in attendees.)

                        response = dashboardController.getAggregate(null, null, "ALL", "ALL", "ALL", mockAuth);
                        assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());
                        agg = response.getBody();
                        assertNotNull(agg);
                        assertEquals(2.0, agg.getSummary().getShowUpRate());
                } finally {
                        org.springframework.security.core.context.SecurityContextHolder.clearContext();
                }
        }

        private void orgRepositoryCheckReset() {
                // Clean event attendance first since it references organizations and profiles
                eventAttendanceRepository.deleteAll();
                // Clean profiles
                attendeeProfileRepository.deleteAll();
                // Clean orgs
                organizationRepository.deleteAll();
        }
}
