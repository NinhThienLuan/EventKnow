-- Dọn dẹp dữ liệu trùng case-insensitive (giữ lại dòng có id nhỏ nhất/priority cao nhất)
DELETE FROM academic_title_alias a
WHERE a.id NOT IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(raw_alias) ORDER BY priority_rank DESC, created_at ASC) as rn
        FROM academic_title_alias
    ) sub
    WHERE sub.rn = 1
);

-- Thêm UNIQUE index đảm bảo không chèn trùng case-insensitive về sau
CREATE UNIQUE INDEX uq_academic_title_alias_raw_alias_lower ON academic_title_alias (LOWER(raw_alias));
