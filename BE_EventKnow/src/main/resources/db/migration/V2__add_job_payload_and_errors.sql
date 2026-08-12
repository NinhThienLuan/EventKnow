-- ============================================================
-- ADD JOB PAYLOAD AND ERROR MESSAGE COLUMNS
-- Compatible with PostgreSQL and H2 databases.
-- ============================================================

ALTER TABLE extraction_jobs ADD COLUMN raw_header_cols TEXT;
ALTER TABLE extraction_jobs ADD COLUMN raw_rows_content TEXT;
ALTER TABLE extraction_jobs ADD COLUMN source_sheet_name VARCHAR(255);
ALTER TABLE raw_events ADD COLUMN error_message TEXT;
