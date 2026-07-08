BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_skills_normalized_name_trgm
ON skills USING gin (normalized_name gin_trgm_ops);

COMMIT;
