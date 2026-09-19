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
from app.core.demo_seeder import seed_fictional_demo_data

def seed():
    print("[SEED] Ensuring tables exist in local database...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Dad / Production Test Account (id=1, is_demo=False)
        dad_admin = db.query(AdminSettings).filter(AdminSettings.is_demo == False).first()
        mpin_to_set = settings.ADMIN_MPIN or "1234"
        if not dad_admin:
            print(f"[SEED] Initializing Dad Account with MPIN: {mpin_to_set}")
            dad_admin = AdminSettings(
                hashed_mpin=hash_mpin(mpin_to_set),
                app_title="Attendly",
                account_type="admin",
                is_demo=False
            )
            db.add(dad_admin)
            db.commit()
            db.refresh(dad_admin)
        else:
            if not dad_admin.hashed_mpin:
                print(f"[SEED] Initializing missing MPIN on admin account: {mpin_to_set}")
                dad_admin.hashed_mpin = hash_mpin(mpin_to_set)
            dad_admin.is_demo = False
            dad_admin.account_type = "admin"
            db.commit()

        dad_id = dad_admin.id

        # 2. Dad's Local Work Sites
        dad_sites_cnt = db.query(Site).filter(Site.account_id == dad_id).count()
        if dad_sites_cnt == 0:
            print("[SEED] Seeding Dad's local work sites...")
            sample_sites = [
                Site(account_id=dad_id, name="Andheri West Tower", address="Plot 42, Link Road, Andheri West", is_active=True),
                Site(account_id=dad_id, name="Powai Commercial Hub", address="Hiranandani Business Park, Powai", is_active=True),
                Site(account_id=dad_id, name="Bandra Villa Project", address="Pali Hill, Bandra West", is_active=True),
                Site(account_id=dad_id, name="Thane Warehouse", address="Wagle Estate, Thane West", is_active=True)
            ]
            db.add_all(sample_sites)
            db.commit()

        dad_sites = db.query(Site).filter(Site.account_id == dad_id).all()

        # 3. Dad's Local Workers
        dad_workers_cnt = db.query(Worker).filter(Worker.account_id == dad_id).count()
        if dad_workers_cnt == 0:
            print("[SEED] Seeding Dad's local workers...")
            sample_workers = [
                Worker(account_id=dad_id, name="Ramesh Kumar", phone="9820112233", daily_wage=Decimal("750.00"), is_active=True),
                Worker(account_id=dad_id, name="Suresh Yadav", phone="9820223344", daily_wage=Decimal("800.00"), is_active=True),
                Worker(account_id=dad_id, name="Dinesh Sharma", phone="9820334455", daily_wage=Decimal("650.00"), is_active=True),
                Worker(account_id=dad_id, name="Manoj Verma", phone="9820445566", daily_wage=Decimal("700.00"), is_active=True),
                Worker(account_id=dad_id, name="Rajesh Patel", phone="9820556677", daily_wage=Decimal("900.00"), is_active=True),
                Worker(account_id=dad_id, name="Amit Singh", phone="9820667788", daily_wage=Decimal("600.00"), is_active=True)
            ]
            db.add_all(sample_workers)
            db.commit()

        dad_workers = db.query(Worker).filter(Worker.account_id == dad_id).all()

        # 4. Dad's Local Attendance
        dad_att_cnt = db.query(Attendance).filter(Attendance.account_id == dad_id).count()
        if dad_att_cnt == 0 and len(dad_workers) > 0 and len(dad_sites) > 0:
            print("[SEED] Seeding Dad's local attendance...")
            today = date.today()
            for d_offset in range(4, 0, -1):
                past_d = today - timedelta(days=d_offset)
                for idx, w in enumerate(dad_workers):
                    s = dad_sites[idx % len(dad_sites)]
                    units = Decimal("1.0")
                    if (idx + d_offset) % 5 == 0:
                        units = Decimal("0.5")
                    elif (idx + d_offset) % 7 == 0:
                        units = Decimal("0.0")

                    db.add(Attendance(
                        account_id=dad_id,
                        worker_id=w.id,
                        site_id=s.id if units > Decimal("0") else None,
                        date=past_d,
                        work_units=units,
                        notes="Regular shift" if units > Decimal("0") else "Personal leave"
                    ))

            for idx in range(min(4, len(dad_workers))):
                w = dad_workers[idx]
                s = dad_sites[idx % len(dad_sites)]
                db.add(Attendance(
                    account_id=dad_id,
                    worker_id=w.id,
                    site_id=s.id,
                    date=today,
                    work_units=Decimal("1.0"),
                    notes="Today morning shift"
                ))
            db.commit()

        # 5. Dad's Local Advances
        dad_adv_cnt = db.query(Advance).filter(Advance.account_id == dad_id).count()
        if dad_adv_cnt == 0 and len(dad_workers) >= 3:
            print("[SEED] Seeding Dad's local advances...")
            today = date.today()
            advances = [
                Advance(account_id=dad_id, worker_id=dad_workers[0].id, amount=Decimal("1500.00"), date=today - timedelta(days=3), note="Medical expense"),
                Advance(account_id=dad_id, worker_id=dad_workers[1].id, amount=Decimal("2000.00"), date=today - timedelta(days=2), note="Festival advance"),
                Advance(account_id=dad_id, worker_id=dad_workers[3].id, amount=Decimal("1000.00"), date=today - timedelta(days=1), note="Home rent assistance")
            ]
            db.add_all(advances)
            db.commit()

        # 6. Recruiter Demo Account (id=2, is_demo=True)
        demo_admin = db.query(AdminSettings).filter(AdminSettings.is_demo == True).first()
        if not demo_admin:
            print("[SEED] Initializing dedicated Recruiter Demo Account...")
            demo_admin = AdminSettings(
                hashed_mpin=None,
                app_title="Attendly (Demo)",
                account_type="demo",
                is_demo=True
            )
            db.add(demo_admin)
            db.commit()
            db.refresh(demo_admin)

        print(f"[SEED] Seeding fictional data for Demo Account (ID: {demo_admin.id})...")
        seed_fictional_demo_data(db, demo_admin.id)

        print("[SEED] Database seeding completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
