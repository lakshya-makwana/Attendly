from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.site import Site
from ..models.attendance import Attendance
from ..schemas.schemas import SiteCreate, SiteUpdate, SiteResponse

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("", response_model=List[SiteResponse])
def get_sites(
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    query = db.query(Site).filter(Site.account_id == account_id)
    if active_only:
        query = query.filter(Site.is_active == True)
    return query.order_by(Site.name.asc()).all()

@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(
    site_in: SiteCreate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    site = Site(
        account_id=account_id,
        name=site_in.name.strip(),
        address=site_in.address.strip() if site_in.address else None,
        is_active=True
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site

@router.put("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    site_in: SiteUpdate,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    site = db.query(Site).filter(Site.id == site_id, Site.account_id == account_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    if site_in.name is not None:
        site.name = site_in.name.strip()
    if site_in.address is not None:
        site.address = site_in.address.strip() if site_in.address else None
    if site_in.is_active is not None:
        site.is_active = site_in.is_active

    db.commit()
    db.refresh(site)
    return site

@router.patch("/{site_id}/toggle-status", response_model=SiteResponse)
def toggle_site_status(
    site_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    site = db.query(Site).filter(Site.id == site_id, Site.account_id == account_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    site.is_active = not site.is_active
    db.commit()
    db.refresh(site)
    return site

@router.delete("/{site_id}", status_code=status.HTTP_200_OK)
def delete_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin)
):
    account_id = current_admin["account_id"]
    site = db.query(Site).filter(Site.id == site_id, Site.account_id == account_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    # Prevent deletion if attendance records exist
    attendance_count = db.query(Attendance).filter(
        Attendance.site_id == site_id,
        Attendance.account_id == account_id
    ).count()
    if attendance_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete '{site.name}' because it has {attendance_count} historical attendance records. Please deactivate the site instead."
        )

    db.delete(site)
    db.commit()
    return {"message": f"Site '{site.name}' deleted successfully"}
