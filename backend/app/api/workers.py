import calendar
from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import extract, func, desc
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..models.site import Site
from ..schemas.schemas import (
    WorkerCreate, WorkerUpdate, WorkerResponse, WorkerDetailResponse,
    WorkerAttendanceHistoryItem, AdvanceResponse,
    MonthlyWorkerRecordResponse, MonthlyWorkerInfo, MonthlyWorkerMonthInfo,
    MonthlyWorkerSummary, MonthlyWorkerAttendanceItem, MonthlyWorkerAdvanceItem
)

router = APIRouter(prefix="/workers", tags=["Workers"])

@router.get("", response_model=List[WorkerResponse])
def get_workers(
    active_only: bool = False,
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    query = db.query(Worker).filter(Worker.account_id == account_id)
    if is_active is not None:
        query = query.filter(Worker.is_active == is_active)
    elif active_only:
        query = query.filter(Worker.is_active == True)
    return query.order_by(Worker.name.asc()).all()

@router.post("", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
def create_worker(
    worker_in: WorkerCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = Worker(
        account_id=account_id,
        name=worker_in.name.strip(),
        phone=worker_in.phone.strip() if worker_in.phone else None,
        daily_wage=worker_in.daily_wage,
        is_active=worker_in.is_active if worker_in.is_active is not None else True
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker

@router.put("/{worker_id}", response_model=WorkerResponse)
def update_worker(
    worker_id: int,
    worker_in: WorkerUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if worker_in.name is not None:
        worker.name = worker_in.name.strip()
    if worker_in.phone is not None:
        worker.phone = worker_in.phone.strip() if worker_in.phone else None
    if worker_in.daily_wage is not None:
        worker.daily_wage = worker_in.daily_wage
    if worker_in.is_active is not None:
        worker.is_active = worker_in.is_active

    db.commit()
    db.refresh(worker)
    return worker

@router.patch("/{worker_id}/toggle-status", response_model=WorkerResponse)
def toggle_worker_status(
    worker_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.is_active = not worker.is_active
    db.commit()
    db.refresh(worker)
    return worker

@router.delete("/{worker_id}", status_code=status.HTTP_200_OK)
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    db.delete(worker)
    db.commit()
    return {"message": "Worker deleted successfully"}

@router.get("/{worker_id}/detail", response_model=WorkerDetailResponse)
def get_worker_detail(
    worker_id: int,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    # Current month attendance scoped to account
    month_attendances = db.query(Attendance).filter(
        Attendance.account_id == account_id,
        Attendance.worker_id == worker_id,
        extract("year", Attendance.date) == target_year,
        extract("month", Attendance.date) == target_month
    ).all()

    month_work_units = Decimal("0.0")
    gross_earnings = Decimal("0.00")

    for a in month_attendances:
        units = Decimal(str(a.work_units))
        month_work_units += units
        gross_earnings += units * worker.daily_wage

    # Current month advances scoped to account
    month_advances = db.query(Advance).filter(
        Advance.account_id == account_id,
        Advance.worker_id == worker_id,
        extract("year", Advance.date) == target_year,
        extract("month", Advance.date) == target_month
    ).all()
    month_total_advances = sum((a.amount for a in month_advances), Decimal("0.00"))
    month_net_payable = gross_earnings - month_total_advances

    # All time advances scoped to account
    all_advances_sum = db.query(func.coalesce(func.sum(Advance.amount), Decimal("0.00"))).filter(
        Advance.account_id == account_id,
        Advance.worker_id == worker_id
    ).scalar()

    # Recent attendances (last 50 records) scoped to account
    recent_att = db.query(Attendance).options(
        selectinload(Attendance.site)
    ).filter(
        Attendance.account_id == account_id,
        Attendance.worker_id == worker_id
    ).order_by(desc(Attendance.date)).limit(50).all()

    history_items = []
    for att in recent_att:
        units = Decimal(str(att.work_units))
        earned = units * worker.daily_wage
        history_items.append(WorkerAttendanceHistoryItem(
            id=att.id,
            date=att.date,
            work_units=units,
            site_id=att.site_id,
            site_name=att.site.name if att.site else None,
            wage_earned=earned
        ))

    # Recent advances (last 30) scoped to account
    recent_adv = db.query(Advance).filter(
        Advance.account_id == account_id,
        Advance.worker_id == worker_id
    ).order_by(desc(Advance.date), desc(Advance.created_at)).limit(30).all()

    # Unique sites worked scoped to account
    site_names = db.query(Site.name).join(Attendance, Attendance.site_id == Site.id).filter(
        Attendance.account_id == account_id,
        Site.account_id == account_id,
        Attendance.worker_id == worker_id,
        Attendance.work_units > Decimal("0")
    ).distinct().all()
    unique_sites = [s[0] for s in site_names if s[0]]

    return WorkerDetailResponse(
        worker=WorkerResponse.model_validate(worker),
        current_month=f"{target_year}-{target_month:02d}",
        month_total_work_units=month_work_units,
        month_gross_earnings=gross_earnings,
        month_total_advances=month_total_advances,
        month_net_payable=month_net_payable,
        all_time_total_advances=Decimal(all_advances_sum or 0),
        recent_attendance=history_items,
        recent_advances=[AdvanceResponse(
            id=a.id,
            worker_id=a.worker_id,
            worker_name=worker.name,
            amount=a.amount,
            date=a.date,
            note=a.note,
            created_at=a.created_at
        ) for a in recent_adv],
        unique_sites_worked=unique_sites
    )

@router.get("/{worker_id}/monthly", response_model=MonthlyWorkerRecordResponse)
def get_worker_monthly_record(
    worker_id: int,
    year: Optional[int] = Query(None, description="Calendar year, e.g. 2026"),
    month: Optional[int] = Query(None, description="Calendar month 1-12"),
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    today = date.today()
    target_year = year if year is not None else today.year
    target_month = month if month is not None else today.month

    if target_month < 1 or target_month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12."
        )
    if target_year < 1900 or target_year > 2100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid year. Year must be between 1900 and 2100."
        )

    # Scoped strictly to authenticated account_id (preserves account isolation)
    worker = db.query(Worker).filter(
        Worker.id == worker_id,
        Worker.account_id == account_id
    ).first()
    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    # Calculate exact date boundaries of the calendar month
    _, last_day = calendar.monthrange(target_year, target_month)
    start_d = date(target_year, target_month, 1)
    end_d = date(target_year, target_month, last_day)

    # Attendance query scoped to account and date range with eager site loading (prevents N+1)
    attendances = db.query(Attendance).options(
        selectinload(Attendance.site)
    ).filter(
        Attendance.account_id == account_id,
        Attendance.worker_id == worker_id,
        Attendance.date >= start_d,
        Attendance.date <= end_d
    ).order_by(Attendance.date.asc(), Attendance.id.asc()).all()

    # Advances query scoped to account and date range
    advances = db.query(Advance).filter(
        Advance.account_id == account_id,
        Advance.worker_id == worker_id,
        Advance.date >= start_d,
        Advance.date <= end_d
    ).order_by(Advance.date.asc(), Advance.id.asc()).all()

    total_units = Decimal("0.0")
    gross_earnings = Decimal("0.00")
    total_advances = Decimal("0.00")

    attendance_items = []
    for att in attendances:
        units = Decimal(str(att.work_units))
        earnings = units * worker.daily_wage
        total_units += units
        gross_earnings += earnings
        attendance_items.append(MonthlyWorkerAttendanceItem(
            date=att.date,
            site_id=att.site_id,
            site_name=att.site.name if att.site else None,
            work_units=units,
            earnings=earnings
        ))

    advance_items = []
    for adv in advances:
        adv_amount = Decimal(str(adv.amount))
        total_advances += adv_amount
        advance_items.append(MonthlyWorkerAdvanceItem(
            id=adv.id,
            date=adv.date,
            amount=adv_amount,
            note=adv.note
        ))

    net_payable = gross_earnings - total_advances

    return MonthlyWorkerRecordResponse(
        worker=MonthlyWorkerInfo(
            id=worker.id,
            name=worker.name,
            daily_wage=worker.daily_wage,
            is_active=worker.is_active
        ),
        month=MonthlyWorkerMonthInfo(
            year=target_year,
            month=target_month
        ),
        summary=MonthlyWorkerSummary(
            total_units=total_units,
            gross_earnings=gross_earnings,
            total_advances=total_advances,
            net_payable=net_payable
        ),
        attendance=attendance_items,
        advances=advance_items
    )
