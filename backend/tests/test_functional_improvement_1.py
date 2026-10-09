import os
import sys
from decimal import Decimal
from datetime import date
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import SessionLocal
from app.models.attendance import Attendance

client = TestClient(app)

def run_functional_improvement_1_tests():
    print("\n=======================================================")
    print("STARTING FUNCTIONAL IMPROVEMENT #1 VERIFICATION AUDIT")
    print("=======================================================\n")

    # 1. Authenticate Demo Account
    login_res = client.post("/api/auth/demo-login")
    assert login_res.status_code == 200, f"Demo login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✔ Step 1: Demo admin authenticated.")

    # Get a demo site
    sites = client.get("/api/sites", headers=headers).json()
    assert len(sites) > 0
    site_id = sites[0]["id"]

    # 2. Create Worker 1 (Active) and Worker 2 (Active)
    w1_res = client.post("/api/workers", json={
        "name": "FI1 Worker Alpha",
        "phone": "555-1111",
        "daily_wage": 800.0
    }, headers=headers)
    assert w1_res.status_code == 201
    w1_id = w1_res.json()["id"]

    w2_res = client.post("/api/workers", json={
        "name": "FI1 Worker Beta",
        "phone": "555-2222",
        "daily_wage": 600.0
    }, headers=headers)
    assert w2_res.status_code == 201
    w2_id = w2_res.json()["id"]
    print(f"✔ Step 2: Created active test workers Alpha (ID: {w1_id}) and Beta (ID: {w2_id}).")

    try:
        today_str = date.today().isoformat()

        # 3. Mark attendance for both workers: Alpha=1.0, Beta=1.5
        att_save_res = client.post("/api/attendance/batch-save", json={
            "date": today_str,
            "records": [
                {"worker_id": w1_id, "site_id": site_id, "work_units": 1.0, "notes": "Alpha initial"},
                {"worker_id": w2_id, "site_id": site_id, "work_units": 1.5, "notes": "Beta initial"}
            ]
        }, headers=headers)
        assert att_save_res.status_code == 200
        print("✔ Step 3: Marked attendance: Alpha=1.0 units, Beta=1.5 units.")

        # 4. Deactivate Worker 2 (Beta)
        deact_res = client.patch(f"/api/workers/{w2_id}/toggle-status", headers=headers)
        assert deact_res.status_code == 200
        assert deact_res.json()["is_active"] is False
        print("✔ Step 4: Deactivated Worker Beta (is_active=False).")

        # 5. Query daily Attendance with active_only=true (as used by Attendance roster)
        roster_res = client.get(f"/api/attendance/by-date?date={today_str}&active_only=true", headers=headers)
        assert roster_res.status_code == 200
        roster_data = roster_res.json()
        roster_worker_ids = [w["worker_id"] for w in roster_data["workers"]]

        assert w1_id in roster_worker_ids, "Active worker Alpha MUST appear in daily roster"
        assert w2_id not in roster_worker_ids, "Inactive worker Beta MUST NOT appear in daily roster"
        print("✔ Step 5: Verified: Active worker appears in roster; Inactive worker is excluded.")

        # 6. Verify historical accessibility for Inactive Worker Beta
        # a) Worker detail
        detail_res = client.get(f"/api/workers/{w2_id}/detail", headers=headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["worker"]["is_active"] is False
        beta_recent_att = next((a for a in detail_data["recent_attendance"] if a["date"] == today_str), None)
        assert beta_recent_att is not None, "Beta's attendance must be visible in worker detail"
        assert Decimal(str(beta_recent_att["work_units"])) == Decimal("1.5")

        # b) Worker monthly
        today = date.today()
        monthly_res = client.get(f"/api/workers/{w2_id}/monthly?year={today.year}&month={today.month}", headers=headers)
        assert monthly_res.status_code == 200
        monthly_data = monthly_res.json()
        assert Decimal(str(monthly_data["summary"]["total_units"])) >= Decimal("1.5")

        # c) Attendance history endpoint
        hist_res = client.get(f"/api/attendance/history?worker_id={w2_id}", headers=headers)
        assert hist_res.status_code == 200
        assert any(a["date"] == today_str and Decimal(str(a["work_units"])) == Decimal("1.5") for a in hist_res.json())

        # d) Monthly payroll endpoint
        payroll_res = client.get(f"/api/payroll/monthly?year={today.year}&month={today.month}", headers=headers)
        assert payroll_res.status_code == 200
        payroll_data = payroll_res.json()
        beta_payroll = next((p for p in payroll_data["rows"] if p["worker_id"] == w2_id), None)
        assert beta_payroll is not None, "Inactive worker with attendance must appear in monthly payroll"
        assert Decimal(str(beta_payroll["total_work_units"])) >= Decimal("1.5")
        print("✔ Step 6: Verified: Inactive worker's historical records remain fully intact and accessible across Worker Details, Monthly ledger, Attendance History, and Payroll.")

        # 7. CRITICAL DATA-SAFETY VERIFICATION:
        # Save attendance for active workers (Alpha edited to 2.0; Beta omitted because excluded from visible roster)
        save_active_only_res = client.post("/api/attendance/batch-save", json={
            "date": today_str,
            "records": [
                {"worker_id": w1_id, "site_id": site_id, "work_units": 2.0, "notes": "Alpha updated"}
            ]
        }, headers=headers)
        assert save_active_only_res.status_code == 200

        # Query database directly for Beta's attendance record
        db = SessionLocal()
        beta_att_record = db.query(Attendance).filter(
            Attendance.worker_id == w2_id,
            Attendance.date == date.today()
        ).first()
        db.close()

        assert beta_att_record is not None, "CRITICAL: Inactive worker's record MUST NOT be deleted when active roster is saved!"
        assert Decimal(str(beta_att_record.work_units)) == Decimal("1.5"), "CRITICAL: Inactive worker's work units MUST NOT be modified or reset to 0!"
        assert beta_att_record.notes == "Beta initial", "CRITICAL: Inactive worker's notes must be preserved!"
        print("✔ Step 7: CRITICAL DATA-SAFETY VERIFIED: Saving visible active roster did NOT delete, overwrite, or convert inactive worker's attendance record.")

        # 8. Reactivate worker and verify re-inclusion
        react_res = client.patch(f"/api/workers/{w2_id}/toggle-status", headers=headers)
        assert react_res.status_code == 200
        assert react_res.json()["is_active"] is True

        roster_after_react = client.get(f"/api/attendance/by-date?date={today_str}&active_only=true", headers=headers).json()
        assert w2_id in [w["worker_id"] for w in roster_after_react["workers"]], "Reactivated worker must reappear in active roster"
        print("✔ Step 8: Reactivated worker reappears in active roster.")

    finally:
        # Cleanup
        db = SessionLocal()
        db.query(Attendance).filter(Attendance.worker_id.in_([w1_id, w2_id])).delete(synchronize_session=False)
        db.commit()
        db.close()
        client.delete(f"/api/workers/{w1_id}", headers=headers)
        client.delete(f"/api/workers/{w2_id}", headers=headers)
        print("✔ Step 9: Cleaned up test workers and records cleanly.")

    print("\n=======================================================")
    print("ALL FUNCTIONAL IMPROVEMENT #1 TESTS PASSED SUCCESSFULLY")
    print("=======================================================\n")

if __name__ == "__main__":
    run_functional_improvement_1_tests()
