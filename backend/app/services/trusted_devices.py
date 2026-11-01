"""
Trusted-device tokens (see models/trusted_device.py for the rationale).

Tokens are 256-bit random values; only their SHA-256 hash is stored, so a database leak does not
reveal usable tokens. They are revoked on MPIN change and by admin recovery, expire after
LOGIN_TRUSTED_DEVICE_DAYS without use, and at most LOGIN_MAX_TRUSTED_DEVICES stay active per account.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.trusted_device import TrustedDevice

MAX_TOKEN_LENGTH = 128


def _hash(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def find_active_device(db: Session, account_id: int, raw_token: Optional[str]) -> Optional[TrustedDevice]:
    """The account's active device for `raw_token`, or None (unknown, revoked, expired or another account's)."""
    if not raw_token or len(raw_token) > MAX_TOKEN_LENGTH:
        return None
    oldest_allowed_use = _utcnow() - timedelta(days=settings.LOGIN_TRUSTED_DEVICE_DAYS)
    return (
        db.query(TrustedDevice)
        .filter(
            TrustedDevice.account_id == account_id,
            TrustedDevice.token_hash == _hash(raw_token),
            TrustedDevice.revoked_at.is_(None),
            TrustedDevice.last_used_at >= oldest_allowed_use,
        )
        .first()
    )


def issue_device(db: Session, account_id: int) -> str:
    """Registers a new trusted device and returns its raw token. Caller commits."""
    now = _utcnow()
    raw_token = secrets.token_urlsafe(32)
    db.add(TrustedDevice(account_id=account_id, token_hash=_hash(raw_token), created_at=now, last_used_at=now))
    db.flush()

    active = (
        db.query(TrustedDevice)
        .filter(TrustedDevice.account_id == account_id, TrustedDevice.revoked_at.is_(None))
        .order_by(TrustedDevice.last_used_at.desc(), TrustedDevice.id.desc())
        .all()
    )
    for stale in active[settings.LOGIN_MAX_TRUSTED_DEVICES:]:
        stale.revoked_at = now
    return raw_token


def touch_device(device: TrustedDevice) -> None:
    device.last_used_at = _utcnow()


def revoke_all_devices(db: Session, account_id: int) -> int:
    """Revokes every active trusted device of the account. Caller commits. Returns the count."""
    return (
        db.query(TrustedDevice)
        .filter(TrustedDevice.account_id == account_id, TrustedDevice.revoked_at.is_(None))
        .update({TrustedDevice.revoked_at: _utcnow()}, synchronize_session=False)
    )
