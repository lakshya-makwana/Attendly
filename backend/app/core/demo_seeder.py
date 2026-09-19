from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from ..models.worker import Worker
from ..models.site import Site
from ..models.attendance import Attendance
from ..models.advance import Advance

def seed_fictional_demo_data(db: Session, demo_account_id: int):
    """
    Populates the specified demo account with fictional, realistic test data.
    Ensures zero real identifiable information is used.
    """
    # 1. Fictional Work Sites
    existing_sites = db.query(Site).filter(Site.account_id == demo_account_id).count()
    if existing_sites == 0:
        demo_sites = [
            Site(account_id=demo_account_id, name="Andheri Residential Project", address="Sector 4, Andheri West", is_active=True),
            Site(account_id=demo_account_id, name="Powai Commercial Site", address="Central Avenue, Hiranandani Powai", is_active=True),
            Site(account_id=demo_account_id, name="Bandra Renovation Project", address="Hill Road, Bandra West", is_active=True),
        ]
        db.add_all(demo_sites)
        db.commit()

    sites = db.query(Site).filter(Site.account_id == demo_account_id).all()

    # 2. Fictional Workers with diverse daily wages
    existing_workers = db.query(Worker).filter(Worker.account_id == demo_account_id).count()
    if existing_workers == 0:
        demo_workers = [
            Worker(account_id=demo_account_id, name="Ravi Sharma", phone="555-0101", daily_wage=Decimal("850.00"), is_active=True),
            Worker(account_id=demo_account_id, name="Amit Patil", phone="555-0102", daily_wage=Decimal("750.00"), is_active=True),
            Worker(account_id=demo_account_id, name="Suresh Yadav", phone="555-0103", daily_wage=Decimal("900.00"), is_active=True),
            Worker(account_id=demo_account_id, name="Imran Shaikh", phone="555-0104", daily_wage=Decimal("800.00"), is_active=True),
            Worker(account_id=demo_account_id, name="Neeraj Verma", phone="555-0105", daily_wage=Decimal("650.00"), is_active=True),
        ]
        db.add_all(demo_workers)
        db.commit()

    workers = db.query(Worker).filter(Worker.account_id == demo_account_id).all()

    # 3. Fictional Attendance across multiple dates with work units (0, 0.5, 1, 1.5, 2)
    existing_att = db.query(Attendance).filter(Attendance.account_id == demo_account_id).count()
    if existing_att == 0 and len(workers) >= 5 and len(sites) >= 3:
        today = date.today()
        # Work units cycle: 1.0, 0.5, 1.5, 2.0, 0.0
        unit_patterns = [
            [Decimal("1.0"), Decimal("1.0"), Decimal("1.5"), Decimal("0.5"), Decimal("1.0")], # today
            [Decimal("1.0"), Decimal("1.5"), Decimal("1.0"), Decimal("1.0"), Decimal("0.0")], # -1
            [Decimal("0.5"), Decimal("1.0"), Decimal("2.0"), Decimal("1.0"), Decimal("1.0")], # -2
            [Decimal("1.0"), Decimal("0.0"), Decimal("1.0"), Decimal("1.5"), Decimal("0.5")], # -3
            [Decimal("1.5"), Decimal("1.0"), Decimal("1.0"), Decimal("1.0"), Decimal("1.0")], # -4
            [Decimal("1.0"), Decimal("1.0"), Decimal("0.5"), Decimal("2.0"), Decimal("1.0")], # -5
        ]

        for days_back, pattern in enumerate(unit_patterns):
            att_date = today - timedelta(days=days_back)
            for w_idx, w in enumerate(workers):
                units = pattern[w_idx % len(pattern)]
                site = sites[(w_idx + days_back) % len(sites)] if units > Decimal("0") else None

                note = None
                if units == Decimal("0.0"):
                    note = "Personal leave"
                elif units == Decimal("0.5"):
                    note = "Half-day morning pour"
                elif units == Decimal("1.5"):
                    note = "Regular shift + 4h overtime"
                elif units == Decimal("2.0"):
                    note = "Double shift slab casting"
                else:
                    note = "Standard muster shift"

                db.add(Attendance(
                    account_id=demo_account_id,
                    worker_id=w.id,
                    site_id=site.id if site else None,
                    date=att_date,
                    work_units=units,
                    notes=note
                ))
        db.commit()

    # 4. Fictional Advances
    existing_adv = db.query(Advance).filter(Advance.account_id == demo_account_id).count()
    if existing_adv == 0 and len(workers) >= 4:
        today = date.today()
        demo_advances = [
            Advance(
                account_id=demo_account_id,
                worker_id=workers[0].id,
                amount=Decimal("1500.00"),
                date=today - timedelta(days=3),
                note="Family emergency assistance"
            ),
            Advance(
                account_id=demo_account_id,
                worker_id=workers[2].id,
                amount=Decimal("2000.00"),
                date=today - timedelta(days=2),
                note="Festival travel advance"
            ),
            Advance(
                account_id=demo_account_id,
                worker_id=workers[3].id,
                amount=Decimal("1000.00"),
                date=today - timedelta(days=1),
                note="Safety boots purchase assistance"
            ),
        ]
        db.add_all(demo_advances)
        db.commit()
