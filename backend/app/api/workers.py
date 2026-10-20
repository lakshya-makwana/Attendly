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
from ..models.worker_wage import WorkerWageHistory
from ..services.wage_service import (
    resolve_effective_wage,
    get_worker_wages_map,
    compute_wage_breakdown
)
from ..schemas.schemas import (
    WorkerCreate, WorkerUpdate, WorkerResponse, WorkerDetailResponse,
    WorkerAttendanceHistoryItem, AdvanceResponse,
    MonthlyWorkerRecordResponse, MonthlyWorkerInfo, MonthlyWorkerMonthInfo,
    MonthlyWorkerSummary, MonthlyWorkerAttendanceItem, MonthlyWorkerAdvanceItem,
    WorkerWageHistoryCreate, WorkerWageHistoryResponse, WageRateBreakdown
)

router = APIRouter(prefix="/workers", tags=["Workers"])

def _sync_worker_current_wage(db: Session, worker: Worker):
    """
    Synchronizes worker.daily_wage with the active rate effective today.
    If no rate is effective on or before today, falls back to the earliest recorded rate.
    """
    today = date.today()
    wages = db.query(WorkerWageHistory).filter(
        WorkerWageHistory.account_id == worker.account_id,
        WorkerWageHistory.worker_id == worker.id
    ).order_by(WorkerWageHistory.effective_from.asc(), WorkerWageHistory.id.asc()).all()
    if wages:
        applicable = wages[0].daily_wage
        for w in wages:
            if w.effective_from <= today:
                applicable = w.daily_wage
            else:
                break
        worker.daily_wage = applicable

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
    db.flush()

    # Create initial effective-dated wage history record
    eff_date = worker_in.effective_from or date.today()
    initial_wage = WorkerWageHistory(
        account_id=account_id,
        worker_id=worker.id,
        daily_wage=worker_in.daily_wage,
        effective_from=eff_date
    )
    db.add(initial_wage)
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
    if worker_in.is_active is not None:
        worker.is_active = worker_in.is_active

    if worker_in.daily_wage is not None:
        worker.daily_wage = worker_in.daily_wage
        today = date.today()
        # Upsert today's wage record
        existing = db.query(WorkerWageHistory).filter(
            WorkerWageHistory.account_id == account_id,
            WorkerWageHistory.worker_id == worker_id,
            WorkerWageHistory.effective_from == today
        ).first()
        if existing:
            existing.daily_wage = worker_in.daily_wage
        else:
            new_wage = WorkerWageHistory(
                account_id=account_id,
                worker_id=worker_id,
                daily_wage=worker_in.daily_wage,
                effective_from=today
            )
            db.add(new_wage)
        db.flush()
        _sync_worker_current_wage(db, worker)

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

# --- Wage History Management Endpoints ---

@router.get("/{worker_id}/wages", response_model=List[WorkerWageHistoryResponse])
def get_worker_wage_history(
    worker_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Returns the complete wage history for a worker, ordered by effective date descending.
    """
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    wages = db.query(WorkerWageHistory).filter(
        WorkerWageHistory.account_id == account_id,
        WorkerWageHistory.worker_id == worker_id
    ).order_by(WorkerWageHistory.effective_from.desc(), WorkerWageHistory.id.desc()).all()
    return wages

@router.post("/{worker_id}/wages", response_model=WorkerWageHistoryResponse, status_code=status.HTTP_201_CREATED)
def add_or_update_worker_wage(
    worker_id: int,
    wage_in: WorkerWageHistoryCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    """
    Records a new wage rate effective from a specific date.
    If a rate already exists with the same effective_from date, updates it.
    Validates amount and maintains worker current wage cache.
    """
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    if wage_in.daily_wage < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily wage cannot be negative."
        )

    # Check for existing wage record with exact effective_from
    existing = db.query(WorkerWageHistory).filter(
        WorkerWageHistory.account_id == account_id,
        WorkerWageHistory.worker_id == worker_id,
        WorkerWageHistory.effective_from == wage_in.effective_from
    ).first()

    if existing:
        existing.daily_wage = wage_in.daily_wage
        record = existing
    else:
        record = WorkerWageHistory(
            account_id=account_id,
            worker_id=worker_id,
            daily_wage=wage_in.daily_wage,
            effective_from=wage_in.effective_from
        )
        db.add(record)

    db.flush()
    _sync_worker_current_wage(db, worker)
    db.commit()
    db.refresh(record)
    return record

@router.delete("/{worker_id}/wages/{wage_id}", status_code=status.HTTP_200_OK)
def delete_worker_wage(
    worker_id: int,
    wage_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    worker = db.query(Worker).filter(Worker.id == worker_id, Worker.account_id == account_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    record = db.query(WorkerWageHistory).filter(
        WorkerWageHistory.id == wage_id,
        WorkerWageHistory.worker_id == worker_id,
        WorkerWageHistory.account_id == account_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Wage record not found")

    count = db.query(WorkerWageHistory).filter(
        WorkerWageHistory.account_id == account_id,
        WorkerWageHistory.worker_id == worker_id
    ).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the worker's sole wage record.")

    db.delete(record)
    db.flush()
    _sync_worker_current_wage(db, worker)
    db.commit()
    return {"message": "Wage record deleted successfully"}

# --- Detail & Monthly Records Endpoints ---

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

    # Load worker wage history for effective wage calculation
    wages_map = get_worker_wages_map(db, account_id, [worker_id])
    worker_wages = wages_map.get(worker_id, [])

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
        eff_rate = resolve_effective_wage(worker_wages, a.date, worker.daily_wage)
        gross_earnings += units * eff_rate

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
        eff_rate = resolve_effective_wage(worker_wages, att.date, worker.daily_wage)
        earned = units * eff_rate
        history_items.append(WorkerAttendanceHistoryItem(
            id=att.id,
            date=att.date,
            work_units=units,
            daily_wage=eff_rate,
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

    # Attendance query scoped to account and date range with eager site loading
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

    # Load worker wage history for effective wage calculation
    wages_map = get_worker_wages_map(db, account_id, [worker_id])
    worker_wages = wages_map.get(worker_id, [])

    total_units = Decimal("0.0")
    gross_earnings = Decimal("0.00")
    total_advances = Decimal("0.00")

    attendance_items = []
    for att in attendances:
        units = Decimal(str(att.work_units))
        eff_rate = resolve_effective_wage(worker_wages, att.date, worker.daily_wage)
        earnings = units * eff_rate
        total_units += units
        gross_earnings += earnings
        attendance_items.append(MonthlyWorkerAttendanceItem(
            date=att.date,
            site_id=att.site_id,
            site_name=att.site.name if att.site else None,
            work_units=units,
            daily_wage=eff_rate,
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

    # Compute wage breakdown for the month
    breakdown_raw = compute_wage_breakdown(attendances, worker_wages, worker.daily_wage)
    wage_breakdown = [
        WageRateBreakdown(
            rate=b["rate"],
            work_units=b["work_units"],
            earnings=b["earnings"]
        ) for b in breakdown_raw
    ]

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
        wage_breakdown=wage_breakdown,
        attendance=attendance_items,
        advances=advance_items
    )
