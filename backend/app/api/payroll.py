from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..schemas.schemas import MonthlyPayrollResponse, WorkerPayrollRow

router = APIRouter(prefix="/payroll", tags=["Payroll"], dependencies=[Depends(get_current_admin)])

@router.get("/monthly", response_model=MonthlyPayrollResponse)
def get_monthly_payroll(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    # Get all workers
    workers = db.query(Worker).order_by(Worker.name.asc()).all()

    # Get all attendance records for target year and month
    attendances = db.query(Attendance).filter(
        extract("year", Attendance.date) == target_year,
        extract("month", Attendance.date) == target_month
    ).all()

    # Get all advances for target year and month
    advances = db.query(Advance).filter(
        extract("year", Advance.date) == target_year,
        extract("month", Advance.date) == target_month
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

        # Total work units for this worker in this month
        worker_work_units = sum((Decimal(str(a.work_units)) for a in w_atts), Decimal("0.0"))

        # Gross calculation: sum(work_units * daily_wage)
        gross = Decimal("0.00")
        for a in w_atts:
            gross += Decimal(str(a.work_units)) * w.daily_wage

        # Advances sum
        adv_sum = sum((a.amount for a in w_advs), Decimal("0.00"))

        # Net payable = gross - advances
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

    target_date = date(target_year, target_month, 1)
    month_name = target_date.strftime("%B %Y")

    return MonthlyPayrollResponse(
        year=target_year,
        month=target_month,
        month_name=month_name,
        total_gross_wages=total_gross,
        total_advances=total_adv,
        total_net_payable=total_net,
        total_work_units=overall_work_units,
        worker_count=len(rows),
        rows=rows
    )
