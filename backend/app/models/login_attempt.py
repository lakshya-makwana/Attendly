from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from ..core.database import Base


class LoginAttempt(Base):
    """
    Persistent MPIN failure counters used for brute-force protection.

    One row per (account, scope):
    - scope == "account": account-wide counter across all clients.
    - scope == "client:<hmac>": counter for one client (keyed by an HMAC of its IP; raw IPs are not stored).
    Rows are locked with SELECT ... FOR UPDATE during a login attempt so concurrent
    requests are serialised and cannot exceed the limit.
    """
    __tablename__ = "auth_login_attempts"

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False)
    scope = Column(String(80), nullable=False)
    failed_count = Column(Integer, nullable=False, default=0, server_default="0")
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_failed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("account_id", "scope", name="uq_login_attempt_account_scope"),
    )
