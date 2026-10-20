from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, Integer, Numeric, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base

class WorkerWageHistory(Base):
    __tablename__ = "worker_wage_history"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("admin_settings.id", ondelete="CASCADE"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    daily_wage = Column(Numeric(10, 2), nullable=False)
    effective_from = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    worker = relationship("Worker", back_populates="wage_history")

    __table_args__ = (
        UniqueConstraint("worker_id", "effective_from", name="uq_worker_wage_effective_from"),
    )
