"""
Persistent MPIN brute-force protection with escalating lockouts.

Buckets (one LoginAttempt row per account and scope):
- "account": every failure on the account, from any client. This is the hard brute-force bound and
  does not depend on the client IP being trustworthy.
- "client:<hmac of IP>": failures from one client, so a single noisy client is stopped early without
  waiting for the account bucket.

Escalation (per bucket, all values configurable in Settings):
- First lockout after LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS (account) / LOGIN_MAX_FAILED_ATTEMPTS (client)
  failures, lasting LOGIN_LOCKOUT_MINUTES.
- After that, every LOGIN_ESCALATED_MAX_FAILED_ATTEMPTS further failures cause another lockout of
  double the previous duration, capped at LOGIN_MAX_LOCKOUT_MINUTES.
- Escalation resets only after LOGIN_LOCKOUT_RESET_HOURS with no failures and no active lockout.
  A successful login clears the failure count but NOT the escalation level, so an attacker's
  accumulated escalation cannot be wiped by the owner's (or anyone's) single success.
- While a lockout is active the MPIN is not checked at all, so a correct guess cannot be confirmed,
  and attempts made during a lockout are not counted.

Concurrency: both rows are upserted and then locked with SELECT ... FOR UPDATE (ordered by id, so
concurrent transactions acquire locks in the same order) for the duration of the bcrypt check, so
attempts from any number of serverless instances are serialised and cannot exceed the limits.
"""
import hashlib
import hmac
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import verify_mpin
from ..models.admin import AdminSettings
from ..models.login_attempt import LoginAttempt

ACCOUNT_SCOPE = "account"
_STALE_CLIENT_ROW_AGE = timedelta(days=1)


class InvalidMpin(Exception):
    """The supplied MPIN did not match."""


@dataclass
class LoginLocked(Exception):
    """Too many failed attempts; retry after the given number of seconds."""
    retry_after_seconds: int


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def client_scope(client_ip: Optional[str]) -> str:
    raw = (client_ip or "unknown").strip().lower()
    digest = hmac.new(settings.SECRET_KEY.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
    return f"client:{digest}"


def lockout_duration(level: int) -> timedelta:
    """Duration of the `level`-th consecutive lockout (1-based): base, 2x base, 4x base ... capped."""
    minutes = settings.LOGIN_LOCKOUT_MINUTES * (2 ** max(0, level - 1))
    return timedelta(minutes=min(minutes, settings.LOGIN_MAX_LOCKOUT_MINUTES))


def _first_limit(scope: str) -> int:
    return settings.LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS if scope == ACCOUNT_SCOPE else settings.LOGIN_MAX_FAILED_ATTEMPTS


def _lock_counter_rows(db: Session, account_id: int, scopes: List[str]) -> Dict[str, LoginAttempt]:
    for scope in scopes:
        db.execute(
            pg_insert(LoginAttempt)
            .values(account_id=account_id, scope=scope, failed_count=0, lockout_level=0)
            .on_conflict_do_nothing(constraint="uq_login_attempt_account_scope")
        )
    rows = (
        db.query(LoginAttempt)
        .filter(LoginAttempt.account_id == account_id, LoginAttempt.scope.in_(scopes))
        .order_by(LoginAttempt.id.asc())
        .with_for_update()
        .populate_existing()
        .all()
    )
    return {row.scope: row for row in rows}


def _seconds_until(moment: datetime, now: datetime) -> int:
    return max(1, math.ceil((moment - now).total_seconds()))


def _is_locked(row: LoginAttempt, now: datetime) -> bool:
    return row.locked_until is not None and row.locked_until > now


def _decay(row: LoginAttempt, now: datetime) -> None:
    """Resets a bucket that has been quiet (no failure, no lockout) for the whole reset window."""
    activity = [t for t in (row.last_failed_at, row.locked_until) if t is not None]
    if activity and now - max(activity) >= timedelta(hours=settings.LOGIN_LOCKOUT_RESET_HOURS):
        row.failed_count = 0
        row.lockout_level = 0
        row.locked_until = None


def _record_failure(row: LoginAttempt, now: datetime) -> None:
    row.failed_count += 1
    row.last_failed_at = now
    limit = _first_limit(row.scope) if row.lockout_level == 0 else settings.LOGIN_ESCALATED_MAX_FAILED_ATTEMPTS
    if row.failed_count >= limit:
        row.lockout_level += 1
        row.locked_until = now + lockout_duration(row.lockout_level)
        row.failed_count = 0


def _check(db: Session, account: AdminSettings, mpin: str, scopes: List[str], now: datetime) -> Tuple[bool, Dict[str, LoginAttempt]]:
    rows = _lock_counter_rows(db, account.id, scopes)
    for row in rows.values():
        _decay(row, now)

    active_locks = [row.locked_until for row in rows.values() if _is_locked(row, now)]
    if active_locks:
        db.commit()
        raise LoginLocked(retry_after_seconds=_seconds_until(max(active_locks), now))

    return bool(account.hashed_mpin and verify_mpin(mpin, account.hashed_mpin)), rows


def verify_mpin_with_throttle(db: Session, account: AdminSettings, mpin: str, client_ip: Optional[str]) -> None:
    """
    Verifies `mpin` for `account` under brute-force protection and commits the counter changes.

    Returns normally on success. Raises LoginLocked while a lockout is active, or InvalidMpin on a
    wrong MPIN (after recording the failure).
    """
    now = _utcnow()
    own_scope = client_scope(client_ip)
    ok, rows = _check(db, account, mpin, [ACCOUNT_SCOPE, own_scope], now)

    if ok:
        for row in rows.values():
            row.failed_count = 0  # escalation level is kept on purpose (see module docstring)
        db.query(LoginAttempt).filter(
            LoginAttempt.account_id == account.id,
            LoginAttempt.scope.like("client:%"),
            LoginAttempt.lockout_level == 0,
            LoginAttempt.last_failed_at < now - _STALE_CLIENT_ROW_AGE,
        ).delete(synchronize_session=False)
        db.commit()
        return

    for row in rows.values():
        _record_failure(row, now)
    db.commit()
    raise InvalidMpin()
