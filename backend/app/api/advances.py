from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.advance import Advance
from ..schemas.schemas import AdvanceCreate, AdvanceResponse

router = APIRouter(prefix="/advances", tags=["Advances"], dependencies=[Depends(get_current_admin)])

@router.get("", response_model=List[AdvanceResponse])
def get_advances(
    worker_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Advance).join(Worker, Advance.worker_id == Worker.id)
    if worker_id:
        query = query.filter(Advance.worker_id == worker_id)
    if start_date:
        query = query.filter(Advance.date >= start_date)
    if end_date:
        query = query.filter(Advance.date <= end_date)

    advances = query.order_by(desc(Advance.date), desc(Advance.created_at)).all()
    result = []
    for a in advances:
        result.append(AdvanceResponse(
            id=a.id,
            worker_id=a.worker_id,
            worker_name=a.worker.name if a.worker else "Unknown",
            amount=a.amount,
            date=a.date,
            note=a.note,
            created_at=a.created_at
        ))
    return result

@router.post("", response_model=AdvanceResponse, status_code=status.HTTP_201_CREATED)
def record_advance(advance_in: AdvanceCreate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == advance_in.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    adv = Advance(
        worker_id=advance_in.worker_id,
        amount=advance_in.amount,
        date=advance_in.date,
        note=advance_in.note.strip() if advance_in.note else None
    )
    db.add(adv)
    db.commit()
    db.refresh(adv)

    return AdvanceResponse(
        id=adv.id,
        worker_id=adv.worker_id,
        worker_name=worker.name,
        amount=adv.amount,
        date=adv.date,
        note=adv.note,
        created_at=adv.created_at
    )

@router.delete("/{advance_id}", status_code=status.HTTP_200_OK)
def delete_advance(advance_id: int, db: Session = Depends(get_db)):
    adv = db.query(Advance).filter(Advance.id == advance_id).first()
    if not adv:
        raise HTTPException(status_code=404, detail="Advance transaction not found")

    db.delete(adv)
    db.commit()
    return {"message": "Advance record deleted successfully"}
