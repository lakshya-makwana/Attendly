from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..core.database import Base

class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    attendances = relationship("Attendance", back_populates="site")
