"""
Stage 2 security tests: configuration hardening, persistent MPIN lockout and session validation.

Run against the isolated test database only:
    TEST_DATABASE_URL=postgresql://localhost:5432/attendly_test venv/bin/python -m tests.test_auth_security
"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tests.test_db_guard import enforce_test_database
enforce_test_database()

from fastapi.testclient import TestClient
from jose import jwt

from app.main import app
from app.core import database
from app.core.config import ConfigurationError, Settings, _validate, settings
from app.core.security import create_access_token
from app.models.admin import AdminSettings
from app.models.login_attempt import LoginAttempt
from app.models.trusted_device import TrustedDevice
from app.services.trusted_devices import find_active_device, issue_device, revoke_all_devices
from app.services.login_throttle import (
    ACCOUNT_SCOPE, InvalidMpin, LoginLocked, client_scope, device_scope, verify_mpin_with_throttle,
)

TEST_ACCOUNT_TYPE = "test_throttle"
GOOD_MPIN = "4826"
BAD_MPIN = "1111"
client = TestClient(app)


def _fast_hash(mpin: str) -> str:
    # Low bcrypt cost keeps the suite fast; production hashing is unchanged.
    return bcrypt.hashpw(mpin.encode(), bcrypt.gensalt(rounds=4)).decode()


def _new_account() -> int:
    db = database.SessionLocal()
    try:
        acc = AdminSettings(hashed_mpin=_fast_hash(GOOD_MPIN), account_type=TEST_ACCOUNT_TYPE, is_demo=False)
        db.add(acc)
        db.commit()
        return acc.id
    finally:
        db.close()


def _attempt(account_id: int, mpin: str, ip: str) -> str:
    """Runs one throttled verification in its own session; returns 'ok', 'invalid' or 'locked'."""
    db = database.SessionLocal()
    try:
        account = db.get(AdminSettings, account_id)
        try:
            verify_mpin_with_throttle(db, account, mpin, ip)
            return "ok"
        except InvalidMpin:
            return "invalid"
        except LoginLocked:
            return "locked"
    finally:
        db.close()


def _row(account_id: int, scope: str):
    db = database.SessionLocal()
    try:
        return db.query(LoginAttempt).filter_by(account_id=account_id, scope=scope).first()
    finally:
        db.close()


def _expire_locks(account_id: int):
    db = database.SessionLocal()
    try:
        db.query(LoginAttempt).filter_by(account_id=account_id).update(
            {LoginAttempt.locked_until: datetime.now(timezone.utc) - timedelta(seconds=1)}
        )
        db.commit()
    finally:
        db.close()


def _legacy_token(account_id: int) -> str:
    """A token exactly as commit 89ccb34 (current production) issues them: no iat and no MPIN binding."""
    return jwt.encode(
        {"sub": str(account_id), "account_id": account_id, "is_demo": False, "role": "admin",
         "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )


def _cleanup():
    db = database.SessionLocal()
    try:
        db.query(AdminSettings).filter(AdminSettings.account_type == TEST_ACCOUNT_TYPE).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------- configuration

def test_config_hardening():
    local = "postgresql://localhost:5432/attendly_test"
    neon = "postgresql://u@ep-x.ap-southeast-1.aws.neon.tech/neondb"

    def raises(**kwargs):
        try:
            _validate(Settings(**kwargs))
        except ConfigurationError:
            return True
        return False

    assert raises(DATABASE_URL=local, ENVIRONMENT="production", JWT_SECRET=""), "production without secret must fail"
    assert raises(DATABASE_URL=local, ENVIRONMENT="production",
                  JWT_SECRET="super_secret_jwt_key_contractor_attendance_app_2026"), "known public secret must fail"
    assert raises(DATABASE_URL=None, ENVIRONMENT="production", JWT_SECRET="x" * 64), "missing DATABASE_URL must fail"
    assert raises(DATABASE_URL=neon, ENVIRONMENT="development", JWT_SECRET="x" * 64), "dev + Neon host must fail"
    assert raises(DATABASE_URL=local, ENVIRONMENT="development", JWT_SECRET="x" * 64, ADMIN_MPIN="12ab"), \
        "non-numeric ADMIN_MPIN must fail"
    assert not raises(DATABASE_URL=neon, ENVIRONMENT="production", JWT_SECRET="x" * 64), "valid production config"

    dev = Settings(DATABASE_URL=local, ENVIRONMENT="development", JWT_SECRET="")
    _validate(dev)
    assert dev.SECRET_KEY and len(dev.SECRET_KEY) == 64, "dev without secret gets a random per-process secret"
    assert Settings(DATABASE_URL=local, ENVIRONMENT="development").ADMIN_MPIN in (None, settings.ADMIN_MPIN)
    print("✔ Config: insecure/missing production config rejected; no default MPIN or secret.")


class _env:
    """Temporarily sets (value) or removes (None) environment variables."""
    def __init__(self, **values):
        self.values, self.saved = values, {}

    def __enter__(self):
        for key, value in self.values.items():
            self.saved[key] = os.environ.get(key)
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def __exit__(self, *exc):
        for key, value in self.saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def test_production_database_isolation():
    prod = "postgresql://u@ep-still-queen-a1b2c3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    preview_db = "postgresql://u@ep-other-preview-d4e5-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
    secret = "x" * 64

    def blocked(url, **env):
        base = {"VERCEL": None, "VERCEL_ENV": None, "ALLOW_REMOTE_DATABASE": None, "PRODUCTION_DATABASE_HOSTS": None}
        with _env(**{**base, **env}):
            try:
                _validate(Settings(DATABASE_URL=url, JWT_SECRET=secret, ENVIRONMENT=env.get("ENVIRONMENT", "development")))
            except ConfigurationError as e:
                return "production database" in str(e)
            return False

    assert blocked(prod, VERCEL="1", VERCEL_ENV="preview"), "Preview must never use the production database"
    assert blocked(prod, VERCEL="1", VERCEL_ENV="preview", ENVIRONMENT="production"), \
        "ENVIRONMENT=production leaking into Preview scope does not override VERCEL_ENV"
    assert blocked(prod, VERCEL="1", VERCEL_ENV="development"), "vercel dev must not use the production database"
    assert blocked(prod, VERCEL="1"), "missing VERCEL_ENV on Vercel fails closed"
    assert blocked(prod, ALLOW_REMOTE_DATABASE="true"), "ALLOW_REMOTE_DATABASE does not unlock the production database"
    assert blocked(preview_db, VERCEL="1", VERCEL_ENV="preview", PRODUCTION_DATABASE_HOSTS="ep-other-preview"), \
        "PRODUCTION_DATABASE_HOSTS extends the protected list"

    assert not blocked(prod, VERCEL="1", VERCEL_ENV="production"), "the production deployment uses the production database"
    assert not blocked(prod, ENVIRONMENT="production"), "explicit local production operation is allowed"
    assert not blocked(preview_db, VERCEL="1", VERCEL_ENV="preview"), "Preview may use its own separate Neon database"
    print("✔ Config: only the production deployment may use the production database (Preview, vercel dev, "
          "missing VERCEL_ENV and local dev are refused).")


# ---------------------------------------------------------------- lockout policy

def test_threshold_and_duration():
    acc = _new_account()
    ip = "10.0.0.1"
    results = [_attempt(acc, BAD_MPIN, ip) for _ in range(5)]
    assert results == ["invalid"] * 5, results
    row = _row(acc, client_scope(ip))
    assert row.lockout_level == 1 and row.failed_count == 0 and row.locked_until is not None
    remaining = (row.locked_until - datetime.now(timezone.utc)).total_seconds()
    assert 14 * 60 < remaining <= 15 * 60, f"lockout should last 15 minutes, got {remaining}s"

    assert _attempt(acc, GOOD_MPIN, ip) == "locked", "correct MPIN must not be accepted (or revealed) while locked"
    db = database.SessionLocal()
    try:
        verify_mpin_with_throttle(db, db.get(AdminSettings, acc), BAD_MPIN, ip)
    except LoginLocked as e:
        assert 14 * 60 < e.retry_after_seconds <= 15 * 60
    finally:
        db.close()
    row = _row(acc, client_scope(ip))
    assert row.failed_count == 0 and row.lockout_level == 1, "attempts during lockout are not counted further"
    print("✔ Lockout: 5 consecutive failures lock the client for 15 minutes; MPIN not checked while locked.")


def _lock_remaining_minutes(account_id: int, scope: str) -> float:
    row = _row(account_id, scope)
    return (row.locked_until - datetime.now(timezone.utc)).total_seconds() / 60


def test_expiry_and_reset():
    acc = _new_account()
    ip = "10.0.0.2"
    for _ in range(5):
        _attempt(acc, BAD_MPIN, ip)
    _expire_locks(acc)
    assert _attempt(acc, GOOD_MPIN, ip) == "ok", "expired lockout must allow login"
    row = _row(acc, client_scope(ip))
    assert row.failed_count == 0 and row.lockout_level == 1, "success clears the count but keeps the escalation level"
    assert _row(acc, ACCOUNT_SCOPE).failed_count == 0, "successful login resets the account counter"

    assert [_attempt(acc, BAD_MPIN, ip) for _ in range(2)] == ["invalid"] * 2
    assert _attempt(acc, GOOD_MPIN, ip) == "ok", "success between failures resets the count"
    assert [_attempt(acc, BAD_MPIN, ip) for _ in range(3)] == ["invalid"] * 3
    assert 29 < _lock_remaining_minutes(acc, client_scope(ip)) <= 30, "a success does not wipe escalation: next lock is 30 min"
    print("✔ Lockout: expiry re-enables login; success resets the count but not the escalation level.")


def test_escalation_and_cap():
    # A distributed attacker (new IP for every guess) against the account-wide bucket: the hard bound.
    acc = _new_account()
    ips = (f"10.8.{n // 250}.{n % 250}" for n in range(10_000))
    assert [_attempt(acc, BAD_MPIN, next(ips)) for _ in range(10)] == ["invalid"] * 10
    expected = [15, 30, 60, 120, 240, 480, 960, 1440, 1440]
    for level, minutes in enumerate(expected, start=1):
        if level > 1:
            _expire_locks(acc)
            assert [_attempt(acc, BAD_MPIN, next(ips)) for _ in range(3)] == ["invalid"] * 3, f"level {level}"
        row = _row(acc, ACCOUNT_SCOPE)
        assert row.lockout_level == level, (level, row.lockout_level)
        assert minutes - 1 < _lock_remaining_minutes(acc, ACCOUNT_SCOPE) <= minutes, (level, minutes)
        assert _attempt(acc, GOOD_MPIN, next(ips)) == "locked"
    print("✔ Lockout: account bucket escalates 15 → 30 → 60 … minutes after 3 further failures each, "
          "capped at 24 hours, regardless of client IP.")


def test_escalation_decay():
    acc = _new_account()
    ip = "10.0.0.4"
    for _ in range(5):
        _attempt(acc, BAD_MPIN, ip)

    def age_bucket(hours):
        db = database.SessionLocal()
        try:
            past = datetime.now(timezone.utc) - timedelta(hours=hours)
            db.query(LoginAttempt).filter_by(account_id=acc).update(
                {LoginAttempt.locked_until: past, LoginAttempt.last_failed_at: past})
            db.commit()
        finally:
            db.close()

    age_bucket(23)
    assert [_attempt(acc, BAD_MPIN, ip) for _ in range(3)] == ["invalid"] * 3
    assert _row(acc, client_scope(ip)).lockout_level == 2, "23 quiet hours are not enough to reset escalation"

    age_bucket(24.1)
    assert [_attempt(acc, BAD_MPIN, ip) for _ in range(4)] == ["invalid"] * 4
    row = _row(acc, client_scope(ip))
    assert row.lockout_level == 0 and row.failed_count == 4, "24 quiet hours reset escalation to the first-lock limit"
    print("✔ Lockout: escalation resets only after 24 hours with no failures and no lockout.")


def test_client_isolation_and_account_limit():
    acc = _new_account()
    for _ in range(5):
        _attempt(acc, BAD_MPIN, "10.0.1.1")
    assert _attempt(acc, BAD_MPIN, "10.0.1.1") == "locked"
    assert _attempt(acc, GOOD_MPIN, "10.0.1.2") == "ok", "a locked-out client must not lock out the owner elsewhere"

    acc2 = _new_account()
    for ip, n in (("10.0.2.1", 4), ("10.0.2.2", 4), ("10.0.2.3", 2)):
        for _ in range(n):
            assert _attempt(acc2, BAD_MPIN, ip) == "invalid"
    assert _row(acc2, ACCOUNT_SCOPE).locked_until is not None, "10 failures across clients lock the account"
    assert _attempt(acc2, GOOD_MPIN, "10.0.2.99") == "locked", "account-wide lock applies to every client"
    print("✔ Lockout: per-client lock does not affect other clients; account-wide limit caps distributed guessing.")


def test_accounts_isolated():
    a, b = _new_account(), _new_account()
    for _ in range(10):
        _attempt(a, BAD_MPIN, f"10.0.3.{_}")
    assert _attempt(a, GOOD_MPIN, "10.0.3.200") == "locked"
    assert _attempt(b, GOOD_MPIN, "10.0.3.200") == "ok", "lockouts never leak across accounts"
    print("✔ Lockout: different accounts are fully isolated.")


def test_concurrent_attempts():
    acc = _new_account()
    ip = "10.0.4.1"
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda _: _attempt(acc, BAD_MPIN, ip), range(12)))
    assert results.count("invalid") == 5 and results.count("locked") == 7, results
    row = _row(acc, client_scope(ip))
    assert row.lockout_level == 1 and row.failed_count == 0, "concurrent requests must not exceed the limit"

    acc2 = _new_account()
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = list(pool.map(lambda i: _attempt(acc2, BAD_MPIN, f"10.0.5.{i}"), range(14)))
    assert results.count("invalid") == 10 and results.count("locked") == 4, results
    print("✔ Lockout: 12 parallel attempts → exactly 5 checked; 14 parallel across IPs → exactly 10 checked.")


# ---------------------------------------------------------------- HTTP contract

def test_login_endpoint_contract():
    db = database.SessionLocal()
    admin = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(False)).order_by(AdminSettings.id).first()
    original_hash = admin.hashed_mpin
    admin.hashed_mpin = _fast_hash(GOOD_MPIN)
    db.commit()
    try:
        ok = client.post("/api/auth/login-mpin", json={"mpin": GOOD_MPIN})
        assert ok.status_code == 200 and set(ok.json()) == {"access_token", "token_type", "app_title", "is_demo", "device_token"}
        assert ok.json()["device_token"], "MPIN login issues a trusted-device token"
        for _ in range(5):
            r = client.post("/api/auth/login-mpin", json={"mpin": BAD_MPIN})
            assert r.status_code == 401 and r.json()["detail"] == "Incorrect MPIN. Please try again."
        locked = client.post("/api/auth/login-mpin", json={"mpin": GOOD_MPIN})
        assert locked.status_code == 429, locked.text
        assert 0 < int(locked.headers["retry-after"]) <= 900
        assert "Too many incorrect attempts" in locked.json()["detail"]
        print("✔ HTTP: 200 contract unchanged; 401 for wrong MPIN; 429 + Retry-After when locked.")
    finally:
        db.query(LoginAttempt).filter(LoginAttempt.account_id == admin.id).delete(synchronize_session=False)
        db.query(TrustedDevice).filter(TrustedDevice.account_id == admin.id).delete(synchronize_session=False)
        admin.hashed_mpin = original_hash
        db.commit()
        db.close()


# ---------------------------------------------------------------- sessions / JWT

def test_session_validation():
    acc = _new_account()
    me = lambda token: client.get("/api/auth/verify", headers={"Authorization": f"Bearer {token}"})
    claims = {"sub": str(acc), "account_id": acc, "is_demo": False}

    assert me(create_access_token(claims)).status_code == 200, "unbound token valid while nothing is revoked"
    assert me(_legacy_token(acc)).status_code == 200, "pre-deployment token stays valid until a revocation"

    no_exp = jwt.encode({**claims, "role": "admin"}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    assert me(no_exp).status_code == 401, "token without exp must be rejected"

    expired = create_access_token(claims, expires_delta=timedelta(seconds=-5))
    assert me(expired).status_code == 401

    legacy = create_access_token({"sub": "admin"})
    assert me(legacy).status_code == 401, "no implicit fallback to account 1"

    assert me(create_access_token({"sub": "999999", "account_id": 999999})).status_code == 401, \
        "token for a missing/deleted account must be rejected"

    forged = jwt.encode({**claims, "role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                        "not-the-secret", algorithm="HS256")
    assert me(forged).status_code == 401

    wrong_role = jwt.encode({**claims, "role": "viewer", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                            settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    assert me(wrong_role).status_code == 403

    # is_demo comes from the database, not the token claim
    db = database.SessionLocal()
    account = db.get(AdminSettings, acc)
    tampered_demo = create_access_token({**claims, "is_demo": True}, account=account)
    db.close()
    assert me(tampered_demo).json()["is_demo"] is False

    # MPIN change revokes every earlier session (bound, unbound and legacy) and issues a new one
    db = database.SessionLocal()
    old_token = create_access_token(claims, account=db.get(AdminSettings, acc))
    db.close()
    old_unbound, old_legacy = create_access_token(claims), _legacy_token(acc)
    other = _new_account()
    other_legacy = _legacy_token(other)
    r = client.post("/api/auth/change-mpin", json={"current_mpin": GOOD_MPIN, "new_mpin": "7391"},
                    headers={"Authorization": f"Bearer {old_token}"})
    assert r.status_code == 200 and r.json()["message"] == "MPIN updated successfully."
    assert me(old_token).status_code == 401, "MPIN-bound token issued before the change must be revoked"
    assert me(old_unbound).status_code == 401, "unbound token issued before the change must be revoked"
    assert me(old_legacy).status_code == 401, "legacy (pre-deployment) token must be revoked by an MPIN change"
    assert me(r.json()["access_token"]).status_code == 200, "token returned by change-mpin is valid"
    db = database.SessionLocal()
    fresh = create_access_token(claims, account=db.get(AdminSettings, acc))
    db.close()
    assert me(fresh).status_code == 200, "sessions issued after the change are valid"
    assert me(other_legacy).status_code == 200, "revocation is per account"

    bad = client.post("/api/auth/change-mpin", json={"current_mpin": BAD_MPIN, "new_mpin": "1234"},
                      headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert bad.status_code == 400 and bad.json()["detail"] == "Current MPIN is incorrect."
    print("✔ Sessions: exp required, forged/expired/orphaned tokens rejected, no account-1 fallback, "
          "MPIN change revokes all older sessions including pre-deployment tokens.")


def test_session_epoch_revocation_is_exact():
    from app.core.security import revoke_all_sessions
    acc = _new_account()
    me = lambda token: client.get("/api/auth/verify", headers={"Authorization": f"Bearer {token}"})
    claims = {"sub": str(acc), "account_id": acc, "is_demo": False}

    def issue():
        db = database.SessionLocal()
        try:
            return create_access_token(claims, account=db.get(AdminSettings, acc))
        finally:
            db.close()

    def revoke():
        db = database.SessionLocal()
        try:
            revoke_all_sessions(db.get(AdminSettings, acc))
            db.commit()
        finally:
            db.close()

    # Issue → revoke → issue in a tight loop: many iterations land in the same wall-clock second,
    # which a timestamp cut-off with whole-second iat cannot separate. The epoch must, every time.
    for i in range(25):
        before = issue()
        revoke()
        after = issue()
        assert me(before).status_code == 401, f"iteration {i}: token issued before revocation must be rejected"
        assert me(after).status_code == 200, f"iteration {i}: token issued after revocation must be accepted"

    db = database.SessionLocal()
    assert db.get(AdminSettings, acc).session_epoch == 25, "each revocation increments the epoch exactly once"
    db.close()

    for bad in ("25", True, 25.0, None):
        forged = jwt.encode({**claims, "role": "admin", "sep": bad, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                            settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        assert me(forged).status_code == 401, f"malformed epoch claim {bad!r} must be rejected"
    print("✔ Sessions: epoch revocation is exact (25 same-second issue/revoke/issue cycles), malformed epochs rejected.")


def _issue_device(account_id: int) -> str:
    db = database.SessionLocal()
    try:
        raw = issue_device(db, account_id)
        db.commit()
        return raw
    finally:
        db.close()


def _device_attempt(account_id: int, raw_token: str, mpin: str) -> str:
    """Like _attempt, but through the trusted-device path exactly as the login endpoint resolves it."""
    db = database.SessionLocal()
    try:
        device = find_active_device(db, account_id, raw_token)
        try:
            verify_mpin_with_throttle(db, db.get(AdminSettings, account_id), mpin, "10.7.7.7",
                                      device_id=device.id if device else None)
            return "ok" if device else "ok-anonymous"
        except InvalidMpin:
            return "invalid"
        except LoginLocked:
            return "locked"
    finally:
        db.close()


def _lock_account_bucket(account_id: int):
    for i in range(10):
        assert _attempt(account_id, BAD_MPIN, f"10.6.{account_id % 250}.{i}") == "invalid"
    assert _row(account_id, ACCOUNT_SCOPE).locked_until is not None


def test_trusted_device_resists_lockout_dos():
    acc = _new_account()
    device = _issue_device(acc)
    _lock_account_bucket(acc)
    assert _attempt(acc, GOOD_MPIN, "10.6.9.9") == "locked", "anonymous logins are locked out"
    assert _device_attempt(acc, device, GOOD_MPIN) == "ok", "the owner's trusted device still logs in"
    assert _row(acc, ACCOUNT_SCOPE).locked_until > datetime.now(timezone.utc), \
        "a trusted-device success must not unlock the anonymous bucket for the attacker"

    # The device bucket has its own escalating limit, so a stolen device token is still bounded.
    assert [_device_attempt(acc, device, BAD_MPIN) for _ in range(5)] == ["invalid"] * 5
    assert _device_attempt(acc, device, GOOD_MPIN) == "locked"
    assert _row(acc, device_scope(find_device_id(acc, device))).lockout_level == 1

    # Device failures never count towards the anonymous buckets.
    acc2 = _new_account()
    device2 = _issue_device(acc2)
    for _ in range(4):
        _device_attempt(acc2, device2, BAD_MPIN)
    assert _row(acc2, ACCOUNT_SCOPE) is None
    print("✔ Devices: a trusted device logs in while the anonymous account bucket is locked; "
          "device buckets are separately bounded.")


def find_device_id(account_id: int, raw_token: str) -> int:
    db = database.SessionLocal()
    try:
        return find_active_device(db, account_id, raw_token).id
    finally:
        db.close()


def test_trusted_device_validity():
    acc, other = _new_account(), _new_account()
    device = _issue_device(acc)
    _lock_account_bucket(acc)
    assert _device_attempt(acc, "not-a-real-token", GOOD_MPIN) == "locked", "unknown token falls back to anonymous"
    assert _device_attempt(acc, "x" * 129, GOOD_MPIN) == "locked", "oversized token ignored"
    assert _device_attempt(other, device, GOOD_MPIN) == "ok-anonymous", "a device token only works for its own account"

    db = database.SessionLocal()
    db.query(TrustedDevice).filter_by(account_id=acc).update(
        {TrustedDevice.last_used_at: datetime.now(timezone.utc) - timedelta(days=91)})
    db.commit()
    db.close()
    assert _device_attempt(acc, device, GOOD_MPIN) == "locked", "a device unused for 90 days is no longer trusted"

    fresh = _issue_device(acc)
    db = database.SessionLocal()
    assert revoke_all_devices(db, acc) >= 1
    db.commit()
    db.close()
    assert _device_attempt(acc, fresh, GOOD_MPIN) == "locked", "a revoked device is no longer trusted"

    acc3 = _new_account()
    tokens = [_issue_device(acc3) for _ in range(12)]
    db = database.SessionLocal()
    active = db.query(TrustedDevice).filter(TrustedDevice.account_id == acc3, TrustedDevice.revoked_at.is_(None)).count()
    stored = {d.token_hash for d in db.query(TrustedDevice).filter_by(account_id=acc3)}
    db.close()
    assert active == 10, f"at most 10 active devices per account, got {active}"
    assert not (set(tokens) & stored), "raw device tokens are never stored"
    assert find_device_id(acc3, tokens[-1]) and _device_attempt(acc3, tokens[0], GOOD_MPIN) == "ok-anonymous", \
        "the oldest devices beyond the cap are revoked"
    print("✔ Devices: unknown, foreign, expired, revoked and over-cap tokens fall back to anonymous throttling; "
          "only hashes are stored.")


def test_trusted_device_http_flow():
    db = database.SessionLocal()
    admin = db.query(AdminSettings).filter(AdminSettings.is_demo.is_(False)).order_by(AdminSettings.id).first()
    original_hash = admin.hashed_mpin
    admin.hashed_mpin = _fast_hash(GOOD_MPIN)
    db.commit()
    try:
        first = client.post("/api/auth/login-mpin", json={"mpin": GOOD_MPIN})
        device = first.json()["device_token"]
        for i in range(10):  # distributed attacker: a different client address for every guess
            r = client.post("/api/auth/login-mpin", json={"mpin": BAD_MPIN}, headers={"X-Forwarded-For": f"203.0.113.{i}"})
            assert r.status_code == 401
        assert client.post("/api/auth/login-mpin", json={"mpin": GOOD_MPIN},
                           headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 429
        again = client.post("/api/auth/login-mpin", json={"mpin": GOOD_MPIN, "device_token": device},
                            headers={"X-Forwarded-For": "198.51.100.1"})
        assert again.status_code == 200 and again.json()["device_token"] == device, \
            "the owner's device logs in during the lockout and keeps its token"
        print("✔ HTTP: login returns a device token; with it the owner logs in while attackers keep the account locked.")
    finally:
        db.query(LoginAttempt).filter(LoginAttempt.account_id == admin.id).delete(synchronize_session=False)
        db.query(TrustedDevice).filter(TrustedDevice.account_id == admin.id).delete(synchronize_session=False)
        admin.hashed_mpin = original_hash
        db.commit()
        db.close()


def test_change_mpin_revokes_devices():
    acc = _new_account()
    old_device = _issue_device(acc)
    db = database.SessionLocal()
    token = create_access_token({"sub": str(acc), "account_id": acc, "is_demo": False}, account=db.get(AdminSettings, acc))
    db.close()
    r = client.post("/api/auth/change-mpin", json={"current_mpin": GOOD_MPIN, "new_mpin": "5820"},
                    headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200 and r.json()["device_token"]
    db = database.SessionLocal()
    try:
        assert find_active_device(db, acc, old_device) is None, "MPIN change revokes earlier trusted devices"
        assert find_active_device(db, acc, r.json()["device_token"]) is not None, "current device is re-trusted"
    finally:
        db.close()
    print("✔ Devices: MPIN change revokes every earlier trusted device and re-trusts the current one.")


def test_admin_recovery():
    from scripts import admin_recovery as rec
    acc = _new_account()
    device = _issue_device(acc)
    db = database.SessionLocal()
    token = create_access_token({"sub": str(acc), "account_id": acc, "is_demo": False}, account=db.get(AdminSettings, acc))
    db.close()
    me = lambda t: client.get("/api/auth/verify", headers={"Authorization": f"Bearer {t}"})
    _lock_account_bucket(acc)

    with database.engine.begin() as conn:
        info = rec.status(conn, acc)
    assert info["active_trusted_devices"] == 1 and any(b["active"] for b in info["buckets"])

    with database.engine.begin() as conn:
        assert rec.unlock(conn, acc) >= 1
    assert _attempt(acc, GOOD_MPIN, "10.5.0.1") == "ok", "unlock restores anonymous login immediately"
    assert me(token).status_code == 200, "unlock alone does not log anyone out"

    with database.engine.begin() as conn:
        assert rec.revoke_sessions(conn, acc) == 1
    assert me(token).status_code == 401, "revoke-sessions logs out every session"
    assert _device_attempt(acc, device, GOOD_MPIN) == "ok-anonymous", "revoke-sessions forgets trusted devices"

    _lock_account_bucket(acc)
    with database.engine.begin() as conn:
        rec.reset_mpin(conn, acc, "9051")
    assert _attempt(acc, GOOD_MPIN, "10.5.0.2") == "invalid", "old MPIN no longer works"
    assert _attempt(acc, "9051", "10.5.0.3") == "ok", "reset also clears lockouts and sets the new MPIN"
    for bad in ("12ab", "123", "1234567", ""):
        try:
            rec.validate_mpin(bad)
            raise AssertionError(f"{bad!r} accepted")
        except SystemExit:
            pass

    assert rec.main(["--confirm-host", "wrong.example", "status"]) == 2, "host confirmation is mandatory"
    print("✔ Recovery: status, unlock, revoke-sessions and reset-mpin work; host confirmation enforced.")


def test_demo_login_still_works():
    r = client.post("/api/auth/demo-login")
    assert r.status_code == 200 and r.json()["is_demo"] is True
    v = client.get("/api/auth/verify", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert v.status_code == 200 and v.json()["is_demo"] is True
    print("✔ Demo login unaffected.")


def run():
    print("\n=== Stage 2: Authentication & configuration security tests ===")
    tests = [
        test_config_hardening, test_production_database_isolation, test_threshold_and_duration, test_expiry_and_reset,
        test_escalation_and_cap, test_escalation_decay, test_client_isolation_and_account_limit, test_accounts_isolated, test_concurrent_attempts,
        test_login_endpoint_contract, test_session_validation, test_session_epoch_revocation_is_exact,
        test_trusted_device_resists_lockout_dos, test_trusted_device_validity, test_trusted_device_http_flow,
        test_change_mpin_revokes_devices, test_admin_recovery,
        test_demo_login_still_works,
    ]
    try:
        for t in tests:
            t()
    finally:
        _cleanup()
    print(f"\nALL {len(tests)} AUTH SECURITY TEST GROUPS PASSED\n")


if __name__ == "__main__":
    run()
