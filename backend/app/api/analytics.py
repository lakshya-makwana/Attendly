from datetime import date
from decimal import Decimal
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from ..core.database import get_db
from ..core.security import get_current_admin
from ..models.worker import Worker
from ..models.site import Site
from ..models.attendance import Attendance
from ..schemas.schemas import (
    MonthlySiteAnalyticsResponse, SiteAnalyticsItem, SiteWorkerDetail, SiteDateWorkDetail
)

router = APIRouter(prefix="/sites/analytics", tags=["Site Analytics"], dependencies=[Depends(get_current_admin)])

@router.get("", response_model=MonthlySiteAnalyticsResponse)
def get_site_monthly_analytics(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    today = date.today()
    target_year = year or today.year
    target_month = month or today.month

    # All sites (active and inactive, to preserve historical view)
    sites = db.query(Site).order_by(Site.name.asc()).all()

    # Query all attendance records for target year and month where site_id is not null and work_units > 0
    # Do NOT count absent records toward site workers or site expenses!
    attendances = db.query(Attendance).join(Worker, Attendance.worker_id == Worker.id).filter(
        Attendance.site_id.isnot(None),
        Attendance.work_units > Decimal("0"),
        extract("year", Attendance.date) == target_year,
        extract("month", Attendance.date) == target_month
    ).order_by(Attendance.date.asc()).all()

    # Group attendances by site_id -> list of attendance
    site_att_map: Dict[int, List[Attendance]] = {}
    for att in attendances:
        site_att_map.setdefault(att.site_id, []).append(att)

    site_items = []
    overall_total_work_units = Decimal("0.0")
    overall_total_expense = Decimal("0.00")
    all_unique_worker_ids = set()
    sites_used_count = 0

    for s in sites:
        att_list = site_att_map.get(s.id, [])

        # Group by worker_id for this site
        worker_records: Dict[int, List[Attendance]] = {}
        for a in att_list:
            worker_records.setdefault(a.worker_id, []).append(a)
            all_unique_worker_ids.add(a.worker_id)

        site_work_units = Decimal("0.0")
        site_expense = Decimal("0.00")
        workers_detail_list = []

        for w_id, w_atts in worker_records.items():
            worker = w_atts[0].worker
            w_units = sum((Decimal(str(a.work_units)) for a in w_atts), Decimal("0.0"))
            w_expense = Decimal("0.00")
            dates_worked = []

            for a in w_atts:
                a_units = Decimal(str(a.work_units))
                a_earned = a_units * worker.daily_wage
                w_expense += a_earned
                dates_worked.append(SiteDateWorkDetail(
                    date=a.date,
                    work_units=a_units,
                    wage_earned=a_earned
                ))

            site_work_units += w_units
            site_expense += w_expense

            workers_detail_list.append(SiteWorkerDetail(
                worker_id=worker.id,
                worker_name=worker.name,
                daily_wage=worker.daily_wage,
                work_units=w_units,
                labour_expense=w_expense,
                dates_worked=dates_worked
            ))

        # Sort workers within site by labour expense descending
        workers_detail_list.sort(key=lambda w: w.labour_expense, reverse=True)

        if len(att_list) > 0:
            sites_used_count += 1

        overall_total_work_units += site_work_units
        overall_total_expense += site_expense

        site_items.append(SiteAnalyticsItem(
            site_id=s.id,
            site_name=s.name,
            address=s.address,
            is_active=s.is_active,
            unique_worker_count=len(worker_records),
            total_work_units=site_work_units,
            total_labour_expense=site_expense,
            workers=workers_detail_list
        ))

    # Sort sites: sites with activity first, then by labour expense descending
    site_items.sort(key=lambda s: (s.total_work_units > 0, s.total_labour_expense), reverse=True)

    target_date = date(target_year, target_month, 1)
    month_name = target_date.strftime("%B %Y")

    return MonthlySiteAnalyticsResponse(
        year=target_year,
        month=target_month,
        month_name=month_name,
        total_sites_used=sites_used_count,
        total_unique_workers=len(all_unique_worker_ids),
        total_work_units=overall_total_work_units,
        total_labour_expense=overall_total_expense,
        sites=site_items
    )
