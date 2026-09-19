-- ==============================================================================
-- Attendly — Multi-Account Migration Script
-- Enables Safe Multi-Tenant Isolation (Dad Account vs. Recruiter Demo Account)
-- ==============================================================================

BEGIN;

-- 1. Extend admin_settings to support multi-account roles and demo flag
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'admin';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admin_settings ALTER COLUMN hashed_mpin DROP NOT NULL;

-- Ensure existing dad account is marked non-demo admin
UPDATE admin_settings SET account_type = 'admin', is_demo = FALSE WHERE is_demo IS NULL OR id = 1;
ALTER TABLE admin_settings ALTER COLUMN account_type SET NOT NULL;
ALTER TABLE admin_settings ALTER COLUMN is_demo SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_admin_settings_is_demo ON admin_settings (is_demo);

-- 2. Add account_id to workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES admin_settings(id) ON DELETE CASCADE;
UPDATE workers SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE workers ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_workers_account_id ON workers (account_id);

-- 3. Add account_id to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES admin_settings(id) ON DELETE CASCADE;
UPDATE sites SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE sites ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_sites_account_id ON sites (account_id);

-- 4. Add account_id to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES admin_settings(id) ON DELETE CASCADE;
-- Backfill attendance account_id from owning worker if available, else 1
UPDATE attendance a SET account_id = COALESCE(w.account_id, 1) FROM workers w WHERE a.worker_id = w.id AND a.account_id IS NULL;
UPDATE attendance SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE attendance ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_attendance_account_id ON attendance (account_id);

-- 5. Add account_id to advances
ALTER TABLE advances ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES admin_settings(id) ON DELETE CASCADE;
-- Backfill advance account_id from owning worker if available, else 1
UPDATE advances adv SET account_id = COALESCE(w.account_id, 1) FROM workers w WHERE adv.worker_id = w.id AND adv.account_id IS NULL;
UPDATE advances SET account_id = 1 WHERE account_id IS NULL;
ALTER TABLE advances ALTER COLUMN account_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS ix_advances_account_id ON advances (account_id);

COMMIT;
