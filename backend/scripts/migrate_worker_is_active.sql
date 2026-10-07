-- ==============================================================================
-- Attendly — Worker Active Status Migration Script
-- Adds is_active column to workers table with default TRUE
-- ==============================================================================

BEGIN;

-- 1. Add is_active column if not exists (default TRUE)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Backfill existing records to TRUE
UPDATE workers SET is_active = TRUE WHERE is_active IS NULL;

-- 3. Enforce NOT NULL constraint
ALTER TABLE workers ALTER COLUMN is_active SET NOT NULL;

-- 4. Create index on is_active for query performance
CREATE INDEX IF NOT EXISTS ix_workers_is_active ON workers (is_active);

COMMIT;
