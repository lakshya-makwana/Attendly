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
    lockout_level INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_failed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_login_attempt_account_scope UNIQUE (account_id, scope)
);

-- 1b. Escalating lockouts. Only needed where the table was created by an earlier revision of this
--     work (e.g. create_all from commit 83dd89f); on a fresh database step 1 already includes it.
ALTER TABLE auth_login_attempts ADD COLUMN IF NOT EXISTS lockout_level INTEGER NOT NULL DEFAULT 0;

-- 2. Session epoch. Incrementing it revokes every session of the account.
--    Existing accounts get 0, which is also the epoch of every token issued before this column
--    existed, so current sessions stay valid until the first MPIN change or admin recovery.
--    REQUIRED before deploying: the application selects this column on every authenticated request.
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS session_epoch INTEGER NOT NULL DEFAULT 0;

-- 3. Trusted devices: logins from a known device use their own lockout bucket, so an attacker
--    keeping the anonymous account bucket locked cannot lock the owner out. Only SHA-256 hashes
--    of device tokens are stored.
CREATE TABLE IF NOT EXISTS auth_trusted_devices (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES admin_settings(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS ix_auth_trusted_devices_account_id ON auth_trusted_devices (account_id);
