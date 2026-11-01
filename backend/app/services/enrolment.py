"""
One-time trusted-device enrolment (recovery for a browser that is not yet trusted).

Threat model and guarantees:
- Codes are created only by scripts/admin_recovery.py (needs database credentials, which can already
  reset the MPIN), are 12 characters from a 32-symbol alphabet (60 bits, CSPRNG), expire after at most
  60 minutes, and only their SHA-256 hash is stored.
- A code never replaces the MPIN. It only lets the MPIN check for that one login bypass the anonymous
  account/client lockout buckets, exactly like an existing trusted device. Without the correct MPIN
  nothing is issued.
- Single use: the code row is locked (SELECT ... FOR UPDATE) for the whole check, marked used in the
  same transaction that registers the device, so concurrent or replayed requests cannot use it twice.
- A wrong MPIN counts against the code; after LOGIN_ENROLMENT_MAX_MPIN_ATTEMPTS it is burned.
- Success yields exactly what a normal MPIN login yields: one trusted device and one session.
"""
import hashlib
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.security import verify_mpin
from ..models.admin import AdminSettings
from ..models.enrolment_code import EnrolmentCode
from .login_throttle import InvalidMpin
from .trusted_devices import issue_device

CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # 32 symbols; no 0/O or 1/I confusion
CODE_LENGTH = 12


class InvalidEnrolmentCode(Exception):
    """Unknown, expired, already used, burned or revoked code (deliberately indistinguishable)."""


def normalise_code(raw_code: str) -> str:
    return "".join(ch for ch in (raw_code or "").upper() if ch.isalnum())


def hash_code(raw_code: str) -> str:
    return hashlib.sha256(normalise_code(raw_code).encode("utf-8")).hexdigest()


def enrol_with_code(db: Session, account: AdminSettings, raw_code: str, mpin: str) -> str:
    """
    Verifies the one-time code and the MPIN together. Returns a new trusted-device token and commits.
    Raises InvalidEnrolmentCode (nothing changed) or InvalidMpin (failure recorded on the code).
    """
    code = normalise_code(raw_code)
    if len(code) != CODE_LENGTH or any(ch not in CODE_ALPHABET for ch in code):
        raise InvalidEnrolmentCode()

    row = (
        db.query(EnrolmentCode)
        .filter(EnrolmentCode.account_id == account.id, EnrolmentCode.code_hash == hash_code(code))
        .with_for_update()
        .populate_existing()
        .first()
    )
    now = datetime.now(timezone.utc)
    if row is None or row.used_at is not None or row.revoked_at is not None or row.expires_at <= now:
        db.rollback()
        raise InvalidEnrolmentCode()

    if not (account.hashed_mpin and verify_mpin(mpin, account.hashed_mpin)):
        row.failed_attempts += 1
        if row.failed_attempts >= settings.LOGIN_ENROLMENT_MAX_MPIN_ATTEMPTS:
            row.revoked_at = now
        db.commit()
        raise InvalidMpin()

    row.used_at = now
    device_token = issue_device(db, account.id)
    db.commit()
    return device_token


def revoke_pending_codes(db: Session, account_id: int) -> int:
    """Revokes every unused enrolment code of the account. Caller commits."""
    return (
        db.query(EnrolmentCode)
        .filter(EnrolmentCode.account_id == account_id, EnrolmentCode.used_at.is_(None), EnrolmentCode.revoked_at.is_(None))
        .update({EnrolmentCode.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False)
    )
