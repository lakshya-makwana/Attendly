"""
Regression tests: dashboard month selection and account scoping.

Reproduces the 2026-11-01 report ("dashboard shows zero figures"): an admin account with 17 workers and
653 attendance records and a demo account with 11 workers and 64 records, all dated before November.
On the first day of a month the current-month figures are legitimately zero; the defect was that
/api/dashboard ignored the month selected in the UI, so earlier months could not be shown at all.

Synthetic fixtures only, isolated test database only:
    TEST_DATABASE_URL=postgresql://localhost:5432/attendly_test venv/bin/python -m tests.test_dashboard_month_scope
"""
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tests.test_db_guard import enforce_test_database
enforce_test_database()

from fastapi.testclient import TestClient

import app.api.dashboard as dashboard_module
from app.main import app
from app.core import database
from app.core.security import create_access_token
from app.models.admin import AdminSettings
from app.models.advance import Advance
from app.models.attendance import Attendance
from app.models.site import Site
from app.models.worker import Worker
from app.models.worker_wage import WorkerWageHistory

TEST_ACCOUNT_TYPES = ("test_dash_admin", "test_dash_demo")
client = TestClient(app)


class _FrozenDate(date):
    frozen = date(2026, 11, 1)

    @classmethod
    def today(cls):
        return cls.frozen


def _freeze(day: date):
    _FrozenDate.frozen = day
    dashboard_module.date = _FrozenDate


def _build_account(account_type: str, is_demo: bool, n_workers: int, n_attendance: int, first_day: date,
                   wage_base: int, advances: list) -> dict:
    """Creates one account with sites, workers, attendance and advances; returns ids and expected totals."""
    db = database.SessionLocal()
    try:
        acc = AdminSettings(hashed_mpin=None, account_type=account_type, is_demo=is_demo, app_title="Dashboard test")
        db.add(acc)
        db.flush()
        sites = [Site(account_id=acc.id, name=f"Dash site {acc.id}-{i}", is_active=True) for i in range(2)]
        workers = [Worker(account_id=acc.id, name=f"Dash worker {acc.id}-{i}", daily_wage=Decimal(wage_base + 10 * i),
                          is_active=True) for i in range(n_workers)]
        db.add_all(sites + workers)
        db.flush()

        # Effective-dated wage change for worker 0 in mid-October: the dashboard must use the rate per date.
        rates = {w.id: [(date(2026, 1, 1), w.daily_wage)] for w in workers}
        db.add(WorkerWageHistory(account_id=acc.id, worker_id=workers[0].id, daily_wage=workers[0].daily_wage,
                                 effective_from=date(2026, 1, 1)))
        raised = workers[0].daily_wage + Decimal("100")
        db.add(WorkerWageHistory(account_id=acc.id, worker_id=workers[0].id, daily_wage=raised,
                                 effective_from=date(2026, 10, 15)))
        rates[workers[0].id].append((date(2026, 10, 15), raised))

        def rate(worker_id, day):
            return [r for start, r in rates[worker_id] if start <= day][-1]

        gross = {}
        made, day = 0, first_day
        while made < n_attendance:
            for i, w in enumerate(workers):
                if made == n_attendance:
                    break
                units = Decimal("1.0") if (i + day.day) % 4 else Decimal("0.5")
                db.add(Attendance(account_id=acc.id, worker_id=w.id, site_id=sites[i % 2].id, date=day, work_units=units))
                gross[(day.year, day.month)] = gross.get((day.year, day.month), Decimal("0")) + units * rate(w.id, day)
                made += 1
            day += timedelta(days=1)
        assert day <= date(2026, 11, 1), "fixtures end before November"

        advance_totals = {}
        for amount, on in advances:
            db.add(Advance(account_id=acc.id, worker_id=workers[0].id, amount=Decimal(amount), date=on))
            advance_totals[(on.year, on.month)] = advance_totals.get((on.year, on.month), Decimal("0")) + Decimal(amount)
        db.commit()
        token = create_access_token({"sub": str(acc.id), "account_id": acc.id, "is_demo": is_demo})
        return {"id": acc.id, "token": token, "gross": gross, "advances": advance_totals,
                "workers": {w.name for w in workers}}
    finally:
        db.close()


def _cleanup():
    db = database.SessionLocal()
    try:
        db.query(AdminSettings).filter(AdminSettings.account_type.in_(TEST_ACCOUNT_TYPES)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _get(path, account):
    return client.get(path, headers={"Authorization": f"Bearer {account['token']}"})


def run():
    print("\n=== Dashboard month selection & account scoping tests ===")
    _cleanup()
    original_date = dashboard_module.date
    try:
        admin = _build_account("test_dash_admin", False, 17, 653, date(2026, 9, 23), 600,
                               [("1500", date(2026, 10, 20)), ("400", date(2026, 9, 28))])
        demo = _build_account("test_dash_demo", True, 11, 64, date(2026, 10, 26), 500, [("300", date(2026, 10, 27))])
        assert sum(1 for _ in admin["workers"]) == 17 and len(demo["workers"]) == 11

        # 1. Reproduction: on 2026-11-01 the default (current month) figures are legitimately zero.
        _freeze(date(2026, 11, 1))
        d = _get("/api/dashboard", admin).json()
        assert d["month_name"] == "November 2026" and d["active_workers"] == 17 and d["active_sites"] == 2
        assert Decimal(d["current_month_gross"]) == 0 and Decimal(d["current_month_advances"]) == 0
        assert d["today_marked_workers"] == 0, "nothing is marked on 1 November"
        print("✔ Reproduced: on 1 November the current-month and today figures are zero (no November records).")

        # 2. Fix: the selected month is honoured, with correct effective-dated wage totals.
        for (y, m) in ((2026, 10), (2026, 9)):
            r = _get(f"/api/dashboard?year={y}&month={m}", admin)
            assert r.status_code == 200, r.text
            body = r.json()
            exp_gross = admin["gross"][(y, m)].quantize(Decimal("0.01"))
            exp_adv = admin["advances"].get((y, m), Decimal("0"))
            assert body["month_name"] == date(y, m, 1).strftime("%B %Y")
            assert Decimal(body["current_month_gross"]).quantize(Decimal("0.01")) == exp_gross, (y, m, body, exp_gross)
            assert Decimal(body["current_month_advances"]) == exp_adv
            assert Decimal(body["current_month_net"]).quantize(Decimal("0.01")) == exp_gross - exp_adv
            assert body["today"] == "2026-11-01" and body["today_marked_workers"] == 0, \
                "today figures always describe today, regardless of the selected month"
            assert exp_gross > 0
        print("✔ Fix: ?year=2026&month=10 and month=9 return the admin's real totals (incl. a mid-month wage change); "
              "today figures stay on today.")

        # 3. Default is unchanged: without parameters the current month is used (as before the fix).
        _freeze(date(2026, 10, 31))
        default_oct = _get("/api/dashboard", admin).json()
        explicit_oct = _get("/api/dashboard?year=2026&month=10", admin).json()
        assert default_oct == explicit_oct and Decimal(default_oct["current_month_gross"]) > 0
        assert default_oct["today_marked_workers"] > 0
        _freeze(date(2026, 11, 1))
        print("✔ Default without parameters is still the current month (identical to explicit current month).")

        # 4. Account scoping: the demo account only ever sees its own records.
        demo_oct = _get("/api/dashboard?year=2026&month=10", demo).json()
        assert Decimal(demo_oct["current_month_gross"]).quantize(Decimal("0.01")) == demo["gross"][(2026, 10)].quantize(Decimal("0.01"))
        assert Decimal(demo_oct["current_month_advances"]) == Decimal("300") and demo_oct["active_workers"] == 11
        assert Decimal(_get("/api/dashboard?year=2026&month=9", demo).json()["current_month_gross"]) == 0, \
            "the admin's September records never appear for the demo account"
        admin_names = {w["name"] for w in _get("/api/workers", admin).json()}
        demo_names = {w["name"] for w in _get("/api/workers", demo).json()}
        assert admin_names == admin["workers"] and len(admin_names) == 17
        assert demo_names == demo["workers"] and len(demo_names) == 11 and not (admin_names & demo_names)
        print("✔ Scoping: admin sees its 17 workers and totals; demo sees only its 11 workers and its own totals.")

        # 5. Input validation.
        for bad in ("month=13", "month=0", "year=1999&month=5", "month=abc"):
            assert _get(f"/api/dashboard?{bad}", admin).status_code == 422, bad
        print("✔ Validation: invalid year/month values are rejected with 422.")
    finally:
        dashboard_module.date = original_date
        _cleanup()
    print("\nALL DASHBOARD MONTH SCOPE TESTS PASSED\n")


if __name__ == "__main__":
    run()
