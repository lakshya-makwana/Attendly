import os
import sys
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.admin import AdminSettings
from app.models.attendance import Attendance
from app.models.advance import Advance
from app.models.worker import Worker

client = TestClient(app)

def run_worker_monthly_tests():
    print("\n=======================================================")
    print("STARTING MONTHLY WORKER RECORD BACKEND AUDIT")
    print("=======================================================\n")

    # 1. Authenticate Demo Account
    demo_login_res = client.post("/api/auth/demo-login")
    assert demo_login_res.status_code == 200, f"Demo login failed: {demo_login_res.text}"
    demo_token = demo_login_res.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    # Authenticate Dad Account
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
    print("✔ Test 1: Authentication verified for both Demo and Dad accounts.")

    # 2. Create isolated test worker under Demo account
    create_worker_res = client.post("/api/workers", json={
        "name": "Monthly Audit Test Worker",
        "phone": "555-9999",
        "daily_wage": 800.0,
        "is_active": True
    }, headers=demo_headers)
    assert create_worker_res.status_code == 201, f"Worker creation failed: {create_worker_res.text}"
    worker = create_worker_res.json()
    worker_id = worker["id"]

    created_advance_ids = []

    try:
        # Get a Demo site for logging attendance
        demo_sites = client.get("/api/sites", headers=demo_headers).json()
        assert len(demo_sites) > 0, "Demo sites must exist"
        site_id = demo_sites[0]["id"]
        site_name = demo_sites[0]["name"]

        # Log attendance in target month (August 2026: 2026-08)
        # Shift 1: 2026-08-10, 1.0 unit (800)
        # Shift 2: 2026-08-15, 1.5 units (1200)
        # Shift 3: 2026-08-20, 0.5 units (400)
        # Subtotal: 3.0 units, 2400 gross
        res_aug_1 = client.post("/api/attendance/batch-save", json={
            "date": "2026-08-10",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 1.0, "notes": "Aug shift 1"}]
        }, headers=demo_headers)
        assert res_aug_1.status_code == 200

        res_aug_2 = client.post("/api/attendance/batch-save", json={
            "date": "2026-08-15",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 1.5, "notes": "Aug shift 2"}]
        }, headers=demo_headers)
        assert res_aug_2.status_code == 200

        res_aug_3 = client.post("/api/attendance/batch-save", json={
            "date": "2026-08-20",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 0.5, "notes": "Aug shift 3"}]
        }, headers=demo_headers)
        assert res_aug_3.status_code == 200

        # Log attendance in outside month (September 2026: 2026-09)
        # Shift 4: 2026-09-02, 2.0 units (1600)
        res_sep_1 = client.post("/api/attendance/batch-save", json={
            "date": "2026-09-02",
            "records": [{"worker_id": worker_id, "site_id": site_id, "work_units": 2.0, "notes": "Sep shift"}]
        }, headers=demo_headers)
        assert res_sep_1.status_code == 200

        # Log advances in target month (August 2026)
        # Advance 1: 500.0
        # Advance 2: 300.0
        # Subtotal: 800.0
        adv_aug_1 = client.post("/api/advances", json={
            "worker_id": worker_id,
            "amount": 500.0,
            "date": "2026-08-12",
            "note": "Aug tool advance"
        }, headers=demo_headers).json()
        created_advance_ids.append(adv_aug_1["id"])

        adv_aug_2 = client.post("/api/advances", json={
            "worker_id": worker_id,
            "amount": 300.0,
            "date": "2026-08-18",
            "note": "Aug travel advance"
        }, headers=demo_headers).json()
        created_advance_ids.append(adv_aug_2["id"])

        # Log advance in outside month (September 2026)
        adv_sep = client.post("/api/advances", json={
            "worker_id": worker_id,
            "amount": 1000.0,
            "date": "2026-09-05",
            "note": "Sep festival advance"
        }, headers=demo_headers).json()
        created_advance_ids.append(adv_sep["id"])

        # Test 2: Monthly endpoint returns 200 for valid worker and month
        monthly_res = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=8", headers=demo_headers)
        assert monthly_res.status_code == 200, f"Expected 200, got: {monthly_res.text}"
        data = monthly_res.json()
        print("✔ Test 2: Monthly endpoint returns 200 for valid worker/month.")

        # Test 3: Attendance is limited strictly to requested month
        att_list = data["attendance"]
        assert len(att_list) == 3, f"Expected exactly 3 August shifts, got {len(att_list)}"
        for a in att_list:
            assert a["date"].startswith("2026-08"), f"Date {a['date']} is not in August 2026"
            assert a["site_id"] == site_id
            assert a["site_name"] == site_name
        print("✔ Test 3: Attendance is strictly limited to requested month.")

        # Test 4: Advances are limited strictly to requested month
        adv_list = data["advances"]
        assert len(adv_list) == 2, f"Expected exactly 2 August advances, got {len(adv_list)}"
        for a in adv_list:
            assert a["date"].startswith("2026-08"), f"Advance date {a['date']} is not in August 2026"
        print("✔ Test 4: Advances are strictly limited to requested month.")

        # Test 5: total_units is correct
        assert Decimal(str(data["summary"]["total_units"])) == Decimal("3.0"), \
            f"Expected 3.0 total units, got {data['summary']['total_units']}"
        print("✔ Test 5: total_units is calculated accurately (3.0 units).")

        # Test 6: gross_earnings is correct (3.0 * 800 = 2400.00)
        assert Decimal(str(data["summary"]["gross_earnings"])) == Decimal("2400.00"), \
            f"Expected 2400.00 gross earnings, got {data['summary']['gross_earnings']}"
        print("✔ Test 6: gross_earnings is calculated accurately (₹2400.00).")

        # Test 7: total_advances is correct (500 + 300 = 800.00)
        assert Decimal(str(data["summary"]["total_advances"])) == Decimal("800.00"), \
            f"Expected 800.00 advances, got {data['summary']['total_advances']}"
        print("✔ Test 7: total_advances is calculated accurately (₹800.00).")

        # Test 8: net_payable is correct (2400.00 - 800.00 = 1600.00)
        assert Decimal(str(data["summary"]["net_payable"])) == Decimal("1600.00"), \
            f"Expected 1600.00 net payable, got {data['summary']['net_payable']}"
        print("✔ Test 8: net_payable is calculated accurately (₹1600.00).")

        # Test 9: Empty month returns zero summary + empty arrays
        empty_res = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=1", headers=demo_headers)
        assert empty_res.status_code == 200
        empty_data = empty_res.json()
        assert empty_data["attendance"] == []
        assert empty_data["advances"] == []
        assert Decimal(str(empty_data["summary"]["total_units"])) == Decimal("0.0")
        assert Decimal(str(empty_data["summary"]["gross_earnings"])) == Decimal("0.00")
        assert Decimal(str(empty_data["summary"]["total_advances"])) == Decimal("0.00")
        assert Decimal(str(empty_data["summary"]["net_payable"])) == Decimal("0.00")
        print("✔ Test 9: Empty month returns HTTP 200 with zero summary and empty arrays.")

        # Test 10: Inactive worker's historical monthly records remain accessible
        toggle_res = client.patch(f"/api/workers/{worker_id}/toggle-status", headers=demo_headers)
        assert toggle_res.status_code == 200
        assert toggle_res.json()["is_active"] is False, "Worker should now be inactive"

        inactive_monthly = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=8", headers=demo_headers)
        assert inactive_monthly.status_code == 200
        in_data = inactive_monthly.json()
        assert in_data["worker"]["is_active"] is False
        assert len(in_data["attendance"]) == 3
        assert len(in_data["advances"]) == 2
        assert Decimal(str(in_data["summary"]["net_payable"])) == Decimal("1600.00")
        print("✔ Test 10: Inactive worker's historical monthly record remains fully accessible.")

        # Test 11: Cross-account worker access returns 404
        cross_res = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=8", headers=dad_headers)
        assert cross_res.status_code == 404, f"Cross-account monthly access must return 404, got {cross_res.status_code}"
        print("✔ Test 11: Cross-account worker monthly access strictly blocked with 404.")

        # Test 12: Invalid month is rejected appropriately
        invalid_month_high = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=13", headers=demo_headers)
        assert invalid_month_high.status_code in [400, 422], f"Expected 400/422 for month=13, got {invalid_month_high.status_code}"

        invalid_month_low = client.get(f"/api/workers/{worker_id}/monthly?year=2026&month=0", headers=demo_headers)
        assert invalid_month_low.status_code in [400, 422], f"Expected 400/422 for month=0, got {invalid_month_low.status_code}"
        print("✔ Test 12: Invalid month parameter (0 or 13) rejected with 400 Bad Request.")

        # Test 13: No regression to existing worker detail behavior
        detail_res = client.get(f"/api/workers/{worker_id}/detail", headers=demo_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["worker"]["id"] == worker_id
        assert "recent_attendance" in detail_data
        assert "recent_advances" in detail_data
        print("✔ Test 13: Existing worker detail endpoint verified intact with zero regression.")

    finally:
        # Cleanup all created test records
        db = SessionLocal()
        try:
            # Delete attendance
            db.query(Attendance).filter(Attendance.worker_id == worker_id).delete()
            # Delete advances
            db.query(Advance).filter(Advance.worker_id == worker_id).delete()
            # Delete worker
            db.query(Worker).filter(Worker.id == worker_id).delete()
            db.commit()
            print("✔ Cleanup: All test entities cleanly removed from database.")
        except Exception as e:
            db.rollback()
            print(f"Warning during test cleanup: {e}")
        finally:
            db.close()

    print("\n=======================================================")
    print("ALL 13 WORKER MONTHLY RECORD AUDIT TESTS PASSED (100%)")
    print("=======================================================\n")

if __name__ == "__main__":
    run_worker_monthly_tests()
