import os
import sys
from decimal import Decimal
from datetime import date, timedelta

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_mpin
from app.core.config import settings
from app.models.admin import AdminSettings
from app.models.worker import Worker
from app.models.site import Site
from app.models.attendance import Attendance
from app.models.advance import Advance

def seed():
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Admin MPIN Settings
        admin = db.query(AdminSettings).first()
        mpin_to_set = settings.ADMIN_MPIN or "1234"
        if not admin:
            print(f"Initializing Admin MPIN to: {mpin_to_set} (hashed with bcrypt)")
            admin = AdminSettings(
                hashed_mpin=hash_mpin(mpin_to_set),
                app_title="Attendly"
            )
            db.add(admin)
        else:
            print(f"Updating Admin MPIN to: {mpin_to_set} (hashed with bcrypt)")
            admin.hashed_mpin = hash_mpin(mpin_to_set)
        db.commit()

        # 2. Work Sites
        existing_sites = db.query(Site).count()
        if existing_sites == 0:
            print("Seeding sample work sites...")
            sample_sites = [
                Site(name="Andheri West Tower", address="Plot 42, Link Road, Andheri West"),
                Site(name="Powai Commercial Hub", address="Hiranandani Business Park, Powai"),
                Site(name="Bandra Villa Project", address="Pali Hill, Bandra West"),
                Site(name="Thane Warehouse", address="Wagle Estate, Thane West")
            ]
            db.add_all(sample_sites)
            db.commit()

        sites = db.query(Site).all()

        # 3. Workers
        existing_workers = db.query(Worker).count()
        if existing_workers == 0:
            print("Seeding sample workers...")
            sample_workers = [
                Worker(name="Ramesh Kumar", phone="9820112233", daily_wage=Decimal("750.00"), is_active=True),
                Worker(name="Suresh Yadav", phone="9820223344", daily_wage=Decimal("800.00"), is_active=True),
                Worker(name="Dinesh Sharma", phone="9820334455", daily_wage=Decimal("650.00"), is_active=True),
                Worker(name="Manoj Verma", phone="9820445566", daily_wage=Decimal("700.00"), is_active=True),
                Worker(name="Rajesh Patel", phone="9820556677", daily_wage=Decimal("900.00"), is_active=True),
                Worker(name="Amit Singh", phone="9820667788", daily_wage=Decimal("600.00"), is_active=True)
            ]
            db.add_all(sample_workers)
            db.commit()

        workers = db.query(Worker).all()

        # 4. Sample Attendance for past 4 days and today
        existing_att = db.query(Attendance).count()
        if existing_att == 0 and len(workers) > 0 and len(sites) > 0:
            print("Seeding past attendance records...")
            today = date.today()
            # past 4 days
            for d_offset in range(4, 0, -1):
                past_d = today - timedelta(days=d_offset)
                for idx, w in enumerate(workers):
                    s = sites[idx % len(sites)]
                    units = Decimal("1.0")
                    if (idx + d_offset) % 5 == 0:
                        units = Decimal("0.5")
                    elif (idx + d_offset) % 7 == 0:
                        units = Decimal("0.0")

                    db.add(Attendance(
                        worker_id=w.id,
                        site_id=s.id if units > Decimal("0") else None,
                        date=past_d,
                        work_units=units,
                        notes="Regular shift" if units > Decimal("0") else "Personal leave"
                    ))

            # Today's attendance for first 4 workers
            for idx in range(min(4, len(workers))):
                w = workers[idx]
                s = sites[idx % len(sites)]
                db.add(Attendance(
                    worker_id=w.id,
                    site_id=s.id,
                    date=today,
                    work_units=Decimal("1.0"),
                    notes="Today morning shift"
                ))
            db.commit()

        # 5. Sample Advances
        existing_adv = db.query(Advance).count()
        if existing_adv == 0 and len(workers) >= 3:
            print("Seeding sample advance transactions...")
            today = date.today()
            advances = [
                Advance(worker_id=workers[0].id, amount=Decimal("1500.00"), date=today - timedelta(days=3), note="Medical expense"),
                Advance(worker_id=workers[1].id, amount=Decimal("2000.00"), date=today - timedelta(days=2), note="Festival advance"),
                Advance(worker_id=workers[3].id, amount=Decimal("1000.00"), date=today - timedelta(days=1), note="Home rent assistance")
            ]
            db.add_all(advances)
            db.commit()

        print("Database seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
