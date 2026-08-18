-- ============================================================
-- SQL Migration V3: Add last_retried_at to extraction_jobs
-- ============================================================

ALTER TABLE extraction_jobs ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMP;
