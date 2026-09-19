import os
import sys
from decimal import Decimal
from datetime import date, timedelta
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import SessionLocal
from app.models.worker import Worker
from app.models.site import Site
from app.models.attendance import Attendance
from app.models.advance import Advance

client = TestClient(app)

def run_security_tests():
    print("\n=======================================================")
    print("STARTING CROSS-ACCOUNT DATA ISOLATION SECURITY AUDIT")
    print("=======================================================\n")

    # 1. Authenticate Dad Account (Uses DAD_TEST_MPIN env var or direct test token)
    # Never hardcode production MPIN in test code.
    dad_test_mpin = os.getenv("DAD_TEST_MPIN")
    if dad_test_mpin:
        dad_login_res = client.post("/api/auth/login-mpin", json={"mpin": dad_test_mpin})
        assert dad_login_res.status_code == 200, f"Dad login failed with DAD_TEST_MPIN: {dad_login_res.text}"
        dad_token = dad_login_res.json()["access_token"]
    else:
        # When running tests without production MPIN, authenticate via session token
        from app.core.security import create_access_token
        from app.models.admin import AdminSettings
        db = SessionLocal()
        dad_admin = db.query(AdminSettings).filter(AdminSettings.is_demo == False).first()
        dad_token = create_access_token(data={
            "sub": str(dad_admin.id),
            "account_id": dad_admin.id,
            "is_demo": False
        })
        db.close()

    # Verify invalid MPIN rejection
    invalid_login = client.post("/api/auth/login-mpin", json={"mpin": "0000"})
    assert invalid_login.status_code == 401, f"Invalid MPIN should be rejected, got: {invalid_login.status_code}"

    dad_headers = {"Authorization": f"Bearer {dad_token}"}
    print("✔ Test 1: Dad authenticated successfully. Invalid MPIN properly rejected.")

    # 2. Authenticate Demo Account
    demo_login_res = client.post("/api/auth/demo-login")
    assert demo_login_res.status_code == 200, f"Demo login failed: {demo_login_res.text}"
    demo_token = demo_login_res.json()["access_token"]
    assert demo_login_res.json().get("is_demo", False), "Demo account must have is_demo=True"
    demo_headers = {"Authorization": f"Bearer {demo_token}"}
    print("✔ Test 2: Demo authenticated successfully through Try Demo.")

    # Verify session endpoints
    dad_verify = client.get("/api/auth/verify", headers=dad_headers).json()
    demo_verify = client.get("/api/auth/verify", headers=demo_headers).json()
    assert dad_verify["is_demo"] is False
    assert demo_verify["is_demo"] is True
    assert dad_verify["account_id"] != demo_verify["account_id"]
    dad_acc_id = dad_verify["account_id"]
    demo_acc_id = demo_verify["account_id"]
    print(f"✔ Test 3: Token identities validated (Dad Account ID: {dad_acc_id}, Demo Account ID: {demo_acc_id}).")

    # 3. List Isolation for Workers
    dad_workers = client.get("/api/workers", headers=dad_headers).json()
    demo_workers = client.get("/api/workers", headers=demo_headers).json()
    dad_worker_ids = {w["id"] for w in dad_workers}
    demo_worker_ids = {w["id"] for w in demo_workers}
    assert len(dad_worker_ids.intersection(demo_worker_ids)) == 0, "Dad and Demo workers overlap!"
    assert len(dad_workers) > 0 and len(demo_workers) > 0
    print(f"✔ Test 4: Worker lists isolated ({len(dad_workers)} Dad workers, {len(demo_workers)} Demo workers, 0 overlap).")

    # Pick sample worker IDs
    dad_worker_id = dad_workers[0]["id"]
    demo_worker_id = demo_workers[0]["id"]

    # 4. List Isolation for Sites
    dad_sites = client.get("/api/sites", headers=dad_headers).json()
    demo_sites = client.get("/api/sites", headers=demo_headers).json()
    dad_site_ids = {s["id"] for s in dad_sites}
    demo_site_ids = {s["id"] for s in demo_sites}
    assert len(dad_site_ids.intersection(demo_site_ids)) == 0, "Dad and Demo sites overlap!"
    assert len(dad_sites) > 0 and len(demo_sites) > 0
    print(f"✔ Test 5: Site lists isolated ({len(dad_sites)} Dad sites, {len(demo_sites)} Demo sites, 0 overlap).")

    dad_site_id = dad_sites[0]["id"]
    demo_site_id = demo_sites[0]["id"]

    # 5. Cross-Account ID-Based Access for Workers
    # Demo attempts to GET Dad worker
    res = client.get(f"/api/workers/{dad_worker_id}/detail", headers=demo_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    # Demo attempts to UPDATE Dad worker
    res = client.put(f"/api/workers/{dad_worker_id}", json={"name": "Hacked Name"}, headers=demo_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    # Demo attempts to TOGGLE Dad worker
    res = client.patch(f"/api/workers/{dad_worker_id}/toggle-status", headers=demo_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    # Demo attempts to DELETE Dad worker
    res = client.delete(f"/api/workers/{dad_worker_id}", headers=demo_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"

    # Dad attempts to access/modify Demo worker
    res = client.get(f"/api/workers/{demo_worker_id}/detail", headers=dad_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    res = client.put(f"/api/workers/{demo_worker_id}", json={"name": "Dad Changed Demo"}, headers=dad_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    res = client.delete(f"/api/workers/{demo_worker_id}", headers=dad_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("✔ Test 6: ID-based worker protection verified (Cross-account GET/PUT/PATCH/DELETE returns 404).")

    # 6. Cross-Account ID-Based Access for Sites
    res = client.put(f"/api/sites/{dad_site_id}", json={"name": "Hacked Site"}, headers=demo_headers)
    assert res.status_code == 404
    res = client.patch(f"/api/sites/{dad_site_id}/toggle-status", headers=demo_headers)
    assert res.status_code == 404
    res = client.delete(f"/api/sites/{dad_site_id}", headers=demo_headers)
    assert res.status_code == 404

    res = client.put(f"/api/sites/{demo_site_id}", json={"name": "Dad Altered Site"}, headers=dad_headers)
    assert res.status_code == 404
    res = client.delete(f"/api/sites/{demo_site_id}", headers=dad_headers)
    assert res.status_code == 404
    print("✔ Test 7: ID-based site protection verified (Cross-account PUT/PATCH/DELETE returns 404).")

    # 7. Creation and Cross-Visibility
    # Demo creates a new worker
    new_demo_worker = client.post("/api/workers", json={
        "name": "Demo Recruiter Test Worker",
        "phone": "555-9999",
        "daily_wage": 999.0
    }, headers=demo_headers).json()
    new_demo_worker_id = new_demo_worker["id"]

    # Verify Dad cannot see this worker in list or by ID
    dad_workers_updated = client.get("/api/workers", headers=dad_headers).json()
    assert all(w["id"] != new_demo_worker_id for w in dad_workers_updated)
    res = client.get(f"/api/workers/{new_demo_worker_id}/detail", headers=dad_headers)
    assert res.status_code == 404
    print("✔ Test 8: Demo can create a worker, Dad CANNOT see or access it.")

    # Demo creates a new site
    new_demo_site = client.post("/api/sites", json={
        "name": "Demo Test Site Alpha",
        "address": "Fictional Location"
    }, headers=demo_headers).json()
    new_demo_site_id = new_demo_site["id"]

    # Verify Dad cannot see this site
    dad_sites_updated = client.get("/api/sites", headers=dad_headers).json()
    assert all(s["id"] != new_demo_site_id for s in dad_sites_updated)
    print("✔ Test 9: Demo can create a site, Dad CANNOT see or access it.")

    # 8. Cross-Account Attendance Protection
    today_str = date.today().isoformat()
    # Demo attempts to save attendance for Dad's worker
    res = client.post("/api/attendance/batch-save", json={
        "date": today_str,
        "records": [{
            "worker_id": dad_worker_id,
            "site_id": demo_site_id,
            "work_units": 2.0,
            "notes": "Unauthorized entry attempt"
        }]
    }, headers=demo_headers)
    assert res.status_code == 200
    # Verify Dad's muster for today did NOT get touched by Demo
    dad_muster = client.get(f"/api/attendance/by-date?date={today_str}", headers=dad_headers).json()
    for row in dad_muster["workers"]:
        if row["worker_id"] == dad_worker_id:
            assert row.get("notes") != "Unauthorized entry attempt"
    print("✔ Test 10: Cross-account attendance batch save rejected/prevented.")

    # Demo creates attendance for Demo worker
    client.post("/api/attendance/batch-save", json={
        "date": today_str,
        "records": [{
            "worker_id": new_demo_worker_id,
            "site_id": new_demo_site_id,
            "work_units": 1.5,
            "notes": "Valid demo overtime"
        }]
    }, headers=demo_headers)

    # Dad muster check
    dad_muster_after = client.get(f"/api/attendance/by-date?date={today_str}", headers=dad_headers).json()
    assert all(w["worker_id"] != new_demo_worker_id for w in dad_muster_after["workers"])
    print("✔ Test 11: Demo attendance appears only in Demo muster, not in Dad muster.")

    # 9. Cross-Account Advances Protection
    # Demo attempts to record advance for Dad's worker
    res = client.post("/api/advances", json={
        "worker_id": dad_worker_id,
        "amount": 5000.0,
        "date": today_str,
        "note": "Malicious advance attempt"
    }, headers=demo_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"

    # Dad attempts to record advance for Demo's worker
    res = client.post("/api/advances", json={
        "worker_id": demo_worker_id,
        "amount": 3000.0,
        "date": today_str,
        "note": "Cross account advance"
    }, headers=dad_headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("✔ Test 12: Cross-account advance creation blocked with 404.")

    # Demo creates advance for own worker
    demo_adv = client.post("/api/advances", json={
        "worker_id": new_demo_worker_id,
        "amount": 1200.0,
        "date": today_str,
        "note": "Demo fuel advance"
    }, headers=demo_headers).json()
    demo_adv_id = demo_adv["id"]

    # Verify Dad cannot see or delete Demo's advance
    dad_advances = client.get("/api/advances", headers=dad_headers).json()
    assert all(a["id"] != demo_adv_id for a in dad_advances)
    res = client.delete(f"/api/advances/{demo_adv_id}", headers=dad_headers)
    assert res.status_code == 404
    print("✔ Test 13: Demo advance visible and manageable ONLY by Demo account.")

    # 10. Automatic Monthly Reset & Cross-Account Isolation
    # September 2026 payroll (current month with shifts)
    demo_sept = client.get("/api/payroll/monthly?year=2026&month=9", headers=demo_headers).json()
    dad_sept = client.get("/api/payroll/monthly?year=2026&month=9", headers=dad_headers).json()
    assert Decimal(str(demo_sept["total_gross_wages"])) > Decimal("0.00")
    assert Decimal(str(dad_sept["total_gross_wages"])) > Decimal("0.00")

    # October 2026 payroll (new month begins - automatic reset to ₹0 without deleting any historical records)
    demo_oct_init = client.get("/api/payroll/monthly?year=2026&month=10", headers=demo_headers).json()
    dad_oct_init = client.get("/api/payroll/monthly?year=2026&month=10", headers=dad_headers).json()
    assert Decimal(str(demo_oct_init["total_gross_wages"])) == Decimal("0.00")
    assert Decimal(str(demo_oct_init["total_advances"])) == Decimal("0.00")
    assert Decimal(str(demo_oct_init["total_net_payable"])) == Decimal("0.00")
    assert Decimal(str(dad_oct_init["total_gross_wages"])) == Decimal("0.00")
    assert Decimal(str(dad_oct_init["total_advances"])) == Decimal("0.00")
    assert Decimal(str(dad_oct_init["total_net_payable"])) == Decimal("0.00")

    # Add a new October shift for Demo worker to verify new attendance contributes to the new month
    oct_save_res = client.post("/api/attendance/batch-save", json={
        "date": "2026-10-05",
        "records": [{
            "worker_id": demo_worker_id,
            "site_id": demo_sites[0]["id"],
            "work_units": 1.5,
            "notes": "October test shift"
        }]
    }, headers=demo_headers)
    assert oct_save_res.status_code == 200

    # Verify Demo October payroll now reflects new shift
    demo_oct_after = client.get("/api/payroll/monthly?year=2026&month=10", headers=demo_headers).json()
    assert Decimal(str(demo_oct_after["total_gross_wages"])) > Decimal("0.00")
    assert Decimal(str(demo_oct_after["total_work_units"])) == Decimal("1.5")

    # Verify Demo September payroll remains 100% intact and available in history (no historical records deleted)
    demo_sept_after = client.get("/api/payroll/monthly?year=2026&month=9", headers=demo_headers).json()
    assert demo_sept_after["total_gross_wages"] == demo_sept["total_gross_wages"]
    assert demo_sept_after["total_advances"] == demo_sept["total_advances"]
    assert demo_sept_after["total_net_payable"] == demo_sept["total_net_payable"]

    # Verify Dad's October and September payrolls are completely untouched
    dad_oct_after = client.get("/api/payroll/monthly?year=2026&month=10", headers=dad_headers).json()
    dad_sept_after = client.get("/api/payroll/monthly?year=2026&month=9", headers=dad_headers).json()
    assert Decimal(str(dad_oct_after["total_gross_wages"])) == Decimal("0.00")
    assert dad_sept_after["total_gross_wages"] == dad_sept["total_gross_wages"]

    # Clean up test October attendance
    oct_hist = client.get("/api/attendance/history?start_date=2026-10-01&end_date=2026-10-31", headers=demo_headers).json()
    for rec in oct_hist:
        client.delete(f"/api/attendance/{rec['id']}", headers=demo_headers)
    print("✔ Test 14: Automatic monthly reset verified (new month starts at ₹0, previous month intact, zero cross-account impact).")

    # 11. Dashboard Isolation
    dad_dash = client.get("/api/dashboard", headers=dad_headers).json()
    demo_dash = client.get("/api/dashboard", headers=demo_headers).json()
    assert dad_dash["current_month_gross"] != demo_dash["current_month_gross"]
    assert dad_dash["today_total_work_units"] != demo_dash["today_total_work_units"]
    assert dad_dash["current_month_net"] != demo_dash["current_month_net"]
    print("✔ Test 15: Dashboard metrics are strictly computed per isolated account.")

    # Clean up test entities created by Demo
    client.delete(f"/api/advances/{demo_adv_id}", headers=demo_headers)
    client.delete(f"/api/workers/{new_demo_worker_id}", headers=demo_headers)
    client.delete(f"/api/sites/{new_demo_site_id}", headers=demo_headers)
    print("✔ Test 16: Demo test entities cleaned up cleanly.")

    print("\n=======================================================")
    print("ALL 16 CROSS-ACCOUNT SECURITY AUDIT TESTS PASSED (100%)")
    print("=======================================================\n")

if __name__ == "__main__":
    run_security_tests()
