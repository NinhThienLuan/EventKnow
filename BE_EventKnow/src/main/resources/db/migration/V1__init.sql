-- ============================================================
-- EVENTKNOW DATABASE SCHEMA v1.2 (Unified Flyway Initializer)
-- PostgreSQL 15+ (JSONB support required)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 0. DEPARTMENT_FOLDER_MAPPING
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
-- ============================================================
CREATE TABLE app_admins (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL UNIQUE,
    granted_by_email       VARCHAR(255),
    granted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at             TIMESTAMPTZ,
    revoked_by_email        VARCHAR(255)
);

CREATE INDEX idx_app_admins_email ON app_admins (email) WHERE revoked_at IS NULL;

-- ============================================================
-- 0c. USER_DRIVE_CONNECTIONS
-- ============================================================
CREATE TABLE user_drive_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_encrypted TEXT NOT NULL,
    granted_scopes         TEXT[] NOT NULL DEFAULT '{drive.file}',
    connected_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at              TIMESTAMPTZ
);

CREATE INDEX idx_drive_connections_email ON user_drive_connections (email) WHERE revoked_at IS NULL;

-- ============================================================
-- 0d. RESEARCH_DOMAIN_MASTER
-- ============================================================
CREATE TABLE research_domain_master (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_code          VARCHAR(30) NOT NULL UNIQUE,
    domain_name_vi        VARCHAR(100) NOT NULL,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO research_domain_master (domain_code, domain_name_vi) VALUES
    ('AGRITECH', 'Nông nghiệp Công nghệ cao'),
    ('MEDTECH', 'Công nghệ Y tế'),
    ('AI_ML', 'Trí tuệ nhân tạo / Máy học'),
    ('GREENTECH', 'Công nghệ Xanh'),
    ('VAT_LIEU_MOI', 'Vật liệu mới'),
    ('KHAC', 'Khác — chưa phân loại')
    ON CONFLICT (domain_code) DO NOTHING;

-- ============================================================
-- 0b. EVENTS (canonical entity)
-- ============================================================
CREATE TABLE events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name           VARCHAR(255) NOT NULL,
    event_date            DATE,
    department            VARCHAR(255),
    topic_tags            TEXT[] DEFAULT '{}',
    merged_from_ids         UUID[],
    is_active             BOOLEAN NOT NULL DEFAULT true,
    merged_into_id          UUID REFERENCES events(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_name ON events (event_name);
CREATE INDEX idx_events_name_trgm ON events USING GIN (event_name gin_trgm_ops);
CREATE INDEX idx_events_date ON events (event_date);
CREATE INDEX idx_events_department ON events (department);
CREATE INDEX idx_events_topic_tags ON events USING GIN (topic_tags);

-- ============================================================
-- 1. RAW_EVENTS
-- ============================================================
CREATE TABLE raw_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id             UUID REFERENCES events(id),
    event_name          VARCHAR(255) NOT NULL,
    event_date          DATE,
    department          VARCHAR(255),
    source_type         VARCHAR(20) NOT NULL CHECK (source_type IN ('EXCEL', 'GOOGLE_FORM', 'SCAN_OCR')),
    source_file_name    VARCHAR(500) NOT NULL,
    google_drive_file_id VARCHAR(255),
    drive_folder_path    TEXT,
    drive_owner_email   VARCHAR(255),
    sheet_name          VARCHAR(255),
    raw_header_map      JSONB,
    drive_modified_time  TIMESTAMPTZ,
    last_synced_at       TIMESTAMPTZ,
    ingestion_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (ingestion_status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
    row_count            INT DEFAULT 0,
    error_message        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_events_drive_file ON raw_events (google_drive_file_id);
CREATE INDEX idx_raw_events_date ON raw_events (event_date);
CREATE INDEX idx_raw_events_department ON raw_events (department);
CREATE INDEX idx_raw_events_event_id ON raw_events (event_id);

-- ============================================================
-- 2. EXTRACTION_JOBS
-- ============================================================
CREATE TABLE extraction_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_event_id         UUID NOT NULL REFERENCES raw_events(id) ON DELETE CASCADE,
    batch_index          INT NOT NULL,
    row_start            INT NOT NULL,
    row_end              INT NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED', 'RETRYING')),
    retry_count           INT NOT NULL DEFAULT 0,
    last_error            TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ,
    raw_header_cols      TEXT,
    raw_rows_content     TEXT,
    source_sheet_name    VARCHAR(255)
);

CREATE INDEX idx_extraction_jobs_event ON extraction_jobs (raw_event_id);
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs (status);

-- ============================================================
-- 3. ACADEMIC_TITLE_ALIAS
-- ============================================================
CREATE TABLE academic_title_alias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_alias            VARCHAR(100) NOT NULL UNIQUE,
    normalized_tag        VARCHAR(20) NOT NULL
                            CHECK (normalized_tag IN ('GS', 'PGS', 'TS', 'ThS', 'CN', 'KS', 'Khac')),
    priority_rank         INT NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
-- ============================================================
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name             VARCHAR(500) NOT NULL,
    normalized_name       VARCHAR(500) NOT NULL,
    email_domain          VARCHAR(255),
    dynamic_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    merged_from_ids        UUID[],
    is_active             BOOLEAN NOT NULL DEFAULT true,
    merged_into_id          UUID REFERENCES organizations(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_normalized_name ON organizations (normalized_name);
CREATE INDEX idx_org_normalized_name_trgm ON organizations USING GIN (normalized_name gin_trgm_ops);
CREATE INDEX idx_org_email_domain ON organizations (email_domain);
CREATE INDEX idx_org_dynamic_attrs ON organizations USING GIN (dynamic_attributes);

-- ============================================================
-- 5. ATTENDEE_PROFILES
-- ============================================================
CREATE TABLE attendee_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name           VARCHAR(255) NOT NULL,
    normalized_name      VARCHAR(255) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(50),

    academic_title_raw          VARCHAR(100),
    academic_title_normalized    VARCHAR(20)[] DEFAULT '{}',

    attendee_role        VARCHAR(20) CHECK (attendee_role IN ('SPEAKER', 'EXPERT', 'GUEST', 'SPONSOR')),

    position             VARCHAR(255),
    organization_id       UUID REFERENCES organizations(id),
    organization_text_raw  VARCHAR(500),

    research_fields_raw     TEXT[] DEFAULT '{}',
    research_domains        VARCHAR(30)[] DEFAULT '{}',
    expertise_tags          TEXT[] DEFAULT '{}',

    follow_up_status      VARCHAR(20) NOT NULL DEFAULT 'CHUA_LIEN_HE'
                            CHECK (follow_up_status IN ('CHUA_LIEN_HE', 'DA_LIEN_HE', 'TU_CHOI')),

    dynamic_attributes    JSONB NOT NULL DEFAULT '{}'::jsonb,
    merged_from_ids        UUID[],
    is_active             BOOLEAN NOT NULL DEFAULT true,
    merged_into_id          UUID REFERENCES attendee_profiles(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_attendee_email UNIQUE (email)
);

CREATE INDEX idx_attendee_normalized_name ON attendee_profiles (normalized_name);
CREATE INDEX idx_attendee_normalized_name_trgm ON attendee_profiles USING GIN (normalized_name gin_trgm_ops);
CREATE INDEX idx_attendee_academic_title_norm ON attendee_profiles USING GIN (academic_title_normalized);
CREATE INDEX idx_attendee_role ON attendee_profiles (attendee_role);
CREATE INDEX idx_attendee_org ON attendee_profiles (organization_id);
CREATE INDEX idx_attendee_dynamic_attrs ON attendee_profiles USING GIN (dynamic_attributes);
CREATE INDEX idx_attendee_research_domains ON attendee_profiles USING GIN (research_domains);
CREATE INDEX idx_attendee_expertise_tags ON attendee_profiles USING GIN (expertise_tags);

-- ============================================================
-- 5b. IDENTITY_MERGE_LOG
-- ============================================================
CREATE TABLE identity_merge_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_profile_id     UUID,
    target_org_id          UUID,
    target_event_id        UUID,
    merged_entity_snapshot JSONB NOT NULL,
    merged_by_email        VARCHAR(255) NOT NULL,
    merged_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    split_at               TIMESTAMPTZ,
    split_by_email          VARCHAR(255)
);

CREATE INDEX idx_merge_log_target_profile ON identity_merge_log (target_profile_id);
CREATE INDEX idx_merge_log_target_org ON identity_merge_log (target_org_id);
CREATE INDEX idx_merge_log_target_event ON identity_merge_log (target_event_id);

-- ============================================================
-- 6. EVENT_ATTENDANCE
-- ============================================================
CREATE TABLE event_attendance (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_event_id         UUID NOT NULL REFERENCES raw_events(id) ON DELETE CASCADE,
    attendee_profile_id   UUID REFERENCES attendee_profiles(id) ON DELETE CASCADE,
    organization_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_attendance_has_entity CHECK (attendee_profile_id IS NOT NULL OR organization_id IS NOT NULL),

    source_row_number     INT,
    attendance_status     VARCHAR(20) DEFAULT 'CONFIRMED'
                            CHECK (attendance_status IN ('CONFIRMED', 'ATTENDED', 'ABSENT', 'CANCELLED')),
    snapshot_data         JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_deleted_in_source    BOOLEAN NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_event ON event_attendance (raw_event_id);
CREATE INDEX idx_attendance_profile ON event_attendance (attendee_profile_id);
CREATE INDEX idx_attendance_org ON event_attendance (organization_id);
CREATE INDEX idx_attendance_snapshot ON event_attendance USING GIN (snapshot_data);
CREATE INDEX idx_attendance_not_deleted ON event_attendance (is_deleted_in_source) WHERE is_deleted_in_source = false;

-- ============================================================
-- 10. ATTENDEE_NOTES
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
    created_by_email        VARCHAR(255) NOT NULL,
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

CREATE TRIGGER set_updated_at_raw_events
    BEFORE UPDATE ON raw_events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_attendee_profiles
    BEFORE UPDATE ON attendee_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_event_attendance
    BEFORE UPDATE ON event_attendance
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- 12. HELPER FUNCTIONS: resolve_entity_id
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_entity_id(p_entity_type TEXT, p_id UUID)
RETURNS UUID AS $$
DECLARE
    resolved UUID;
BEGIN
    IF p_id IS NULL THEN
        RETURN NULL;
    END IF;

    CASE p_entity_type
        WHEN 'PERSON' THEN
            SELECT COALESCE(merged_into_id, id) INTO resolved
            FROM attendee_profiles WHERE id = p_id;
        WHEN 'ORGANIZATION' THEN
            SELECT COALESCE(merged_into_id, id) INTO resolved
            FROM organizations WHERE id = p_id;
        WHEN 'EVENT' THEN
            SELECT COALESCE(merged_into_id, id) INTO resolved
            FROM events WHERE id = p_id;
        ELSE
            RAISE EXCEPTION 'resolve_entity_id: unknown entity_type %', p_entity_type;
    END CASE;

    RETURN COALESCE(resolved, p_id);
END;
$$ LANGUAGE plpgsql STABLE;
