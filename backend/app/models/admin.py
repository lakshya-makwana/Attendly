from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from ..core.database import Base

class AdminSettings(Base):
    __tablename__ = "admin_settings"

    id = Column(Integer, primary_key=True, index=True)
    hashed_mpin = Column(String(255), nullable=False)
    app_title = Column(String(100), default="Attendly")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
