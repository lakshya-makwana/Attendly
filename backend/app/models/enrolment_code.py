from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from ..core.database import Base


class EnrolmentCode(Base):
    """
    One-time recovery code that lets a NEW browser become a trusted device while the anonymous login
    buckets are locked (see services/enrolment.py). Generated only by scripts/admin_recovery.py, i.e.
    by someone with database credentials. The code never replaces the MPIN: enrolment still requires
    the correct MPIN. Only the SHA-256 hash of the code is stored.
    """
    __tablename__ = "auth_enrolment_codes"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    code_hash = Column(String(64), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    failed_attempts = Column(Integer, nullable=False, default=0, server_default="0")
