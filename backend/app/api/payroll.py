from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import calendar
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..schemas.schemas import MonthlyPayrollResponse, WorkerPayrollRow

router = APIRouter(prefix="/payroll", tags=["Payroll"])

def compute_payroll_for_range(db: Session, account_id: int, start_d: date, end_d: date):
    workers = db.query(Worker).filter(Worker.account_id == account_id).order_by(Worker.name.asc()).all()

    attendances = db.query(Attendance).filter(
        Attendance.account_id == account_id,
        Attendance.date >= start_d,
        Attendance.date <= end_d
    ).all()

    advances = db.query(Advance).filter(
        Advance.account_id == account_id,
        Advance.date >= start_d,
        Advance.date <= end_d
    ).all()

    att_by_worker = {}
    for att in attendances:
        att_by_worker.setdefault(att.worker_id, []).append(att)

    adv_by_worker = {}
    for adv in advances:
        adv_by_worker.setdefault(adv.worker_id, []).append(adv)

    rows = []
    total_gross = Decimal("0.00")
    total_adv = Decimal("0.00")
    total_net = Decimal("0.00")
    overall_work_units = Decimal("0.0")

    for w in workers:
        w_atts = att_by_worker.get(w.id, [])
        w_advs = adv_by_worker.get(w.id, [])

        worker_work_units = sum((Decimal(str(a.work_units)) for a in w_atts), Decimal("0.0"))

        gross = Decimal("0.00")
        for a in w_atts:
            gross += Decimal(str(a.work_units)) * w.daily_wage

        adv_sum = sum((a.amount for a in w_advs), Decimal("0.00"))
        net = gross - adv_sum

        if w.is_active or len(w_atts) > 0 or len(w_advs) > 0:
            rows.append(WorkerPayrollRow(
                worker_id=w.id,
                worker_name=w.name,
                phone=w.phone,
                daily_wage=w.daily_wage,
                total_work_units=worker_work_units,
                gross_earnings=gross,
                total_advances=adv_sum,
                net_payable=net
            ))

            total_gross += gross
            total_adv += adv_sum
            total_net += net
            overall_work_units += worker_work_units

    return {
        "total_gross": total_gross,
        "total_advances": total_adv,
        "total_net": total_net,
        "total_work_units": overall_work_units,
        "rows": rows,
        "worker_count": len(rows)
    }

@router.get("/monthly", response_model=MonthlyPayrollResponse)
def get_monthly_payroll(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Computes payroll for the specified calendar month (1st -> last day of the month).
    Automatically resets when navigating to a new calendar month with zero initial shifts.
    Historical months remain permanently available in payroll history.
    """
    account_id = current_admin["account_id"]
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    # Determine start (1st) and end (last day) of target calendar month
    _, last_day = calendar.monthrange(target_year, target_month)
    start_d = date(target_year, target_month, 1)
    end_d = date(target_year, target_month, last_day)

    computed = compute_payroll_for_range(db, account_id, start_d, end_d)
    month_name = start_d.strftime("%B %Y")

    return MonthlyPayrollResponse(
        year=target_year,
        month=target_month,
        month_name=month_name,
        total_gross_wages=computed["total_gross"],
        total_advances=computed["total_advances"],
        total_net_payable=computed["total_net"],
        total_work_units=computed["total_work_units"],
        worker_count=computed["worker_count"],
        rows=computed["rows"]
    )
