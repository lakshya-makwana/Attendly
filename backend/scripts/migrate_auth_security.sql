-- ==============================================================================
-- Attendly — Authentication security migration
--
-- Idempotent and additive: every statement can be re-run safely and nothing is
-- dropped or rewritten. Older application versions ignore these objects, so the
-- migration must be applied BEFORE deploying the code that needs it.
--
-- Apply with psql (one transaction, stop on first error):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f backend/scripts/migrate_auth_security.sql
-- or with the runner, which also verifies the result:
--   python backend/scripts/migrate_auth_security.py --confirm-host <database host>
--
-- No BEGIN/COMMIT here: psql --single-transaction and the runner supply the transaction.
-- ==============================================================================

-- 1. Persistent MPIN brute-force counters (one row per account and scope).
CREATE TABLE IF NOT EXISTS auth_login_attempts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES admin_settings(id) ON DELETE CASCADE,
    scope VARCHAR(80) NOT NULL,
    failed_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_login_attempt_account_scope UNIQUE (account_id, scope)
);

-- 2. Session revocation cut-off. Tokens issued before this moment are rejected.
--    NULL (the value for every existing account) revokes nothing, so current sessions stay valid.
--    REQUIRED before deploying: the application selects this column on every authenticated request.
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMP WITH TIME ZONE;
