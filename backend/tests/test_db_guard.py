import os
import sys
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def enforce_test_database():
    """
    Ensures tests run strictly against an explicitly configured isolated test database.
    Fails closed if TEST_DATABASE_URL is not set, or if it points to a production/Neon host.
    """
    test_db_url = os.getenv("TEST_DATABASE_URL")
    if not test_db_url:
        print("\n" + "=" * 70)
        print("FAIL-CLOSED SAFETY GUARD TRIGGERED:")
        print("TEST_DATABASE_URL is not set.")
        print("To protect shared and production databases from accidental mutation,")
        print("backend tests require an explicitly configured isolated test database.")
        print("Required setup:")
        print("  export TEST_DATABASE_URL='postgresql://user:pass@localhost:5432/attendly_test'")
        print("=" * 70 + "\n")
        raise RuntimeError(
            "TEST_DATABASE_URL is not set. Tests fail closed to protect shared/production data. "
            "Please configure a dedicated test database (e.g. export TEST_DATABASE_URL=postgresql://localhost:5432/attendly_test)."
        )

    # Sanitize and validate URL
    parsed = urllib.parse.urlparse(test_db_url)
    hostname = (parsed.hostname or "").lower()

    # Reject known production or cloud endpoints
    if "neon.tech" in hostname or "aws." in hostname or "ep-still-queen" in hostname:
        raise RuntimeError(
            f"Safety Violation: TEST_DATABASE_URL points to production/cloud endpoint '{hostname}'. "
            "Tests must be executed against a dedicated, local, or sandbox test database."
        )

    # Force DATABASE_URL in environment BEFORE any app modules initialize
    os.environ["DATABASE_URL"] = test_db_url

    # Ensure app imports use the test database
    from app.core.config import settings, fix_database_url
    settings.DATABASE_URL = test_db_url

    from app.core import database
    test_engine = create_engine(
        fix_database_url(test_db_url),
        pool_pre_ping=True
    )
    database.engine = test_engine
    database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    # Ensure models are imported so Base.metadata knows about all tables
    import app.models

    # Initialize tables on the test database
    database.Base.metadata.create_all(bind=test_engine)

    # Seed baseline AdminSettings (main admin + demo) if clean test db
    from app.core.security import hash_mpin
    from app.models.admin import AdminSettings
    from app.models.site import Site
    from app.core.demo_seeder import seed_fictional_demo_data

    init_db = database.SessionLocal()
    try:
        main_admin = init_db.query(AdminSettings).filter(AdminSettings.is_demo == False).first()
        if not main_admin:
            main_admin = AdminSettings(
                hashed_mpin=hash_mpin(settings.ADMIN_MPIN),
                app_title="Attendly",
                account_type="admin",
                is_demo=False
            )
            init_db.add(main_admin)
            init_db.commit()
            init_db.refresh(main_admin)

        from app.models.worker import Worker
        from app.models.worker_wage import WorkerWageHistory
        from datetime import date
        from decimal import Decimal

        if init_db.query(Site).filter(Site.account_id == main_admin.id).count() == 0:
            site = Site(
                account_id=main_admin.id,
                name="Headquarters Test Site",
                address="Test Area",
                is_active=True
            )
            init_db.add(site)
            init_db.commit()

        if init_db.query(Worker).filter(Worker.account_id == main_admin.id).count() == 0:
            worker = Worker(
                account_id=main_admin.id,
                name="Test Admin Worker",
                phone="9999999999",
                daily_wage=Decimal("700.00"),
                is_active=True
            )
            init_db.add(worker)
            init_db.flush()

            wage = WorkerWageHistory(
                account_id=main_admin.id,
                worker_id=worker.id,
                daily_wage=Decimal("700.00"),
                effective_from=date(2026, 1, 1)
            )
            init_db.add(wage)
            init_db.commit()

        demo_admin = init_db.query(AdminSettings).filter(AdminSettings.is_demo == True).first()
        if not demo_admin:
            demo_admin = AdminSettings(
                hashed_mpin=None,
                app_title="Attendly (Demo)",
                account_type="demo",
                is_demo=True
            )
            init_db.add(demo_admin)
            init_db.commit()
            init_db.refresh(demo_admin)
            seed_fictional_demo_data(init_db, demo_admin.id)
    finally:
        init_db.close()

    return database.engine, database.SessionLocal
