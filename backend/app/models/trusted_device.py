from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from ..core.database import Base


class TrustedDevice(Base):
    """
    A browser/device that has successfully logged in with the MPIN.

    The device keeps a random token (only its SHA-256 hash is stored). Logins presenting a valid token
    are throttled in that device's own bucket instead of the anonymous account-wide bucket, so an
    attacker who keeps the account bucket locked cannot lock the owner out of their known devices.
    A token can only be obtained by entering the correct MPIN, so anonymous brute-force bounds are unchanged.
    """
    __tablename__ = "auth_trusted_devices"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
