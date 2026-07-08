BEGIN;

-- Ensure pg_trgm extension is available
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN trigram index on skills.normalized_name (idempotent)
CREATE INDEX IF NOT EXISTS skills_normalized_name_trgm_idx
ON skills
USING gin (normalized_name gin_trgm_ops);

COMMIT;
