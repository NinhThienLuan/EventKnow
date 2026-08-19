package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.modules.ingestion.service.EventResolutionService;
import com.eventknow.backend.modules.ingestion.repository.ExtractionJobRepository;
import com.eventknow.backend.modules.ingestion.service.IngestService;
import com.eventknow.backend.modules.ingestion.repository.AcademicTitleAliasRepository;
import com.eventknow.backend.modules.ingestion.worker.ExtractionJobWorker;
import com.eventknow.backend.modules.ingestion.repository.RawEventRepository;
import com.eventknow.backend.modules.ingestion.worker.SemanticLabelingScheduler;
import com.eventknow.backend.modules.ingestion.normalizer.ExcelHeaderMapper;

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
import com.eventknow.backend.integration.llm.LlmProviderClient;
import com.eventknow.backend.integration.llm.EnrichedTaxonomyDto;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@SpringBootTest
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

        @Autowired
        private SemanticLabelingScheduler semanticLabelingScheduler;

        @Autowired
        private EventResolutionService eventResolutionService;

        @MockBean
        private LlmProviderClient llmProviderClient;

        private byte[] excelBytes;

        @BeforeEach
        public void setUp() throws IOException {
                eventAttendanceRepository.deleteAllInBatch();
                extractionJobRepository.deleteAllInBatch();
                rawEventRepository.deleteAllInBatch();
                attendeeProfileRepository.deleteAllInBatch();
                organizationRepository.deleteAllInBatch();
                eventRepository.deleteAllInBatch();
                academicTitleAliasRepository.deleteAllInBatch();
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

                EnrichedTaxonomyDto lr1 = new EnrichedTaxonomyDto(
                                0, List.of("AI_ML"), List.of("NLP"), "SPEAKER");
                EnrichedTaxonomyDto lr2 = new EnrichedTaxonomyDto(
                                1, List.of("GREENTECH"), List.of("Organic"), "GUEST");

                Mockito.when(llmProviderClient.extractTaxonomy(any()))
                                .thenReturn(List.of(lr1, lr2));

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
                semanticLabelingScheduler.labelPendingAttendees();

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
                OrganizationEntity aNguyenOrg = organizationRepository.findById(aNguyen.getOrganization().getId())
                                .orElseThrow();
                assertEquals("HUST", aNguyenOrg.getOrgName());

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
                                        ", AttendeeID="
                                        + (att.getAttendeeProfile() != null ? att.getAttendeeProfile().getId()
                                                        : "null")
                                        +
                                        ", OrgID=" + (att.getOrganization() != null ? att.getOrganization().getId()
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
                                        .getAggregate(null, null, "ALL", "ALL", "ALL", null, mockAuth);
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

                        response = dashboardController.getAggregate(null, null, "ALL", "ALL", "ALL", null, mockAuth);
                        assertEquals(org.springframework.http.HttpStatus.OK, response.getStatusCode());
                        agg = response.getBody();
                        assertNotNull(agg);
                        assertEquals(2.0, agg.getSummary().getShowUpRate());
                } finally {
                        org.springframework.security.core.context.SecurityContextHolder.clearContext();
                }
        }

        @Autowired
        private ExtractionJobRepository extractionJobRepository;
        @Autowired
        private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

        @Test
        public void findSuspiciousSource() {
                System.out.println("======= FINDING SUSPICIOUS SOURCES =======");
                List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                                "SELECT j.raw_event_id, j.batch_index, j.raw_header_cols, j.raw_rows_content, r.source_file_name, r.raw_header_map "
                                                +
                                                "FROM extraction_jobs j JOIN raw_events r ON j.raw_event_id = r.id " +
                                                "WHERE j.raw_rows_content LIKE '%Hồ Ngọc Anh%' OR j.raw_rows_content LIKE '%Nguyễn Minh Khôi%' OR j.raw_rows_content LIKE '%Nguyễn Minh Khải%' OR j.raw_rows_content LIKE '%Phạm Tấn Anh Vũ%'");
                System.out.println("FOUND SUSPICIOUS JOBS COUNT: " + jobs.size());
                for (Map<String, Object> job : jobs) {
                        System.out.println("SOURCE FILE: " + job.get("source_file_name"));
                        System.out.println("RAW EVENT ID: " + job.get("raw_event_id"));
                        System.out.println("HEADER MAP: " + job.get("raw_header_map"));
                        System.out.println("RAW HEADERS: " + job.get("raw_header_cols"));
                }
                System.out.println("============================================");
        }

        @Test
        public void diagnoseDatabaseIssues() {
                System.out.println("======= DIAGNOSING DATABASE ISSUES =======");

                // 1. Diagnostics for Failed Extraction Jobs
                List<Map<String, Object>> failedJobs = jdbcTemplate.queryForList(
                                "SELECT id, raw_event_id, status, last_error, row_start, row_end FROM extraction_jobs WHERE status = 'FAILED'");
                System.out.println("FAILED JOBS COUNT: " + failedJobs.size());
                for (Map<String, Object> job : failedJobs) {
                        System.out.println("JOB ID: " + job.get("id") + " | RawEventID: " + job.get("raw_event_id")
                                        + " | Range: " + job.get("row_start") + " to " + job.get("row_end"));
                        System.out.println("ERROR MESSAGE: " + job.get("last_error"));
                }

                // 2. Diagnostics for Raw Events (Header Maps)
                List<Map<String, Object>> rawEvents = jdbcTemplate.queryForList(
                                "SELECT id, source_file_name, raw_header_map FROM raw_events");
                System.out.println("RAW EVENTS COUNT: " + rawEvents.size());
                for (Map<String, Object> re : rawEvents) {
                        System.out.println("RAW EVENT ID: " + re.get("id") + " | File: " + re.get("source_file_name")
                                        + " | HeaderMap: " + re.get("raw_header_map"));
                        List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                                        "SELECT batch_index, row_start, row_end, raw_header_cols, raw_rows_content FROM extraction_jobs WHERE raw_event_id = ?",
                                        re.get("id"));
                        System.out.println("  TOTAL JOBS: " + jobs.size());
                        for (Map<String, Object> job : jobs) {
                                System.out.println("  JOB batch=" + job.get("batch_index") + " range="
                                                + job.get("row_start") + " to " + job.get("row_end"));
                                System.out.println("    RAW HEADERS: " + job.get("raw_header_cols"));
                                System.out.println("    SAMPLE ROWS: " + job.get("raw_rows_content"));
                        }
                }

                // 3. Diagnostics for Suspicious Orgs & Attendees
                List<Map<String, Object>> attendees = jdbcTemplate.queryForList(
                                "SELECT ap.id, ap.full_name, ap.email, ap.position, org.org_name, ap.dynamic_attributes FROM attendee_profiles ap LEFT JOIN organizations org ON ap.organization_id = org.id");
                System.out.println("ATTENDEES COUNT: " + attendees.size());
                for (Map<String, Object> att : attendees) {
                        String orgName = String.valueOf(att.get("org_name"));
                        if (orgName.contains("Giám đốc") || orgName.contains("@") || orgName.contains(".com")
                                        || orgName.contains(".vn")) {
                                System.out.println("SUSPICIOUS ATTENDEE: Name=" + att.get("full_name") + " | Email="
                                                + att.get("email")
                                                + " | Position=" + att.get("position") + " | Org=" + orgName
                                                + " | DynamicAttributes=" + att.get("dynamic_attributes"));
                        }
                }

                System.out.println("==========================================");
        }

        @Test
        public void testRealExcelFilesMapping() throws IOException {
                ExcelHeaderMapper mapper = new ExcelHeaderMapper();
                String[] files = {
                                "../test/01_CoBan_DanhSachKhachMoi.xlsx",
                                "../test/02_NangCao_DataLinhHoat.xlsx",
                                "../test/03_PhucTap_Sponsor_Dedupe.xlsx"
                };

                for (String path : files) {
                        try (java.io.FileInputStream fis = new java.io.FileInputStream(path);
                                        Workbook workbook = new XSSFWorkbook(fis)) {
                                Sheet sheet = workbook.getSheetAt(0);
                                ExcelHeaderMapper.HeaderMappingResult result = mapper.detectHeaderMapping(sheet);
                                System.out.println("FILE: " + path + " | Header Row Index: " + result.headerRowIndex());
                                System.out.println("Standard Mappings: " + result.standardMapping());
                                System.out.println("Unmapped Columns: " + result.unmappedHeaders());

                                // Assert that we mapped at least fullName because all these list files contain
                                // name fields
                                boolean hasName = result.standardMapping().containsKey("fullName") ||
                                                (result.standardMapping().containsKey("lastNameSplit") && result
                                                                .standardMapping().containsKey("firstNameSplit"));
                                assertTrue(hasName, "Mapping should find name for " + path);
                        }
                }
        }

        @Test
        public void testDynamicAttributesFallback() throws IOException {
                // 1. Create a sheet with weird headers not in the regex list
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Danh sách lạ");
                        Row header = sheet.createRow(0);
                        header.createCell(0).setCellValue("Họ tên");
                        header.createCell(1).setCellValue("Cột Lạ Chưa Từng Thấy 1");
                        header.createCell(2).setCellValue("Chức vụ Khóa Học");

                        Row r1 = sheet.createRow(1);
                        r1.createCell(0).setCellValue("Đại biểu Lạ");
                        r1.createCell(1).setCellValue("Value Lạ 1");
                        r1.createCell(2).setCellValue("Lớp trưởng");

                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        workbook.write(bos);
                        byte[] bytes = bos.toByteArray();

                        ExcelHeaderMapper mapper = new ExcelHeaderMapper();
                        ExcelHeaderMapper.HeaderMappingResult result = mapper.detectHeaderMapping(sheet);

                        System.out.println("TEST DYNAMIC FALLBACK STANDARD: " + result.standardMapping());
                        System.out.println("TEST DYNAMIC FALLBACK UNMAPPED: " + result.unmappedHeaders());

                        // Verify names found
                        assertTrue(result.standardMapping().containsKey("fullName"));
                }
        }

        @Test
        public void testMultiSheetIngestion() throws IOException {
                byte[] multiSheetExcelBytes;
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet1 = workbook.createSheet("Hoi thao Blockchain 2026-11-20");
                        Row header1 = sheet1.createRow(0);
                        header1.createCell(0).setCellValue("STT");
                        header1.createCell(1).setCellValue("Họ tên");
                        header1.createCell(2).setCellValue("Đơn vị công tác");
                        header1.createCell(3).setCellValue("Email");
                        Row r1 = sheet1.createRow(1);
                        r1.createCell(0).setCellValue(1);
                        r1.createCell(1).setCellValue("Chuỗi Khối A");
                        r1.createCell(2).setCellValue("Crypto Corp");
                        r1.createCell(3).setCellValue("blockchain.a@crypto.com");

                        Sheet sheet2 = workbook.createSheet("Dao tao AI 2026-11-25");
                        Row header2 = sheet2.createRow(0);
                        header2.createCell(0).setCellValue("STT");
                        header2.createCell(1).setCellValue("Họ tên");
                        header2.createCell(2).setCellValue("Đơn vị công tác");
                        header2.createCell(3).setCellValue("Email");
                        Row r2 = sheet2.createRow(1);
                        r2.createCell(0).setCellValue(1);
                        r2.createCell(1).setCellValue("Trí Tuệ B");
                        r2.createCell(2).setCellValue("AI Labs");
                        r2.createCell(3).setCellValue("ai.b@ailabs.org");

                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        workbook.write(bos);
                        multiSheetExcelBytes = bos.toByteArray();
                }

                EnrichedTaxonomyDto lr1 = new EnrichedTaxonomyDto(
                                2, List.of("BLOCKCHAIN"), List.of("Crypto"), "GUEST");
                EnrichedTaxonomyDto lr2 = new EnrichedTaxonomyDto(
                                2, List.of("AI_ML"), List.of("DeepLearning"), "SPEAKER");
                Mockito.when(llmProviderClient.extractTaxonomy(any()))
                                .thenReturn(List.of(lr1, lr2));

                orgRepositoryCheckReset();

                UUID rawEventId = ingestService.initiateIngestion(
                                multiSheetExcelBytes,
                                "Raw data .xlsx",
                                null,
                                null,
                                null,
                                null,
                                "admin@eventknow.com",
                                null);

                assertNotNull(rawEventId);

                jobWorker.pollAndProcessJobs();

                List<RawEventEntity> raws = rawEventRepository.findAll();
                assertTrue(raws.size() >= 2);

                RawEventEntity raw1 = raws.stream()
                                .filter(r -> "Hoi thao Blockchain 2026-11-20".equals(r.getSheetName())).findFirst()
                                .orElse(null);
                RawEventEntity raw2 = raws.stream().filter(r -> "Dao tao AI 2026-11-25".equals(r.getSheetName()))
                                .findFirst().orElse(null);

                assertNotNull(raw1);
                assertNotNull(raw2);

                assertEquals("Hoi thao Blockchain", raw1.getEventName());
                assertEquals(LocalDate.of(2026, 11, 20), raw1.getEventDate());

                assertEquals("Dao tao AI", raw2.getEventName());
                assertEquals(LocalDate.of(2026, 11, 25), raw2.getEventDate());

                assertNotNull(raw1.getEvent());
                assertNotNull(raw2.getEvent());
                assertNotEquals(raw1.getEvent().getId(), raw2.getEvent().getId());

                com.eventknow.backend.model.entity.Core.EventEntity event1 = eventRepository
                                .findById(raw1.getEvent().getId()).orElseThrow();
                com.eventknow.backend.model.entity.Core.EventEntity event2 = eventRepository
                                .findById(raw2.getEvent().getId()).orElseThrow();
                assertEquals("Hoi thao Blockchain", event1.getEventName());
                assertEquals("Dao tao AI", event2.getEventName());
        }

        private void orgRepositoryCheckReset() {
                // Clean event attendance first since it references organizations and profiles
                eventAttendanceRepository.deleteAll();
                // Clean profiles
                attendeeProfileRepository.deleteAll();
                // Clean orgs
                organizationRepository.deleteAll();
        }

        @Test
        public void testCollisionWithWeakSignals() {
                try {
                        orgRepositoryCheckReset();
                        eventRepository.deleteAll();

                        // Both fall back to date = LocalDate.now(), isDateFallback = true, department =
                        // "UNMAPPED"
                        // Name similarity ~0.4074 (below 0.85 threshold) -> Should NOT merge
                        UUID id1 = eventResolutionService.resolveCanonicalEvent("Inno cong an", LocalDate.now(), true,
                                        "UNMAPPED");
                        UUID id2 = eventResolutionService.resolveCanonicalEvent("inno AI", LocalDate.now(), true,
                                        "UNMAPPED");

                        assertNotEquals(id1, id2);
                        System.out.println("testCollisionWithWeakSignals: passed");
                } catch (Exception e) {
                        fail(e.getMessage());
                }
        }

        @Test
        public void testSimilarityWithStrongSignals() {
                try {
                        orgRepositoryCheckReset();
                        eventRepository.deleteAll();

                        // Both have non-fallback date and mapped department
                        // Event names similarity is > 0.5 (AI for SMEs 2026 vs AI for SMEs) -> Should
                        // merge
                        UUID id1 = eventResolutionService.resolveCanonicalEvent("AI for SMEs 2026",
                                        LocalDate.of(2026, 11, 20), false, "IT - Information Technology");
                        UUID id2 = eventResolutionService.resolveCanonicalEvent("AI for SMEs",
                                        LocalDate.of(2026, 11, 20), false, "IT - Information Technology");

                        assertEquals(id1, id2);
                        System.out.println("testSimilarityWithStrongSignals: passed");
                } catch (Exception e) {
                        fail(e.getMessage());
                }
        }

        @Test
        public void testNoOverlapOnMismatchedSignals() {
                try {
                        orgRepositoryCheckReset();
                        eventRepository.deleteAll();

                        // Same names, but different departments (IT vs HR) -> Should NOT merge (spatial
                        // separation check)
                        UUID id1 = eventResolutionService.resolveCanonicalEvent("AI for SMEs",
                                        LocalDate.of(2026, 11, 20), false, "IT - Information Technology");
                        UUID id2 = eventResolutionService.resolveCanonicalEvent("AI for SMEs",
                                        LocalDate.of(2026, 11, 20), false, "HR - Human Resources");

                        assertNotEquals(id1, id2);
                        System.out.println("testNoOverlapOnMismatchedSignals: passed");
                } catch (Exception e) {
                        fail(e.getMessage());
                }
        }

        @Test
        public void testWeakSignalBothUnmapped() {
                try {
                        orgRepositoryCheckReset();
                        eventRepository.deleteAll();

                        // Different names, both unmapped department and fallback date -> Should NOT
                        // merge
                        UUID id1 = eventResolutionService.resolveCanonicalEvent("Ai for SMEs", LocalDate.now(), true,
                                        "UNMAPPED");
                        UUID id2 = eventResolutionService.resolveCanonicalEvent("Hoi thao Blockchain", LocalDate.now(),
                                        true, "UNMAPPED");

                        assertNotEquals(id1, id2);
                        System.out.println("testWeakSignalBothUnmapped: passed");
                } catch (Exception e) {
                        fail(e.getMessage());
                }
        }
}