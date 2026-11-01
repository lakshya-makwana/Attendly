from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from ..core.database import Base

class AdminSettings(Base):
    __tablename__ = "admin_settings"

    id = Column(Integer, primary_key=True, index=True)
    account_type = Column(String(50), default="admin", nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False, index=True)
    hashed_mpin = Column(String(255), nullable=True)
    app_title = Column(String(100), default="Attendly")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    # Session generation. Incrementing it revokes every session token issued for this account
    # (MPIN change / admin recovery). Tokens carry the epoch they were issued under; tokens without one
    # (issued before this column existed) count as epoch 0, so they stay valid until the first revocation.
    session_epoch = Column(Integer, nullable=False, default=0, server_default="0")
