from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.site import Site
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..schemas.schemas import DashboardMetricsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_admin)])

@router.get("", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    today = date.today()

    # Active workers and sites
    active_workers_count = db.query(Worker).filter(Worker.is_active == True).count()
    active_sites_count = db.query(Site).filter(Site.is_active == True).count()

    # Today's attendance records
    today_records = db.query(Attendance).filter(Attendance.date == today).all()
    today_marked_count = len(today_records)
    today_unmarked_count = max(0, active_workers_count - today_marked_count)
    today_work_units = sum((Decimal(str(a.work_units)) for a in today_records), Decimal("0.0"))

    # Current month's financial calculations
    month_attendances = db.query(Attendance).join(Worker, Attendance.worker_id == Worker.id).filter(
        extract("year", Attendance.date) == today.year,
        extract("month", Attendance.date) == today.month
    ).all()

    current_month_gross = Decimal("0.00")
    for att in month_attendances:
        current_month_gross += Decimal(str(att.work_units)) * att.worker.daily_wage

    month_advances = db.query(Advance).filter(
        extract("year", Advance.date) == today.year,
        extract("month", Advance.date) == today.month
    ).all()

    current_month_advances = sum((a.amount for a in month_advances), Decimal("0.00"))
    current_month_net = current_month_gross - current_month_advances

    return DashboardMetricsResponse(
        today=today,
        active_workers=active_workers_count,
        active_sites=active_sites_count,
        today_marked_workers=today_marked_count,
        today_unmarked_workers=today_unmarked_count,
        today_total_work_units=today_work_units,
        month_name=today.strftime("%B %Y"),
        current_month_gross=current_month_gross,
        current_month_advances=current_month_advances,
        current_month_net=current_month_net
    )
