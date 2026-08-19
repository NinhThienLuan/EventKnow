-- Chuyển các nhãn tiếng Việt về chuẩn Enum
UPDATE attendee_profiles
SET research_domains = ARRAY(
    SELECT DISTINCT 
        CASE 
            WHEN val ILIKE '%công nghệ sinh học%' OR val ILIKE '%sinh học%' THEN 'BIOTECH'
            WHEN val ILIKE '%công nghệ%' THEN 'DIGITAL_TECH'
            WHEN val ILIKE '%y tế%' OR val ILIKE '%y te%' THEN 'MEDTECH'
            WHEN val ILIKE '%giáo dục%' OR val ILIKE '%giao duc%' THEN 'EDUTECH'
            WHEN val IS NULL OR val = '' THEN 'KHAC'
            ELSE val
        END
    FROM unnest(research_domains) AS val
)
WHERE ai_labeled = true;

-- Đảm bảo không còn profile nào có research_domains là NULL hoặc rỗng
UPDATE attendee_profiles
SET research_domains = ARRAY['KHAC']
WHERE ai_labeled = true AND (research_domains IS NULL OR cardinality(research_domains) = 0);
