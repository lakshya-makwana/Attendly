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

client = TestClient(app)

def run_worker_status_tests():
    print("\n=======================================================")
    print("STARTING WORKER ACTIVE / INACTIVE STATUS AUDIT")
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
    print("✔ Step 1: Authentication successful for both Demo and Dad accounts.")

    # 2. Create a new test worker under Demo account (defaults to is_active=True)
    create_res = client.post("/api/workers", json={
        "name": "Status Test Worker",
        "phone": "555-8888",
        "daily_wage": 750.0
    }, headers=demo_headers)
    assert create_res.status_code == 201, f"Worker creation failed: {create_res.text}"
    test_worker = create_res.json()
    worker_id = test_worker["id"]
    assert test_worker["is_active"] is True, "New worker must have is_active=True by default"
    print(f"✔ Step 2: Test worker created with default is_active=True (ID: {worker_id}).")

    try:
        # Get a Demo site for logging attendance
        demo_sites = client.get("/api/sites", headers=demo_headers).json()
        assert len(demo_sites) > 0, "Demo sites must exist"
        site_id = demo_sites[0]["id"]

        # 3. Test active worker retrieval
        # Default list (all workers) includes the new worker
        all_workers = client.get("/api/workers", headers=demo_headers).json()
        worker_ids = [w["id"] for w in all_workers]
        assert worker_id in worker_ids, "Test worker should be in total list"

        # active_only=true includes the worker
        active_workers = client.get("/api/workers?active_only=true", headers=demo_headers).json()
        active_ids = [w["id"] for w in active_workers]
        assert worker_id in active_ids, "Active worker must appear in active_only=true query"

        # is_active=true query parameter includes the worker
        is_active_true_workers = client.get("/api/workers?is_active=true", headers=demo_headers).json()
        assert worker_id in [w["id"] for w in is_active_true_workers]

        # is_active=false query parameter excludes the worker
        is_active_false_workers = client.get("/api/workers?is_active=false", headers=demo_headers).json()
        assert worker_id not in [w["id"] for w in is_active_false_workers]
        print("✔ Step 3: Active worker retrieval verified across query parameters.")

        # 4. Create historical attendance and advance for this worker
        today_str = date.today().isoformat()
        att_res = client.post("/api/attendance/batch-save", json={
            "date": today_str,
            "records": [{
                "worker_id": worker_id,
                "site_id": site_id,
                "work_units": 1.5,
                "notes": "Testing status retention"
            }]
        }, headers=demo_headers)
        assert att_res.status_code == 200, f"Attendance batch save failed: {att_res.text}"

        adv_res = client.post("/api/advances", json={
            "worker_id": worker_id,
            "amount": 500.0,
            "date": today_str,
            "note": "Testing status advance retention"
        }, headers=demo_headers)
        assert adv_res.status_code == 201, f"Advance creation failed: {adv_res.text}"
        adv_id = adv_res.json()["id"]
        print(f"✔ Step 4: Attendance (1.5 units) and Advance (₹500) logged for worker {worker_id}.")

        # 5. Mark worker INACTIVE via PUT /api/workers/{id}
        update_res = client.put(f"/api/workers/{worker_id}", json={
            "is_active": False
        }, headers=demo_headers)
        assert update_res.status_code == 200, f"Update worker failed: {update_res.text}"
        updated_worker = update_res.json()
        assert updated_worker["is_active"] is False, "Worker must now have is_active=False"
        print(f"✔ Step 5: Worker marked inactive successfully via PUT /api/workers/{worker_id}.")

        # 6. Verify inactive worker filtering
        # active_only=true must EXCLUDE inactive worker
        active_workers_after = client.get("/api/workers?active_only=true", headers=demo_headers).json()
        assert worker_id not in [w["id"] for w in active_workers_after], "Inactive worker must NOT appear in active_only=true"

        # is_active=false must INCLUDE inactive worker
        inactive_workers_after = client.get("/api/workers?is_active=false", headers=demo_headers).json()
        assert worker_id in [w["id"] for w in inactive_workers_after], "Inactive worker must appear in is_active=false"

        # Total list (GET /api/workers) still includes inactive worker (with is_active=False)
        all_workers_after = client.get("/api/workers", headers=demo_headers).json()
        worker_entry = next((w for w in all_workers_after if w["id"] == worker_id), None)
        assert worker_entry is not None, "Inactive worker must remain in overall worker database"
        assert worker_entry["is_active"] is False
        print("✔ Step 6: Inactive worker properly excluded from active list and retained in full list.")

        # 7. Verify worker detail endpoint still accessible
        detail_res = client.get(f"/api/workers/{worker_id}/detail", headers=demo_headers)
        assert detail_res.status_code == 200, f"Worker detail failed: {detail_res.text}"
        detail_data = detail_res.json()
        assert detail_data["worker"]["is_active"] is False
        assert len(detail_data["recent_attendance"]) >= 1
        assert len(detail_data["recent_advances"]) >= 1
        print("✔ Step 7: Inactive worker detail endpoint remains fully accessible with complete history.")

        # 8. Verify existing attendance remains intact and accessible
        # For today (where worker worked), by-date muster includes the inactive worker with their record
        muster_today = client.get(f"/api/attendance/by-date?date={today_str}", headers=demo_headers).json()
        today_worker_row = next((r for r in muster_today["workers"] if r["worker_id"] == worker_id), None)
        assert today_worker_row is not None, "Worker's existing attendance must remain accessible in daily muster"
        assert Decimal(str(today_worker_row["work_units"])) == Decimal("1.5")
        assert today_worker_row["is_active"] is False

        # For a date where the inactive worker did NOT work (e.g. 2026-01-01), they are EXCLUDED from new muster
        empty_date = "2026-01-01"
        muster_empty = client.get(f"/api/attendance/by-date?date={empty_date}", headers=demo_headers).json()
        empty_worker_row = next((r for r in muster_empty["workers"] if r["worker_id"] == worker_id), None)
        assert empty_worker_row is None, "Inactive worker must NOT appear in muster for new attendance selection"

        # Attendance history endpoint includes the record
        att_hist = client.get(f"/api/attendance/history?worker_id={worker_id}", headers=demo_headers).json()
        assert len(att_hist) >= 1
        assert Decimal(str(att_hist[0]["work_units"])) == Decimal("1.5")
        print("✔ Step 8: Historical attendance preserved intact; inactive worker excluded only from new muster.")

        # 9. Verify existing advances remain intact
        advances_list = client.get(f"/api/advances?worker_id={worker_id}", headers=demo_headers).json()
        assert len(advances_list) >= 1
        assert advances_list[0]["id"] == adv_id
        assert Decimal(str(advances_list[0]["amount"])) == Decimal("500.00")
        print("✔ Step 9: Existing advances remain completely intact and queryable.")

        # 10. Mark worker ACTIVE again via PUT /api/workers/{id}
        reactivate_res = client.put(f"/api/workers/{worker_id}", json={
            "is_active": True
        }, headers=demo_headers)
        assert reactivate_res.status_code == 200
        assert reactivate_res.json()["is_active"] is True

        active_workers_recheck = client.get("/api/workers?active_only=true", headers=demo_headers).json()
        assert worker_id in [w["id"] for w in active_workers_recheck], "Re-activated worker must appear in active_only=true"
        print("✔ Step 10: Worker reactivated successfully via PUT /api/workers/{id}.")

        # 11. Test toggle-status PATCH endpoint
        toggle_res_1 = client.patch(f"/api/workers/{worker_id}/toggle-status", headers=demo_headers)
        assert toggle_res_1.status_code == 200
        assert toggle_res_1.json()["is_active"] is False, "Toggle must flip True to False"

        toggle_res_2 = client.patch(f"/api/workers/{worker_id}/toggle-status", headers=demo_headers)
        assert toggle_res_2.status_code == 200
        assert toggle_res_2.json()["is_active"] is True, "Toggle must flip False to True"
        print("✔ Step 11: Worker toggle-status PATCH endpoint verified (True -> False -> True).")

        # 12. Account Isolation Security
        # Dad account attempts to update Demo worker -> 404
        dad_put_res = client.put(f"/api/workers/{worker_id}", json={"is_active": False}, headers=dad_headers)
        assert dad_put_res.status_code == 404, f"Cross-account PUT must return 404, got {dad_put_res.status_code}"

        # Dad account attempts to toggle Demo worker -> 404
        dad_patch_res = client.patch(f"/api/workers/{worker_id}/toggle-status", headers=dad_headers)
        assert dad_patch_res.status_code == 404, f"Cross-account PATCH must return 404, got {dad_patch_res.status_code}"
        print("✔ Step 12: Account isolation strictly enforced: Cross-account update/toggle blocked with 404.")

    finally:
        # Cleanup test entities
        client.delete(f"/api/advances/{adv_id}", headers=demo_headers)
        client.delete(f"/api/workers/{worker_id}", headers=demo_headers)
        print("✔ Step 13: Test entities cleaned up cleanly.")

    print("\n=======================================================")
    print("ALL WORKER ACTIVE / INACTIVE STATUS AUDIT TESTS PASSED")
    print("=======================================================\n")

if __name__ == "__main__":
    run_worker_status_tests()
