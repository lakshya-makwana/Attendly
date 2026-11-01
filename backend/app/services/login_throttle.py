"""
Persistent MPIN brute-force protection.

Policy (configurable in Settings):
- A client (identified by an HMAC of its IP address) is locked out for LOGIN_LOCKOUT_MINUTES after
  LOGIN_MAX_FAILED_ATTEMPTS consecutive failures. One noisy client therefore cannot lock out the owner
  on another device (mitigates trivial denial of service).
- The whole account is locked out after LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS consecutive failures across
  all clients. This is the hard brute-force bound and does not depend on the client IP being trustworthy.
- A successful verification resets the account counter and the caller's client counter.
- When a lockout expires, that counter starts again from zero.
- While a lockout is active the MPIN is not checked at all, so a correct guess cannot be confirmed.

Concurrency: both counter rows are upserted and then locked with SELECT ... FOR UPDATE (ordered by id,
so concurrent transactions acquire locks in the same order) for the duration of the bcrypt check.
Concurrent attempts against one account are serialised and cannot exceed the limits.
"""
import hashlib
import hmac
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

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


def _lock_counter_rows(db: Session, account_id: int, scopes: list) -> Dict[str, LoginAttempt]:
    for scope in scopes:
        db.execute(
            pg_insert(LoginAttempt)
            .values(account_id=account_id, scope=scope, failed_count=0)
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


def verify_mpin_with_throttle(db: Session, account: AdminSettings, mpin: str, client_ip: Optional[str]) -> None:
    """
    Verifies `mpin` for `account` under brute-force protection and commits the counter changes.

    Returns normally on success. Raises LoginLocked while a lockout is active, or InvalidMpin on a
    wrong MPIN (after recording the failure).
    """
    now = _utcnow()
    own_scope = client_scope(client_ip)
    rows = _lock_counter_rows(db, account.id, [ACCOUNT_SCOPE, own_scope])
    account_row, client_row = rows[ACCOUNT_SCOPE], rows[own_scope]

    for row in (account_row, client_row):
        if row.locked_until is not None and row.locked_until <= now:
            row.locked_until = None
            row.failed_count = 0

    active_locks = [row.locked_until for row in (account_row, client_row) if row.locked_until is not None]
    if active_locks:
        db.commit()
        raise LoginLocked(retry_after_seconds=_seconds_until(max(active_locks), now))

    if account.hashed_mpin and verify_mpin(mpin, account.hashed_mpin):
        account_row.failed_count = 0
        db.delete(client_row)
        db.query(LoginAttempt).filter(
            LoginAttempt.account_id == account.id,
            LoginAttempt.scope != ACCOUNT_SCOPE,
            LoginAttempt.locked_until.is_(None),
            LoginAttempt.last_failed_at < now - _STALE_CLIENT_ROW_AGE,
        ).delete(synchronize_session=False)
        db.commit()
        return

    lockout_end = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    for row, limit in (
        (client_row, settings.LOGIN_MAX_FAILED_ATTEMPTS),
        (account_row, settings.LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS),
    ):
        row.failed_count += 1
        row.last_failed_at = now
        if row.failed_count >= limit:
            row.locked_until = lockout_end
    db.commit()
    raise InvalidMpin()
