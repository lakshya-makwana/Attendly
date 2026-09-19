# Attendly — REST API Documentation

This document provides a technical reference for the **Attendly Backend API**, built with **FastAPI**.

---

## General Conventions

- **Base URL (Local)**: `http://localhost:8001` (proxied via Vite on `/api`)
- **Base URL (Production)**: `https://<your-vercel-domain>/api` (routed natively via `vercel.json`)
- **Interactive Documentation**: Available at `/docs` (Swagger UI) and `/redoc` (ReDoc)
- **Data Format**: `application/json` for requests and responses
- **Authentication**: Bearer JWT token in the `Authorization` header (`Authorization: Bearer <token>`)

---

## 1. System & Health Endpoints

### 1.1 Root Service Status
- **Method**: `GET`
- **Route**: `/`
- **Auth Required**: No
- **Response**: `200 OK`
```json
{
  "status": "online",
  "service": "Attendly API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### 1.2 Health Check
- **Method**: `GET`
- **Route**: `/health`
- **Auth Required**: No
- **Response**: `200 OK`
```json
{
  "status": "healthy"
}
```

---

## 2. Authentication Endpoints

### 2.1 Admin MPIN Login
- **Method**: `POST`
- **Route**: `/api/auth/login-mpin`
- **Auth Required**: No
- **Request Body**:
```json
{
  "mpin": "1234"
}
```
*Validation*: Must be numeric string, 4 to 6 characters.
- **Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "app_title": "Attendly",
  "is_demo": false
}
```
- **Errors**: `401 Unauthorized` if MPIN is incorrect.

### 2.2 Demo Account Login ("Try Demo")
- **Method**: `POST`
- **Route**: `/api/auth/demo-login`
- **Auth Required**: No
- **Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "app_title": "Attendly (Demo)",
  "is_demo": true
}
```

### 2.3 Verify Session
- **Method**: `GET`
- **Route**: `/api/auth/verify`
- **Auth Required**: Yes (`Bearer <token>`)
- **Response**: `200 OK`
```json
{
  "authenticated": true,
  "role": "admin",
  "account_id": 1,
  "is_demo": false
}
```
- **Errors**: `401 Unauthorized` if token is missing, expired, or invalid.

### 2.4 Change Admin MPIN
- **Method**: `POST`
- **Route**: `/api/auth/change-mpin`
- **Auth Required**: Yes (`Bearer <token>`)
- **Request Body**:
```json
{
  "current_mpin": "1234",
  "new_mpin": "5678"
}
```
- **Response**: `200 OK`
```json
{
  "message": "MPIN updated successfully."
}
```
- **Errors**: `400 Bad Request` if `current_mpin` is incorrect.

---

## 3. Dashboard Endpoints

### 3.1 Get Dashboard Operational Metrics
- **Method**: `GET`
- **Route**: `/api/dashboard`
- **Auth Required**: Yes
- **Response**: `200 OK`
```json
{
  "today": "2026-09-18",
  "active_workers": 16,
  "active_sites": 3,
  "today_marked_workers": 12,
  "today_unmarked_workers": 4,
  "today_total_work_units": 13.5,
  "month_name": "September 2026",
  "current_month_gross": 248500.0,
  "current_month_advances": 42000.0,
  "current_month_net": 206500.0
}
```

---

## 4. Workers Endpoints

### 4.1 List Workers
- **Method**: `GET`
- **Route**: `/api/workers`
- **Auth Required**: Yes
- **Query Parameters**:
  - `active_only` (bool, optional, default: `false`): When `true`, filters only active workers.
- **Response**: `200 OK` (Array of `WorkerResponse`)
```json
[
  {
    "id": 1,
    "name": "Rajesh Sharma",
    "phone": "9876543210",
    "daily_wage": 900.0,
    "is_active": true,
    "created_at": "2026-09-01T10:00:00Z",
    "updated_at": "2026-09-18T08:30:00Z"
  }
]
```

### 4.2 Create Worker
- **Method**: `POST`
- **Route**: `/api/workers`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "name": "Mohd. Tariq",
  "phone": "9811223344",
  "daily_wage": 1000.0
}
```
- **Response**: `201 Created` (`WorkerResponse`)

### 4.3 Get Worker Detailed Ledger
- **Method**: `GET`
- **Route**: `/api/workers/{worker_id}`
- **Auth Required**: Yes
- **Response**: `200 OK`
```json
{
  "worker": {
    "id": 1,
    "name": "Rajesh Sharma",
    "phone": "9876543210",
    "daily_wage": 900.0,
    "is_active": true,
    "created_at": "2026-09-01T10:00:00Z",
    "updated_at": null
  },
  "current_month": "September 2026",
  "month_total_work_units": 26.0,
  "month_gross_earnings": 23400.0,
  "month_total_advances": 3000.0,
  "month_net_payable": 20400.0,
  "all_time_total_advances": 15000.0,
  "recent_attendance": [
    {
      "id": 101,
      "date": "2026-09-18",
      "work_units": 1.0,
      "site_id": 2,
      "site_name": "Apex Tower B7",
      "wage_earned": 900.0
    }
  ],
  "recent_advances": [
    {
      "id": 45,
      "worker_id": 1,
      "worker_name": "Rajesh Sharma",
      "amount": 1000.0,
      "date": "2026-09-05",
      "note": "Diwali preparation cash",
      "created_at": "2026-09-05T14:30:00Z"
    }
  ],
  "unique_sites_worked": ["Apex Tower B7", "Metro Rail Pier 14"]
}
```

### 4.4 Update Worker
- **Method**: `PUT`
- **Route**: `/api/workers/{worker_id}`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "name": "Rajesh Sharma",
  "phone": "9876543210",
  "daily_wage": 950.0,
  "is_active": true
}
```
- **Response**: `200 OK` (`WorkerResponse`)

### 4.5 Toggle Worker Status (Active / Inactive)
- **Method**: `PATCH`
- **Route**: `/api/workers/{worker_id}/toggle-status`
- **Auth Required**: Yes
- **Response**: `200 OK` (flips `is_active` boolean)

### 4.6 Delete Worker
- **Method**: `DELETE`
- **Route**: `/api/workers/{worker_id}`
- **Auth Required**: Yes
- **Response**: `200 OK` (`{"message": "Worker deleted successfully"}`)
*Note*: Cascades deletion to associated attendance and advance records.

---

## 5. Sites Endpoints

### 5.1 List Sites
- **Method**: `GET`
- **Route**: `/api/sites`
- **Auth Required**: Yes
- **Query Parameters**:
  - `active_only` (bool, optional, default: `false`)
- **Response**: `200 OK` (Array of `SiteResponse`)

### 5.2 Create Site
- **Method**: `POST`
- **Route**: `/api/sites`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "name": "Apex Tower B7",
  "address": "Sector 62, Noida"
}
```
- **Response**: `201 Created` (`SiteResponse`)

### 5.3 Update Site
- **Method**: `PUT`
- **Route**: `/api/sites/{site_id}`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "name": "Apex Tower B7 - Phase 2",
  "address": "Sector 62, Noida",
  "is_active": true
}
```
- **Response**: `200 OK` (`SiteResponse`)

### 5.4 Toggle Site Status
- **Method**: `PATCH`
- **Route**: `/api/sites/{site_id}/toggle-status`
- **Auth Required**: Yes
- **Response**: `200 OK`

### 5.5 Delete Site (Protected)
- **Method**: `DELETE`
- **Route**: `/api/sites/{site_id}`
- **Auth Required**: Yes
- **Response**: `200 OK` if no attendance exists.
- **Errors**: `400 Bad Request` if the site has any historical attendance records:
```json
{
  "detail": "Cannot delete 'Apex Tower B7' because it has 42 historical attendance records. Please deactivate the site instead."
}
```

---

## 6. Attendance Endpoints

### 6.1 Get Attendance by Date
- **Method**: `GET`
- **Route**: `/api/attendance/by-date`
- **Auth Required**: Yes
- **Query Parameters**:
  - `date` (date, optional, default: today's date)
- **Response**: `200 OK` (`DailyAttendanceResponse`)
```json
{
  "date": "2026-09-18",
  "total_workers": 16,
  "marked_count": 14,
  "unmarked_count": 2,
  "total_work_units": 13.5,
  "workers": [
    {
      "worker_id": 1,
      "worker_name": "Rajesh Sharma",
      "daily_wage": 900.0,
      "phone": "9876543210",
      "site_id": 2,
      "site_name": "Apex Tower B7",
      "work_units": 1.0,
      "notes": "Masonry 4th floor"
    }
  ]
}
```

### 6.2 Batch Save Daily Attendance
- **Method**: `POST`
- **Route**: `/api/attendance/batch-save`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "date": "2026-09-18",
  "records": [
    {
      "worker_id": 1,
      "site_id": 2,
      "work_units": 1.0,
      "notes": "Full day"
    },
    {
      "worker_id": 2,
      "site_id": 2,
      "work_units": 1.5,
      "notes": "Overtime pour"
    },
    {
      "worker_id": 3,
      "site_id": null,
      "work_units": 0.0,
      "notes": "Absent"
    }
  ]
}
```
*Validation*: `work_units` must be one of `0.0`, `0.5`, `1.0`, `1.5`, or `2.0`.
- **Response**: `200 OK`
```json
{
  "message": "Saved attendance for 3 workers on 2026-09-18"
}
```

### 6.3 Attendance History Query
- **Method**: `GET`
- **Route**: `/api/attendance/history`
- **Auth Required**: Yes
- **Query Parameters**:
  - `worker_id` (int, optional)
  - `site_id` (int, optional)
  - `start_date` (date, optional)
  - `end_date` (date, optional)
  - `limit` (int, optional, default: 100)
- **Response**: `200 OK` (Array of `AttendanceResponse`)

---

## 7. Advances Endpoints

### 7.1 List Advances
- **Method**: `GET`
- **Route**: `/api/advances`
- **Auth Required**: Yes
- **Query Parameters**:
  - `worker_id` (int, optional)
  - `start_date` (date, optional)
  - `end_date` (date, optional)
- **Response**: `200 OK` (Array of `AdvanceResponse`)

### 7.2 Record Advance Payout
- **Method**: `POST`
- **Route**: `/api/advances`
- **Auth Required**: Yes
- **Request Body**:
```json
{
  "worker_id": 1,
  "amount": 2000.0,
  "date": "2026-09-18",
  "note": "Festival expenses - Diwali prep"
}
```
*Validation*: `amount` must be strictly greater than 0.
- **Response**: `201 Created` (`AdvanceResponse`)

### 7.3 Delete Advance Entry
- **Method**: `DELETE`
- **Route**: `/api/advances/{advance_id}`
- **Auth Required**: Yes
- **Response**: `200 OK` (`{"message": "Advance record deleted successfully"}`)

---

## 8. Payroll Endpoints

### 8.1 Monthly Payroll Calculation & Ledger
- **Method**: `GET`
- **Route**: `/api/payroll/monthly`
- **Auth Required**: Yes
- **Query Parameters**:
  - `year` (int, optional, default: current year)
  - `month` (int, optional, default: current month)
- **Response**: `200 OK` (`MonthlyPayrollResponse`)
```json
{
  "year": 2026,
  "month": 9,
  "month_name": "September 2026",
  "total_gross_wages": 248500.0,
  "total_advances": 42000.0,
  "total_net_payable": 206500.0,
  "total_work_units": 276.5,
  "worker_count": 16,
  "rows": [
    {
      "worker_id": 1,
      "worker_name": "Rajesh Sharma",
      "phone": "9876543210",
      "daily_wage": 900.0,
      "total_work_units": 26.0,
      "gross_earnings": 23400.0,
      "total_advances": 3000.0,
      "net_payable": 20400.0
    }
  ]
}
```

---

## 9. Site Analytics Endpoints

### 9.1 Monthly Site Cost Breakdown
- **Method**: `GET`
- **Route**: `/api/sites/analytics`
- **Auth Required**: Yes
- **Query Parameters**:
  - `year` (int, optional, default: current year)
  - `month` (int, optional, default: current month)
- **Response**: `200 OK` (`MonthlySiteAnalyticsResponse`)
```json
{
  "year": 2026,
  "month": 9,
  "month_name": "September 2026",
  "total_sites_used": 2,
  "total_unique_workers": 14,
  "total_work_units": 250.0,
  "total_labour_expense": 225000.0,
  "sites": [
    {
      "site_id": 2,
      "site_name": "Apex Tower B7",
      "address": "Sector 62, Noida",
      "is_active": true,
      "unique_worker_count": 8,
      "total_work_units": 140.0,
      "total_labour_expense": 126000.0,
      "workers": [
        {
          "worker_id": 1,
          "worker_name": "Rajesh Sharma",
          "daily_wage": 900.0,
          "work_units": 20.0,
          "labour_expense": 18000.0,
          "dates_worked": [
            {
              "date": "2026-09-01",
              "work_units": 1.0,
              "wage_earned": 900.0
            }
          ]
        }
      ]
    }
  ]
}
```
