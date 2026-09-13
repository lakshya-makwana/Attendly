from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..core.database import Base

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    daily_wage = Column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    attendances = relationship("Attendance", back_populates="worker", cascade="all, delete-orphan")
    advances = relationship("Advance", back_populates="worker", cascade="all, delete-orphan")
