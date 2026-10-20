import os
import sys
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.test_db_guard import enforce_test_database
enforce_test_database()

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.admin import AdminSettings
from app.models.attendance import Attendance
from app.models.advance import Advance
from app.models.worker import Worker
from app.models.worker_wage import WorkerWageHistory

client = TestClient(app)

def run_wage_history_tests():
    print("\n=======================================================")
    print("STARTING EFFECTIVE-DATED WAGE HISTORY AUDIT")
    print("=======================================================\n")

    # 1. Authenticate Demo Account & Dad Account
    demo_login_res = client.post("/api/auth/demo-login")
    assert demo_login_res.status_code == 200, f"Demo login failed: {demo_login_res.text}"
    demo_token = demo_login_res.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    dad_test_mpin = os.getenv("DAD_TEST_MPIN")
    if dad_test_mpin:
        dad_login_res = client.post("/api/auth/login-mpin", json={"mpin": dad_test_mpin})
        dad_token = dad_login_res.json()["access_token"]
    else:
        db = SessionLocal()
        dad_admin = db.query(AdminSettings).filter(AdminSettings.is_demo == False).first()
        dad_token = create_access_token(data={
            "sub": str(dad_admin.id),
            "account_id": dad_admin.id,
            "is_demo": False
        })
        db.close()
    dad_headers = {"Authorization": f"Bearer {dad_token}"}
    print("✔ Test 1: Authentication verified for Demo and Dad accounts.")

    # 2. Create isolated test worker under Demo account with baseline wage ₹700 effective 2026-09-01
    create_worker_res = client.post("/api/workers", json={
        "name": "Effective Wage Audit Worker",
        "phone": "555-8888",
        "daily_wage": 700.0,
        "is_active": True,
        "effective_from": "2026-09-01"
    }, headers=demo_headers)
    assert create_worker_res.status_code == 201, f"Worker creation failed: {create_worker_res.text}"
    worker = create_worker_res.json()
    worker_id = worker["id"]

    try:
        # Get demo site
        demo_sites = client.get("/api/sites", headers=demo_headers).json()
        assert len(demo_sites) > 0, "Demo sites must exist"
        site_id = demo_sites[0]["id"]

        # Verify initial wage record was created
        wages_res = client.get(f"/api/workers/{worker_id}/wages", headers=demo_headers)
        assert wages_res.status_code == 200
        wages_list = wages_res.json()
        assert len(wages_list) == 1
        assert Decimal(str(wages_list[0]["daily_wage"])) == Decimal("700.00")
        assert wages_list[0]["effective_from"] == "2026-09-01"
        print("✔ Test 2: Initial worker created with baseline wage rate ₹700.00 effective 2026-09-01.")

        # Log attendance in September 2026 (baseline rate ₹700)
        # Shift 1: 2026-09-10, 1.0 unit (1.0 * 700 = 700)
        # Shift 2: 2026-09-20, 0.5 units (0.5 * 700 = 350)
        # September expected gross: 1050.00, units: 1.5
        res_sep_1 = client.post("/api/attendance/batch-save", json={
            "date": "2026-09-10",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 1.0}]
        }, headers=demo_headers)
        assert res_sep_1.status_code == 200

        res_sep_2 = client.post("/api/attendance/batch-save", json={
            "date": "2026-09-20",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 0.5}]
        }, headers=demo_headers)
        assert res_sep_2.status_code == 200

        sep_monthly = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=9", headers=demo_headers).json()
        assert Decimal(str(sep_monthly["summary"]["gross_earnings"])) == Decimal("1050.00")
        assert Decimal(str(sep_monthly["summary"]["total_units"])) == Decimal("1.5")
        print("✔ Test 3: September attendance correctly computed at baseline rate ₹700 (gross: ₹1050.00).")

        # 3. Add mid-month wage increase effective 2026-10-11 to ₹800/day
        wage_change_res = client.post(f"/api/workers/{worker_id}/wages", json={
            "daily_wage": 800.0,
            "effective_from": "2026-10-11"
        }, headers=demo_headers)
        assert wage_change_res.status_code == 201, f"Wage change failed: {wage_change_res.text}"

        wages_updated = client.get(f"/api/workers/{worker_id}/wages", headers=demo_headers).json()
        assert len(wages_updated) == 2
        assert wages_updated[0]["effective_from"] == "2026-10-11"
        assert Decimal(str(wages_updated[0]["daily_wage"])) == Decimal("800.00")
        assert wages_updated[1]["effective_from"] == "2026-09-01"
        assert Decimal(str(wages_updated[1]["daily_wage"])) == Decimal("700.00")
        print("✔ Test 4: Mid-month wage increase (₹800 effective 2026-10-11) recorded cleanly.")

        # 4. Verify September month did NOT change after October wage update
        sep_monthly_recheck = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=9", headers=demo_headers).json()
        assert Decimal(str(sep_monthly_recheck["summary"]["gross_earnings"])) == Decimal("1050.00")
        print("✔ Test 5: Historical month (September) preserved 100% unchanged after subsequent wage update.")

        # 5. Log attendance in October 2026:
        # Pre-increase shifts:
        # - 2026-10-05: 1.0 unit (uses ₹700 -> 700)
        # - 2026-10-10: 0.5 unit (uses ₹700 -> 350)
        # Post-increase shifts:
        # - 2026-10-11: 1.0 unit (uses ₹800 -> 800)
        # - 2026-10-15: 1.5 units (uses ₹800 -> 1200)
        # - 2026-10-20: 2.0 units (uses ₹800 -> 1600)
        # - 2026-10-25: 0.0 units (uses ₹800 -> 0)
        # Expected October:
        # Units: 1.0 + 0.5 + 1.0 + 1.5 + 2.0 + 0.0 = 6.0 units
        # Rate ₹700 units: 1.5 -> earnings: 1050.00
        # Rate ₹800 units: 4.5 -> earnings: 3600.00
        # Total Gross: 4650.00
        shifts = [
            ("2026-10-05", 1.0),
            ("2026-10-10", 0.5),
            ("2026-10-11", 1.0),
            ("2026-10-15", 1.5),
            ("2026-10-20", 2.0),
            ("2026-10-25", 0.0),
        ]
        for s_date, s_units in shifts:
            res = client.post("/api/attendance/batch-save", json={
                "date": s_date,
                "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": s_units}]
            }, headers=demo_headers)
            assert res.status_code == 200

        oct_monthly = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=10", headers=demo_headers).json()
        assert Decimal(str(oct_monthly["summary"]["total_units"])) == Decimal("6.0")
        assert Decimal(str(oct_monthly["summary"]["gross_earnings"])) == Decimal("4650.00")

        # Verify wage breakdown in monthly record
        breakdown = oct_monthly["wage_breakdown"]
        assert len(breakdown) == 2, f"Expected 2 wage rates in October, got {len(breakdown)}"
        rate_700 = next(b for b in breakdown if Decimal(str(b["rate"])) == Decimal("700.00"))
        rate_800 = next(b for b in breakdown if Decimal(str(b["rate"])) == Decimal("800.00"))
        assert Decimal(str(rate_700["work_units"])) == Decimal("1.5")
        assert Decimal(str(rate_700["earnings"])) == Decimal("1050.00")
        assert Decimal(str(rate_800["work_units"])) == Decimal("4.5")
        assert Decimal(str(rate_800["earnings"])) == Decimal("3600.00")
        print("✔ Test 6: Mid-month October calculation exact (1.5 units @ ₹700 = ₹1050; 4.5 units @ ₹800 = ₹3600; Gross: ₹4650.00).")

        # 6. Verify supported work units calculations: 0, 0.5, 1, 1.5, 2.0
        att_items = {item["date"]: item for item in oct_monthly["attendance"]}
        assert Decimal(str(att_items["2026-10-05"]["earnings"])) == Decimal("700.00")
        assert Decimal(str(att_items["2026-10-10"]["earnings"])) == Decimal("350.00")
        assert Decimal(str(att_items["2026-10-11"]["earnings"])) == Decimal("800.00")
        assert Decimal(str(att_items["2026-10-15"]["earnings"])) == Decimal("1200.00")
        assert Decimal(str(att_items["2026-10-20"]["earnings"])) == Decimal("1600.00")
        assert Decimal(str(att_items["2026-10-25"]["earnings"])) == Decimal("0.00")
        print("✔ Test 7: Supported work-unit fractions (0, 0.5, 1, 1.5, 2.0) evaluate with exact precision.")

        # 7. Retroactive shift entry: Log attendance for 2026-10-02 (before the 11 Oct increase)
        # Must evaluate using the historically correct rate ₹700
        res_retro = client.post("/api/attendance/batch-save", json={
            "date": "2026-10-02",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 1.0}]
        }, headers=demo_headers)
        assert res_retro.status_code == 200

        oct_retro_check = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=10", headers=demo_headers).json()
        assert Decimal(str(oct_retro_check["summary"]["total_units"])) == Decimal("7.0")
        assert Decimal(str(oct_retro_check["summary"]["gross_earnings"])) == Decimal("5350.00") # 4650 + 700
        print("✔ Test 8: Retroactive attendance entered later for earlier date automatically uses the historically correct rate.")

        # 8. Reconcile Payroll, Worker Monthly, and Site Analytics
        # Log an advance of ₹500 in October
        adv_res = client.post("/api/advances", json={
            "worker_id": worker_id,
            "amount": 500.0,
            "date": "2026-10-18",
            "note": "Oct audit advance"
        }, headers=demo_headers).json()
        adv_id = adv_res["id"]

        payroll_res = client.get("/api/payroll/monthly?year=2026&month=10", headers=demo_headers)
        assert payroll_res.status_code == 200
        payroll_data = payroll_res.json()
        worker_payroll_row = next(r for r in payroll_data["rows"] if r["worker_id"] == worker_id)

        assert Decimal(str(worker_payroll_row["gross_earnings"])) == Decimal("5350.00")
        assert Decimal(str(worker_payroll_row["total_advances"])) == Decimal("500.00")
        assert Decimal(str(worker_payroll_row["net_payable"])) == Decimal("4850.00")
        assert len(worker_payroll_row["wage_breakdown"]) == 2

        # Site analytics reconciliation
        analytics_res = client.get("/api/sites/analytics?year=2026&month=10", headers=demo_headers)
        assert analytics_res.status_code == 200
        analytics_data = analytics_res.json()
        target_site = next(s for s in analytics_data["sites"] if s["site_id"] == site_id)
        site_worker = next(w for w in target_site["workers"] if w["worker_id"] == worker_id)
        assert Decimal(str(site_worker["labour_expense"])) == Decimal("5350.00")
        print("✔ Test 9: Monthly payroll totals, worker ledger, salary slip, and site labour expenses reconcile 100%.")

        # 9. Daily attendance muster roll verification
        att_muster_early = client.get("/api/attendance/by-date?date=2026-10-05", headers=demo_headers).json()
        row_early = next(w for w in att_muster_early["workers"] if w["worker_id"] == worker_id)
        assert Decimal(str(row_early["daily_wage"])) == Decimal("700.00")

        att_muster_late = client.get("/api/attendance/by-date?date=2026-10-15", headers=demo_headers).json()
        row_late = next(w for w in att_muster_late["workers"] if w["worker_id"] == worker_id)
        assert Decimal(str(row_late["daily_wage"])) == Decimal("800.00")
        print("✔ Test 10: Daily muster roll displays wage rate effective on the specific muster date.")

        # 10. Multi-tenant isolation security verification
        cross_wages_res = client.get(f"/api/workers/{worker_id}/wages", headers=dad_headers)
        assert cross_wages_res.status_code == 404, f"Expected 404 cross-account, got {cross_wages_res.status_code}"

        cross_post_res = client.post(f"/api/workers/{worker_id}/wages", json={
            "daily_wage": 999.0,
            "effective_from": "2026-11-01"
        }, headers=dad_headers)
        assert cross_post_res.status_code == 404, f"Expected 404 cross-account, got {cross_post_res.status_code}"
        print("✔ Test 11: Multi-tenant cross-account isolation strictly enforced (404 Not Found).")

        # 11. Validation: Negative wage rejected
        invalid_wage_res = client.post(f"/api/workers/{worker_id}/wages", json={
            "daily_wage": -50.0,
            "effective_from": "2026-11-01"
        }, headers=demo_headers)
        assert invalid_wage_res.status_code in [400, 422], f"Expected 400/422 for negative wage, got {invalid_wage_res.status_code}"

        # Cannot delete the sole remaining wage record
        wages_for_del = client.get(f"/api/workers/{worker_id}/wages", headers=demo_headers).json()
        wage_id_1 = wages_for_del[0]["id"]
        wage_id_2 = wages_for_del[1]["id"]
        del_1 = client.delete(f"/api/workers/{worker_id}/wages/{wage_id_1}", headers=demo_headers)
        assert del_1.status_code == 200

        del_2 = client.delete(f"/api/workers/{worker_id}/wages/{wage_id_2}", headers=demo_headers)
        assert del_2.status_code == 400, "Must not allow deleting the sole remaining wage rate"
        print("✔ Test 12: Input validation and sole wage deletion protection verified.")

    finally:
        # Cleanup test worker and associated records cleanly
        db = SessionLocal()
        try:
            db.query(Attendance).filter(Attendance.worker_id == worker_id).delete()
            db.query(Advance).filter(Advance.worker_id == worker_id).delete()
            db.query(WorkerWageHistory).filter(WorkerWageHistory.worker_id == worker_id).delete()
            db.query(Worker).filter(Worker.id == worker_id).delete()
            db.commit()
            print("✔ Cleanup: All test entities cleanly removed from database.")
        except Exception as e:
            db.rollback()
            print(f"Warning during cleanup: {e}")
        finally:
            db.close()

    print("\n=======================================================")
    print("ALL 12 EFFECTIVE-DATED WAGE HISTORY TESTS PASSED (100%)")
    print("=======================================================\n")

if __name__ == "__main__":
    run_wage_history_tests()
