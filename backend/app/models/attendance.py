from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint, Numeric
from sqlalchemy.orm import relationship
from ..core.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(Date, nullable=False, index=True)
    work_units = Column(Numeric(3, 1), nullable=False, default=Decimal("1.0"))
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    worker = relationship("Worker", back_populates="attendances")
    site = relationship("Site", back_populates="attendances")

    __table_args__ = (
        UniqueConstraint("worker_id", "date", name="uq_worker_attendance_date"),
    )
