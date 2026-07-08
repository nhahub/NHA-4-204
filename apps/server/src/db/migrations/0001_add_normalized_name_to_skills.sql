BEGIN;

-- 1) Add nullable column first
ALTER TABLE skills ADD COLUMN normalized_name TEXT;

-- 2) Backfill normalized_name using regexp transformations:
--    remove digits, remove separators (., -, _, whitespace), strip other punctuation except # and +, then lower-case
UPDATE skills
SET normalized_name = lower(
    regexp_replace(
        regexp_replace(
            regexp_replace(name, '\\d+', '', 'g'),       -- drop digits
            '[._\\-\\s]+', '', 'g'),                     -- remove separators
        '[^A-Za-z0-9#+]+', '', 'g'                         -- remove anything except alnum, #, +
    )
);

-- 3) Handle common textual variants
UPDATE skills SET normalized_name = 'c#' WHERE lower(name) IN ('c#', 'csharp');
UPDATE skills SET normalized_name = 'c++' WHERE lower(name) IN ('c++', 'cpp');

-- 4) Ensure column is not null (all rows have been backfilled)
ALTER TABLE skills ALTER COLUMN normalized_name SET NOT NULL;

-- 5) Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_normalized_name ON skills(normalized_name);

COMMIT;
