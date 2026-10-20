-- ==============================================================================
-- Attendly — Worker Wage History Migration Script
-- Creates worker_wage_history table with effective-dated rates
-- Backfills initial baseline wage records from existing workers' daily_wage
-- ==============================================================================

BEGIN;

-- 1. Create worker_wage_history table if it does not already exist
CREATE TABLE IF NOT EXISTS worker_wage_history (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES admin_settings(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    daily_wage NUMERIC(10, 2) NOT NULL,
    effective_from DATE NOT NULL,
    created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'UTC'),
    CONSTRAINT uq_worker_wage_effective_from UNIQUE (worker_id, effective_from)
);

-- 2. Indexes for query optimization and tenant isolation
CREATE INDEX IF NOT EXISTS ix_worker_wage_history_account_id ON worker_wage_history(account_id);
CREATE INDEX IF NOT EXISTS ix_worker_wage_history_worker_id ON worker_wage_history(worker_id);
CREATE INDEX IF NOT EXISTS ix_worker_wage_history_effective_from ON worker_wage_history(effective_from);
CREATE INDEX IF NOT EXISTS ix_worker_wage_lookup ON worker_wage_history(account_id, worker_id, effective_from);

-- 3. Safe Backfill: Backfill existing workers with their existing daily wage rate
-- Effective date is established as the earliest between:
--   a) Earliest recorded attendance date for the worker,
--   b) Worker record creation date,
--   c) Current date (fallback)
-- Note on limitation: Historical wage changes that occurred prior to tracking cannot
-- be recovered from the database. Each worker's current daily_wage is backfilled from
-- their earliest attendance or creation date.
INSERT INTO worker_wage_history (account_id, worker_id, daily_wage, effective_from, created_at, updated_at)
SELECT
    w.account_id,
    w.id AS worker_id,
    w.daily_wage,
    COALESCE(
        (SELECT MIN(a.date) FROM attendance a WHERE a.worker_id = w.id),
        w.created_at::DATE,
        CURRENT_DATE
    ) AS effective_from,
    COALESCE(w.created_at, NOW() AT TIME ZONE 'UTC') AS created_at,
    COALESCE(w.updated_at, NOW() AT TIME ZONE 'UTC') AS updated_at
FROM workers w
ON CONFLICT (worker_id, effective_from) DO NOTHING;

COMMIT;
