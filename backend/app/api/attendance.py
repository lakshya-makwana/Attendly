from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.site import Site
from ..models.attendance import Attendance
from ..schemas.schemas import (
    AttendanceBatchSaveRequest, DailyAttendanceResponse, DailyAttendanceRow,
    AttendanceResponse
)

router = APIRouter(prefix="/attendance", tags=["Attendance"], dependencies=[Depends(get_current_admin)])

@router.get("/by-date", response_model=DailyAttendanceResponse)
def get_daily_attendance(
    target_date: Optional[date] = Query(default=None, alias="date"),
    db: Session = Depends(get_db)
):
    selected_date = target_date or date.today()
    workers = db.query(Worker).filter(Worker.is_active == True).order_by(Worker.name.asc()).all()

    # Existing attendance records for this date
    records = db.query(Attendance).filter(Attendance.date == selected_date).all()
    record_map = {r.worker_id: r for r in records}

    # Fetch all sites to map names
    sites = db.query(Site).all()
    site_map = {s.id: s.name for s in sites}

    rows = []
    total_units = Decimal("0.0")
    marked_cnt = 0

    for w in workers:
        rec = record_map.get(w.id)
        if rec:
            marked_cnt += 1
            units = Decimal(str(rec.work_units))
            total_units += units
            rows.append(DailyAttendanceRow(
                worker_id=w.id,
                worker_name=w.name,
                phone=w.phone,
                daily_wage=w.daily_wage,
                site_id=rec.site_id,
                site_name=site_map.get(rec.site_id) if rec.site_id else None,
                work_units=units,
                notes=rec.notes
            ))
        else:
            rows.append(DailyAttendanceRow(
                worker_id=w.id,
                worker_name=w.name,
                phone=w.phone,
                daily_wage=w.daily_wage,
                site_id=None,
                site_name=None,
                work_units=None,
                notes=None
            ))

    unmarked_cnt = len(workers) - marked_cnt

    return DailyAttendanceResponse(
        date=selected_date,
        total_workers=len(workers),
        marked_count=marked_cnt,
        unmarked_count=unmarked_cnt,
        total_work_units=total_units,
        workers=rows
    )

@router.post("/batch-save", status_code=status.HTTP_200_OK)
def batch_save_attendance(
    payload: AttendanceBatchSaveRequest,
    db: Session = Depends(get_db)
):
    target_date = payload.date
    saved_count = 0

    for item in payload.records:
        worker = db.query(Worker).filter(Worker.id == item.worker_id).first()
        if not worker:
            continue

        existing = db.query(Attendance).filter(
            Attendance.worker_id == item.worker_id,
            Attendance.date == target_date
        ).first()

        units = Decimal(str(item.work_units)).quantize(Decimal("0.1"))
        # If 0 (absent), site_id can be null or kept
        site_id_to_save = item.site_id if units > Decimal("0") else None

        if existing:
            existing.work_units = units
            existing.site_id = site_id_to_save
            existing.notes = item.notes
        else:
            new_att = Attendance(
                worker_id=item.worker_id,
                site_id=site_id_to_save,
                date=target_date,
                work_units=units,
                notes=item.notes
            )
            db.add(new_att)

        saved_count += 1

    db.commit()
    return {"message": f"Successfully saved attendance for {saved_count} workers on {target_date}."}

@router.get("/history", response_model=List[AttendanceResponse])
def get_attendance_history(
    worker_id: Optional[int] = None,
    site_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Attendance)
    if worker_id:
        query = query.filter(Attendance.worker_id == worker_id)
    if site_id:
        query = query.filter(Attendance.site_id == site_id)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    return query.order_by(desc(Attendance.date), desc(Attendance.created_at)).limit(200).all()

@router.delete("/{attendance_id}", status_code=status.HTTP_200_OK)
def delete_attendance(attendance_id: int, db: Session = Depends(get_db)):
    rec = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(rec)
    db.commit()
    return {"message": "Attendance record deleted"}
