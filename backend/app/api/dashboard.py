from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import extract
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.site import Site
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..schemas.schemas import DashboardMetricsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    today = date.today()
    # Month figures (gross, advances, net) follow the month selected on the dashboard, defaulting to the
    # current month like /sites/analytics. "Today" figures always describe today.
    target_year = year or today.year
    target_month = month or today.month

    # Active workers and sites scoped to account
    active_workers_count = db.query(Worker).filter(
        Worker.account_id == account_id,
        Worker.is_active == True
    ).count()
    active_sites_count = db.query(Site).filter(
        Site.account_id == account_id,
        Site.is_active == True
    ).count()

    # Today's attendance records scoped to account
    today_records = db.query(Attendance).filter(
        Attendance.account_id == account_id,
        Attendance.date == today
    ).all()
    today_marked_count = len(today_records)
    today_unmarked_count = max(0, active_workers_count - today_marked_count)
    today_work_units = sum((Decimal(str(a.work_units)) for a in today_records), Decimal("0.0"))

    # Selected month's financial calculations scoped to account
    month_attendances = db.query(Attendance).join(Worker, Attendance.worker_id == Worker.id).options(
        selectinload(Attendance.worker)
    ).filter(
        Attendance.account_id == account_id,
        Worker.account_id == account_id,
        extract("year", Attendance.date) == target_year,
        extract("month", Attendance.date) == target_month
    ).all()

    unique_worker_ids = {att.worker_id for att in month_attendances}
    from ..services.wage_service import resolve_effective_wage, get_worker_wages_map
    wages_map = get_worker_wages_map(db, account_id, unique_worker_ids)

    current_month_gross = Decimal("0.00")
    for att in month_attendances:
        eff_rate = resolve_effective_wage(wages_map.get(att.worker_id, []), att.date, att.worker.daily_wage)
        current_month_gross += Decimal(str(att.work_units)) * eff_rate

    month_advances = db.query(Advance).filter(
        Advance.account_id == account_id,
        extract("year", Advance.date) == target_year,
        extract("month", Advance.date) == target_month
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
        month_name=date(target_year, target_month, 1).strftime("%B %Y"),
        current_month_gross=current_month_gross,
        current_month_advances=current_month_advances,
        current_month_net=current_month_net
    )
