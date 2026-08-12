-- ============================================================
-- EVENTKNOW DATABASE SCHEMA v1.1
-- PostgreSQL 15+ (JSONB support required)
-- Hybrid design: fixed relational columns for core fields,
-- JSONB for dynamic/unpredictable Excel headers.
-- Changelog v1.0 -> v1.1:
--   + organizations (entity riêng, FR-2/3)
--   + attendee_role enum (FR-2.4)
--   + academic_title_raw/normalized + academic_title_alias lookup (FR-2.2, rule-based)
--   + attendance_snapshot_history (copy-on-write, FR-9.3)
--   + report_citations (backlink 2 chiều, FR-4.4/4.5)
--   + attendee_notes + follow_up_status (FR-8)
--   + extraction_jobs (batch/async Gemini calls, FR-2.1 - chống 429)
--   + raw_events: drive_modified_time/last_synced_at, is_deleted_in_source ở event_attendance
--   + events (canonical entity, FR-3.5) - raw_events giờ là "file nguồn", nhiều file -> 1 event thật
-- Tài chính: KHÔNG đưa vào scope bản thi (theo quyết định 10/08/2026), không có bảng liên quan.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 0. DEPARTMENT_FOLDER_MAPPING
-- FR-5.1: best-effort, CHỈ phục vụ phân loại UI Source Tree.
-- KHÔNG dùng để check quyền (xem FR-6.2 - permission check trực tiếp
-- trên từng file qua Drive API, tách biệt hoàn toàn khỏi bảng này).
-- Nếu tổ chức không có cấu trúc folder chuẩn -> fallback chọn tay
-- lúc upload là luồng chính, không phải edge case.
-- ============================================================
CREATE TABLE department_folder_mapping (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_drive_folder_id VARCHAR(255) NOT NULL UNIQUE,
    department             VARCHAR(255) NOT NULL,
    created_by_email       VARCHAR(255) NOT NULL,
    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dept_mapping_folder ON department_folder_mapping (google_drive_folder_id);

-- ============================================================
-- 0a. APP_ADMINS
-- is_app_admin ở tầng app - KHÔNG lấy từ Drive permission (FR-6.4: 
-- 2 nguồn quyền tách biệt). Bootstrap: người hoàn tất Onboarding (S1)
-- tự động là admin đầu tiên. Từ đó admin cấp/thu hồi cho người khác
-- qua UI riêng (S "Quản lý Admin"), có audit trail.
-- ============================================================
CREATE TABLE app_admins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL UNIQUE,
    granted_by_email       VARCHAR(255),              -- NULL = bootstrap tự động lúc Onboarding
    granted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at             TIMESTAMPTZ,               -- NULL = đang active
    revoked_by_email        VARCHAR(255)
);

CREATE INDEX idx_app_admins_email ON app_admins (email) WHERE revoked_at IS NULL;

-- FR-10.1: query kiểm tra "chỉ còn 1 admin active" để hiện banner cảnh báo:
--   SELECT COUNT(*) FROM app_admins WHERE revoked_at IS NULL;  -- nếu = 1 -> cảnh báo
-- FR-10.2: cơ chế break-glass KHÔNG nằm trong DB - xem biến môi trường
-- RECOVERY_ADMIN_EMAILS ở tầng deployment (Cloud Run), tách khỏi bảng này
-- để tránh khóa chết nếu admin active duy nhất mất quyền truy cập.

-- ============================================================
-- 0c. USER_DRIVE_CONNECTIONS
-- FR-1.1/FR-9.1: lưu OAuth refresh token (offline access, scope drive.file
-- - chỉ file được chọn qua Google Picker, KHÔNG phải drive.readonly toàn
-- Drive - tránh yêu cầu Google verification cho sensitive scope) của người
-- upload/link file. Dùng để backend đọc nội dung + sync định kỳ + check
-- permissions.list (FR-6.2) THAY MẶT người đó - KHÔNG dùng public link.
-- refresh_token PHẢI mã hóa at-rest (KMS/Secret Manager), KHÔNG lưu plaintext.
-- ============================================================
CREATE TABLE user_drive_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_encrypted TEXT NOT NULL,             -- mã hóa at-rest, KHÔNG lưu plaintext
    granted_scopes         TEXT[] NOT NULL DEFAULT '{drive.file}',
    connected_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ                 -- NULL = còn hiệu lực; set khi user thu hồi quyền hoặc token hết hạn không refresh được
);

CREATE INDEX idx_drive_connections_email ON user_drive_connections (email) WHERE revoked_at IS NULL;

-- ============================================================
-- 0b. EVENTS (canonical entity)
-- FR-3.5: 1 sự kiện thật có thể có nhiều file nguồn (raw_events).
-- Không để event identity ngầm định qua trùng tên/ngày giữa file.
--
-- MERGE CHAIN — PATH COMPRESSION (chốt 12/08/2026):
--   Quy tắc bất biến: merged_into_id KHÔNG BAO GIỜ tạo chuỗi dài quá 1 cấp.
--   Khi POST /api/identity/merge được gọi với entity đích B mà B đã bị merge vào C
--   (B.merged_into_id IS NOT NULL), service layer tự resolve: ghi A.merged_into_id = C,
--   KHÔNG phải B. Áp dụng đồng nhất cho events, attendee_profiles, organizations.
--   Lý do: read >> write — API đọc chỉ cần COALESCE(merged_into_id, id), 1 lần,
--   không tốn recursive CTE. Traversal lúc đọc bị loại bỏ hoàn toàn.
-- ============================================================
CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name           VARCHAR(255) NOT NULL,
    event_date            DATE,
    department            VARCHAR(255),              -- resolved cùng cơ chế department_folder_mapping (FR-5.1)
    merged_from_ids         UUID[],                    -- audit trail, cùng pattern identity_merge_log
    is_active             BOOLEAN NOT NULL DEFAULT true,
    merged_into_id          UUID REFERENCES events(id), -- path-compressed: luôn trỏ thẳng tới canonical cuối, không bao giờ là trung gian
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_name ON events (event_name);
CREATE INDEX idx_events_date ON events (event_date);
CREATE INDEX idx_events_department ON events (department);
CREATE INDEX idx_events_name_trgm ON events USING gin (event_name gin_trgm_ops);

-- ============================================================
-- 1. RAW_EVENTS
-- Đại diện 1 FILE NGUỒN (không phải 1 event thật - xem bảng events).
-- Nhiều raw_events có thể trỏ về cùng 1 events (FR-3.5).
-- ============================================================
CREATE TABLE raw_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             UUID REFERENCES events(id),   -- FK canonical event, NULL nếu chưa resolve xong (chờ Admin confirm)
    event_name          VARCHAR(255) NOT NULL,        -- tên đọc từ file này, có thể khác cách viết so với events.event_name
    event_date          DATE,
    department          VARCHAR(255),             -- resolved qua department_folder_mapping (FR-5.1), 'UNMAPPED' nếu folder chưa map
    source_type         VARCHAR(20) NOT NULL CHECK (source_type IN ('EXCEL', 'GOOGLE_FORM', 'SCAN_OCR')),
    source_file_name    VARCHAR(500) NOT NULL,
    google_drive_file_id VARCHAR(255),
    drive_folder_path    TEXT,                     -- raw path lúc ingest, để debug mapping FR-5.1
    drive_owner_email   VARCHAR(255),              -- người upload/link, khớp user_drive_connections.email - dùng token của người này để sync (FR-9.1), KHÔNG phải public link
    sheet_name          VARCHAR(255),
    raw_header_map      JSONB,
    drive_modified_time  TIMESTAMPTZ,               -- FR-9.1: mốc thời gian Drive báo cáo
    last_synced_at       TIMESTAMPTZ,               -- FR-9.1: lần app sync gần nhất
    ingestion_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (ingestion_status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    row_count            INT DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_events_drive_file ON raw_events (google_drive_file_id);
CREATE INDEX idx_raw_events_date ON raw_events (event_date);
CREATE INDEX idx_raw_events_department ON raw_events (department);
CREATE INDEX idx_raw_events_event_id ON raw_events (event_id);

-- FR-5.1 resolved: department mặc định đọc dynamic từ Drive (folder cấp 1 dưới Shared Drive root).
-- Bảng này là OVERRIDE thủ công khi tổ chức đặt tên folder không chuẩn - ưu tiên override trước, fallback dynamic parse.
-- (Bảng department_folder_mapping chi tiết định nghĩa ở Phần 0)

-- ============================================================
-- 2. EXTRACTION_JOBS
-- FR-2.1: batch/async Gemini calls, chống lỗi 429 rate limit.
-- Không gọi Gemini per-row; chia file thành nhiều batch job chạy nền.
-- ============================================================
CREATE TABLE extraction_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_event_id         UUID NOT NULL REFERENCES raw_events(id) ON DELETE CASCADE,
    batch_index          INT NOT NULL,              -- thứ tự batch trong file (0, 1, 2...)
    row_start            INT NOT NULL,
    row_end              INT NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    retry_count           INT NOT NULL DEFAULT 0,
    last_error            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ
);

CREATE INDEX idx_extraction_jobs_event ON extraction_jobs (raw_event_id);
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs (status);

-- ============================================================
-- 3. ACADEMIC_TITLE_ALIAS
-- FR-2.2: lookup table rule-based, KHÔNG dùng AI để chuẩn hóa học hàm.
-- Tự lớn dần theo thời gian - Admin bổ sung alias mới, không sửa code.
-- ============================================================
CREATE TABLE academic_title_alias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_alias            VARCHAR(100) NOT NULL UNIQUE,   -- "Gs.", "th.s", "Thạc sĩ"...
    normalized_tag        VARCHAR(20) NOT NULL
							CHECK (normalized_tag IN ('GS', 'PGS', 'TS', 'ThS', 'CN', 'KS', 'Khac')),
    priority_rank         INT NOT NULL DEFAULT 0,   -- cho case chỉ cần lấy 1 tag cao nhất khi cần
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed data cơ bản, mở rộng dần qua thời gian
INSERT INTO academic_title_alias (raw_alias, normalized_tag, priority_rank) VALUES
    ('GS', 'GS', 100), ('Gs', 'GS', 100), ('GS.', 'GS', 100),
    ('PGS', 'PGS', 90), ('Pgs', 'PGS', 90),
    ('TS', 'TS', 80), ('Ts', 'TS', 80),
    ('ThS', 'ThS', 70), ('Th.S', 'ThS', 70), ('Thac si', 'ThS', 70), ('Thạc sĩ', 'ThS', 70),
    ('KS', 'KS', 60), ('Ky su', 'KS', 60), ('Kỹ sư', 'KS', 60),
    ('CN', 'CN', 50), ('Cu nhan', 'CN', 50), ('Cử nhân', 'CN', 50)
    ON CONFLICT (raw_alias) DO NOTHING;

-- ============================================================
-- 4. ORGANIZATIONS
-- FR-2.1/2.3/3.2: entity riêng, tách khỏi attendee_profiles.
-- Path compression: xem comment events (0b) — cùng quy tắc.
-- ============================================================
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name             VARCHAR(500) NOT NULL,
    normalized_name       VARCHAR(500) NOT NULL,    -- dedupe key: lowercase, no diacritics
    email_domain          VARCHAR(255),              -- dedupe key phụ nếu có
    dynamic_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    merged_from_ids        UUID[],                    -- audit trail FR-3.3
    is_active             BOOLEAN NOT NULL DEFAULT true,
    merged_into_id          UUID REFERENCES organizations(id), -- path-compressed: luôn trỏ thẳng canonical cuối
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_normalized_name ON organizations (normalized_name);
CREATE INDEX idx_org_email_domain ON organizations (email_domain);
CREATE INDEX idx_org_dynamic_attrs ON organizations USING GIN (dynamic_attributes);
CREATE INDEX idx_org_name_trgm ON organizations USING gin (normalized_name gin_trgm_ops);

-- ============================================================
-- 5. ATTENDEE_PROFILES
-- Path compression: xem comment events (0b) — cùng quy tắc.
-- ============================================================
CREATE TABLE attendee_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(255) NOT NULL,
    normalized_name      VARCHAR(255) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(50),

    -- FR-2.2: học hàm KHÔNG do AI chuẩn hóa, code rule-based xử lý
    academic_title_raw          VARCHAR(100),              -- string gốc AI extract, VD "GS.TS"
    academic_title_normalized    VARCHAR(20)[] DEFAULT '{}', -- mảng tag chuẩn, VD {GS,TS} - không rút gọn

    -- FR-2.4: vai trò đại biểu
    attendee_role        VARCHAR(20) CHECK (attendee_role IN ('SPEAKER', 'EXPERT', 'GUEST', 'SPONSOR')),

    position             VARCHAR(255),
    organization_id       UUID REFERENCES organizations(id),  -- liên kết tổ chức chính (nếu có)
    organization_text_raw  VARCHAR(500),              -- fallback khi chưa dedupe/link được org

    -- FR-8.2: vận hành hợp tác
    follow_up_status      VARCHAR(20) NOT NULL DEFAULT 'CHUA_LIEN_HE'
                            CHECK (follow_up_status IN ('CHUA_LIEN_HE', 'DA_LIEN_HE', 'TU_CHOI')),

    dynamic_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    merged_from_ids        UUID[],
    is_active             BOOLEAN NOT NULL DEFAULT true,       -- FR-3.4: false nếu đã bị gộp vào profile khác
    merged_into_id          UUID REFERENCES attendee_profiles(id), -- path-compressed: luôn trỏ thẳng canonical cuối (không bao giờ là trung gian)
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_uq_active_attendee_email ON attendee_profiles (email) WHERE is_active = true;

CREATE INDEX idx_attendee_normalized_name ON attendee_profiles (normalized_name);
CREATE INDEX idx_attendee_academic_title_norm ON attendee_profiles USING GIN (academic_title_normalized);
CREATE INDEX idx_attendee_role ON attendee_profiles (attendee_role);
CREATE INDEX idx_attendee_org ON attendee_profiles (organization_id);
CREATE INDEX idx_attendee_dynamic_attrs ON attendee_profiles USING GIN (dynamic_attributes);
CREATE INDEX idx_attendee_name_trgm ON attendee_profiles USING gin (normalized_name gin_trgm_ops);

-- ============================================================
-- 5b. IDENTITY_MERGE_LOG
-- FR-3.4: tách gộp thủ công. Lưu snapshot field TRƯỚC khi merge,
-- để Admin tách lại bằng tay (không thuật toán tự suy luận).
-- Áp dụng cho cả Người và Tổ chức.
-- ============================================================
CREATE TABLE identity_merge_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_profile_id     UUID,                      -- profile còn lại sau merge (attendee)
    target_org_id          UUID,                      -- hoặc org còn lại sau merge
    target_event_id        UUID,                      -- hoặc event còn lại sau merge
    merged_entity_snapshot JSONB NOT NULL,             -- toàn bộ field của entity bị gộp TRƯỚC khi mất
    merged_by_email        VARCHAR(255) NOT NULL,
    merged_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    split_at               TIMESTAMPTZ,               -- NULL = chưa tách; set khi Admin đã tách lại
    split_by_email          VARCHAR(255)
);

CREATE INDEX idx_merge_log_target_profile ON identity_merge_log (target_profile_id);
CREATE INDEX idx_merge_log_target_org ON identity_merge_log (target_org_id);
CREATE INDEX idx_merge_log_target_event ON identity_merge_log (target_event_id);

-- ============================================================
-- 6. EVENT_ATTENDANCE
-- snapshot_data = LIVE, mutable, overwrite tự do (copy-on-write ở bảng riêng).
-- ============================================================
CREATE TABLE event_attendance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_event_id         UUID NOT NULL REFERENCES raw_events(id) ON DELETE CASCADE,
    attendee_profile_id   UUID REFERENCES attendee_profiles(id) ON DELETE CASCADE,
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    -- 1 dòng attendance có thể gắn người, tổ chức, hoặc cả 2 - nhưng phải có ít nhất 1
    CONSTRAINT chk_attendance_has_entity CHECK (attendee_profile_id IS NOT NULL OR organization_id IS NOT NULL),

    source_row_number     INT,
    attendance_status     VARCHAR(20) DEFAULT 'CONFIRMED'
                            CHECK (attendance_status IN ('CONFIRMED', 'ATTENDED', 'ABSENT', 'CANCELLED')),
    snapshot_data         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- LIVE row, overwrite mỗi lần sync (FR-9.3)
    is_deleted_in_source    BOOLEAN NOT NULL DEFAULT false,      -- FR-9.3: soft-delete khi row biến mất khỏi file gốc
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_event ON event_attendance (raw_event_id);
CREATE INDEX idx_attendance_profile ON event_attendance (attendee_profile_id);
CREATE INDEX idx_attendance_org ON event_attendance (organization_id);
CREATE INDEX idx_attendance_snapshot ON event_attendance USING GIN (snapshot_data);
CREATE INDEX idx_attendance_not_deleted ON event_attendance (is_deleted_in_source) WHERE is_deleted_in_source = false;

-- ============================================================
-- 7. ATTENDANCE_SNAPSHOT_HISTORY
-- FR-9.3: copy-on-write. Chỉ fork khi row đang bị report trích dẫn.
-- Growth tỉ lệ theo số report, KHÔNG tỉ lệ theo số lần sửa file nguồn.
-- ============================================================
CREATE TABLE attendance_snapshot_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id         UUID NOT NULL REFERENCES event_attendance(id) ON DELETE CASCADE,
    snapshot_data         JSONB NOT NULL,             -- bản đóng băng tại thời điểm fork
    forked_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snapshot_history_attendance ON attendance_snapshot_history (attendance_id);

-- ============================================================
-- 8. AI_INSIGHT_REPORTS
-- Report = DB record, không phải file tĩnh. Export PDF sinh on-demand.
-- ============================================================
CREATE TABLE ai_insight_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    query_text           TEXT NOT NULL,
    generated_sql         TEXT,
    report_markdown        TEXT NOT NULL,
    source_departments      TEXT[] NOT NULL DEFAULT '{}',  -- FR-6/6.1: tổng hợp department từ mọi citation, dùng check quyền AND logic
    requested_by_email     VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_insight_reports_created ON ai_insight_reports (created_at DESC);

-- ============================================================
-- 9. REPORT_CITATIONS
-- FR-4.4/4.5: backlink 2 CHIỀU.
-- snapshot_history_id NULL = citation đang trỏ LIVE data (chưa bị sửa từ lúc cite).
-- Khi sync phát hiện đổi + có citation NULL -> fork sang snapshot_history_id cụ thể (FR-9.3).
-- ============================================================
CREATE TABLE report_citations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id             UUID NOT NULL REFERENCES ai_insight_reports(id) ON DELETE CASCADE,
    attendance_id          UUID NOT NULL REFERENCES event_attendance(id) ON DELETE CASCADE,
    snapshot_history_id     UUID REFERENCES attendance_snapshot_history(id),  -- NULL = trỏ live
    citation_label          VARCHAR(255) NOT NULL,     -- VD "Event_AI.xlsx #Row 12", hiển thị trên chip
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citations_report ON report_citations (report_id);
CREATE INDEX idx_citations_attendance ON report_citations (attendance_id);   -- chiều nghịch: row -> report nào trích
CREATE INDEX idx_citations_snapshot ON report_citations (snapshot_history_id);

-- ============================================================
-- 10. ATTENDEE_NOTES
-- FR-8.1: ghi chú/comment vận hành hợp tác, audit trail.
-- Áp dụng cho cả Người và Tổ chức (nullable, phải có đúng 1 trong 2).
-- ============================================================
CREATE TABLE attendee_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendee_profile_id   UUID REFERENCES attendee_profiles(id) ON DELETE CASCADE,
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_note_has_entity CHECK (
        (attendee_profile_id IS NOT NULL AND organization_id IS NULL) OR
        (attendee_profile_id IS NULL AND organization_id IS NOT NULL)
    ),
    note_text             TEXT NOT NULL,
    created_by_email        VARCHAR(255) NOT NULL,     -- Google OAuth identity, FR-8.3
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_attendee ON attendee_notes (attendee_profile_id);
CREATE INDEX idx_notes_org ON attendee_notes (organization_id);

-- ============================================================
-- 11. TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_updated_at_raw_events
    BEFORE UPDATE ON raw_events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_attendee_profiles
    BEFORE UPDATE ON attendee_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE OR REPLACE TRIGGER set_updated_at_event_attendance
    BEFORE UPDATE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 12. HELPER FUNCTIONS: resolve_entity_id
-- Resolve entity_id to its final canonical (depth max=1) if merged.
-- Avoids recursive CTE and multiple DB queries.
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_entity_id(entity_type TEXT, entity_id UUID)
RETURNS UUID AS $$
DECLARE
    resolved_id UUID;
BEGIN
    IF entity_type = 'PERSON' THEN
        SELECT COALESCE(merged_into_id, id) INTO resolved_id FROM attendee_profiles WHERE id = entity_id;
    ELSIF entity_type = 'ORGANIZATION' THEN
        SELECT COALESCE(merged_into_id, id) INTO resolved_id FROM organizations WHERE id = entity_id;
    ELSIF entity_type = 'EVENT' THEN
        SELECT COALESCE(merged_into_id, id) INTO resolved_id FROM events WHERE id = entity_id;
    ELSE
        RETURN entity_id;
    END IF;
    RETURN COALESCE(resolved_id, entity_id);
END;
$$ LANGUAGE plpgsql STABLE;
