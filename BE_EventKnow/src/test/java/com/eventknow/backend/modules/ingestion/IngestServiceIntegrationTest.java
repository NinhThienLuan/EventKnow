package com.eventknow.backend.modules.ingestion;

import com.eventknow.backend.model.entity.Audit.AcademicTitleAliasEntity;
import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;
import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
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
                "SPEAKER", "Diễn giả", "HUST", null, null, Map.of("STT", "1"));
        GeminiExtractionClient.ExtractedEntity o1 = new GeminiExtractionClient.ExtractedEntity(
                "ORGANIZATION", null, null, null, null,
                null, null, null, "HUST", "hust.edu.vn", Map.of());

        GeminiExtractionClient.ExtractedEntity p2 = new GeminiExtractionClient.ExtractedEntity(
                "PERSON", "Trần Thị B", "b.tran@vnu.edu.vn", null, "Th.S",
                "GUEST", "Khách mời", "VNU", null, null, Map.of("STT", "2"));
        GeminiExtractionClient.ExtractedEntity o2 = new GeminiExtractionClient.ExtractedEntity(
                "ORGANIZATION", null, null, null, null,
                null, null, null, "VNU", "vnu.edu.vn", Map.of());

        GeminiExtractionClient.BatchRowResult rRes1 = new GeminiExtractionClient.BatchRowResult(2, List.of(p1, o1));
        GeminiExtractionClient.BatchRowResult rRes2 = new GeminiExtractionClient.BatchRowResult(3, List.of(p2, o2));

        GeminiExtractionClient.GeminiExtractionResponse mockGeminiResp = new GeminiExtractionClient.GeminiExtractionResponse(
                List.of(rRes1, rRes2));

        Mockito.when(geminiExtractionClient.extractBatch(any(), any(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(mockGeminiResp);

        // 2. Clear pre-existing profiles/orgs
        attendeeProfileRepository.deleteAll();
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

        AttendeeProfileEntity aNguyen = savedAttendees.stream().filter(a -> "Nguyễn Văn A".equals(a.getFullName()))
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
                    ", Attendee=" + (att.getAttendeeProfile() != null ? att.getAttendeeProfile().getFullName() : "null")
                    +
                    ", Org=" + (att.getOrganization() != null ? att.getOrganization().getOrgName() : "null"));
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

    private void orgRepositoryCheckReset() {
        // Clean event attendance first since it references organizations and profiles
        eventAttendanceRepository.deleteAll();
        // Clean profiles
        attendeeProfileRepository.deleteAll();
        // Clean orgs
        organizationRepository.deleteAll();
    }
}
