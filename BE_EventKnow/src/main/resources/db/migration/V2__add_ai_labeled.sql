-- ============================================================
-- SQL Migration V2: Add ai_labeled and Seed Master Domains
-- ============================================================

-- 1. Add ai_labeled column to attendee_profiles
ALTER TABLE attendee_profiles ADD COLUMN IF NOT EXISTS ai_labeled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create partial index for unprocessed profiles
CREATE INDEX IF NOT EXISTS idx_attendee_ai_labeled ON attendee_profiles (ai_labeled) WHERE ai_labeled = false;

-- 3. Seed new master domains
INSERT INTO research_domain_master (domain_code, domain_name_vi) VALUES
    ('MEDIA', 'Truyền thông & Giải trí số'),
    ('MARKETING', 'Công nghệ Tiếp thị (MarTech)'),
    ('FINTECH', 'Công nghệ Tài chính (FinTech)'),
    ('GOVTECH', 'Công nghệ Chính phủ (GovTech)'),
    ('EDTECH', 'Công nghệ Giáo dục (EdTech)')
ON CONFLICT (domain_code) DO NOTHING;
