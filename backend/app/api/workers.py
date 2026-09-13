from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, desc
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.attendance import Attendance
from ..models.advance import Advance
from ..models.site import Site
from ..schemas.schemas import (
    WorkerCreate, WorkerUpdate, WorkerResponse, WorkerDetailResponse,
    WorkerAttendanceHistoryItem, AdvanceResponse
)

router = APIRouter(prefix="/workers", tags=["Workers"], dependencies=[Depends(get_current_admin)])

@router.get("", response_model=List[WorkerResponse])
def get_workers(active_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Worker)
    if active_only:
        query = query.filter(Worker.is_active == True)
    return query.order_by(Worker.name.asc()).all()

@router.post("", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
def create_worker(worker_in: WorkerCreate, db: Session = Depends(get_db)):
    worker = Worker(
        name=worker_in.name.strip(),
        phone=worker_in.phone.strip() if worker_in.phone else None,
        daily_wage=worker_in.daily_wage,
        is_active=True
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker

@router.put("/{worker_id}", response_model=WorkerResponse)
def update_worker(worker_id: int, worker_in: WorkerUpdate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
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
def toggle_worker_status(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.is_active = not worker.is_active
    db.commit()
    db.refresh(worker)
    return worker

@router.delete("/{worker_id}", status_code=status.HTTP_200_OK)
def delete_worker(worker_id: int, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
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
    db: Session = Depends(get_db)
):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    # Current month attendance
    month_attendances = db.query(Attendance).filter(
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

    # Current month advances
    month_advances = db.query(Advance).filter(
        Advance.worker_id == worker_id,
        extract("year", Advance.date) == target_year,
        extract("month", Advance.date) == target_month
    ).all()
    month_total_advances = sum((a.amount for a in month_advances), Decimal("0.00"))
    month_net_payable = gross_earnings - month_total_advances

    # All time advances
    all_advances_sum = db.query(func.coalesce(func.sum(Advance.amount), Decimal("0.00"))).filter(
        Advance.worker_id == worker_id
    ).scalar()

    # Recent attendances (last 50 records)
    recent_att = db.query(Attendance).filter(
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

    # Recent advances (last 30)
    recent_adv = db.query(Advance).filter(
        Advance.worker_id == worker_id
    ).order_by(desc(Advance.date), desc(Advance.created_at)).limit(30).all()

    # Unique sites worked
    site_names = db.query(Site.name).join(Attendance, Attendance.site_id == Site.id).filter(
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
