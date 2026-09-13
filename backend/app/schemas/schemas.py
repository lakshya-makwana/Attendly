from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator

# --- Auth Schemas ---
class LoginMPINRequest(BaseModel):
    mpin: str = Field(..., min_length=4, max_length=6, description="4 or 6 digit numeric MPIN")

    @field_validator("mpin")
    @classmethod
    def validate_numeric(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("MPIN must contain only numeric digits")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    app_title: str = "Contractor Pro"

class ChangeMPINRequest(BaseModel):
    current_mpin: str
    new_mpin: str = Field(..., min_length=4, max_length=6)

    @field_validator("new_mpin")
    @classmethod
    def validate_numeric(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("New MPIN must contain only numeric digits")
        return v

# --- Worker Schemas ---
class WorkerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    daily_wage: Decimal = Field(..., ge=0, description="Daily wage in rupees")

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    phone: Optional[str] = None
    daily_wage: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None

class WorkerResponse(WorkerBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Site Schemas ---
class SiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    address: Optional[str] = Field(None, max_length=255)

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    address: Optional[str] = None
    is_active: Optional[bool] = None

class SiteResponse(SiteBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Attendance Schemas (Numeric Work Units: 0, 0.5, 1, 1.5, 2) ---
ALLOWED_WORK_UNITS = {Decimal("0.0"), Decimal("0.5"), Decimal("1.0"), Decimal("1.5"), Decimal("2.0"),
                      Decimal("0"), Decimal("1"), Decimal("2")}

class AttendanceRecordCreate(BaseModel):
    worker_id: int
    site_id: Optional[int] = None
    work_units: Decimal = Field(..., description="0, 0.5, 1, 1.5, or 2")
    notes: Optional[str] = None

    @field_validator("work_units")
    @classmethod
    def validate_work_units(cls, v: Decimal) -> Decimal:
        v_norm = Decimal(str(v)).quantize(Decimal("0.1"))
        valid_values = {Decimal("0.0"), Decimal("0.5"), Decimal("1.0"), Decimal("1.5"), Decimal("2.0")}
        if v_norm not in valid_values:
            raise ValueError("Work units must be one of: 0, 0.5, 1, 1.5, or 2")
        return v_norm

class AttendanceBatchSaveRequest(BaseModel):
    date: date
    records: List[AttendanceRecordCreate]

class AttendanceResponse(BaseModel):
    id: int
    worker_id: int
    site_id: Optional[int]
    date: date
    work_units: Decimal
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class DailyAttendanceRow(BaseModel):
    worker_id: int
    worker_name: str
    daily_wage: Decimal
    phone: Optional[str] = None
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    work_units: Optional[Decimal] = None
    notes: Optional[str] = None

class DailyAttendanceResponse(BaseModel):
    date: date
    total_workers: int
    marked_count: int
    unmarked_count: int
    total_work_units: Decimal
    workers: List[DailyAttendanceRow]

# --- Advance Schemas ---
class AdvanceCreate(BaseModel):
    worker_id: int
    amount: Decimal = Field(..., gt=0, description="Amount in rupees")
    date: date
    note: Optional[str] = Field(None, max_length=255)

class AdvanceResponse(BaseModel):
    id: int
    worker_id: int
    worker_name: Optional[str] = None
    amount: Decimal
    date: date
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Worker Detail Schemas ---
class WorkerAttendanceHistoryItem(BaseModel):
    id: int
    date: date
    work_units: Decimal
    site_id: Optional[int]
    site_name: Optional[str]
    wage_earned: Decimal

class WorkerDetailResponse(BaseModel):
    worker: WorkerResponse
    current_month: str
    month_total_work_units: Decimal
    month_gross_earnings: Decimal
    month_total_advances: Decimal
    month_net_payable: Decimal
    all_time_total_advances: Decimal
    recent_attendance: List[WorkerAttendanceHistoryItem]
    recent_advances: List[AdvanceResponse]
    unique_sites_worked: List[str]

# --- Payroll Schemas ---
class WorkerPayrollRow(BaseModel):
    worker_id: int
    worker_name: str
    phone: Optional[str]
    daily_wage: Decimal
    total_work_units: Decimal
    gross_earnings: Decimal
    total_advances: Decimal
    net_payable: Decimal

class MonthlyPayrollResponse(BaseModel):
    year: int
    month: int
    month_name: str
    total_gross_wages: Decimal
    total_advances: Decimal
    total_net_payable: Decimal
    total_work_units: Decimal
    worker_count: int
    rows: List[WorkerPayrollRow]

# --- Dashboard Schemas ---
class DashboardMetricsResponse(BaseModel):
    today: date
    active_workers: int
    active_sites: int
    today_marked_workers: int
    today_unmarked_workers: int
    today_total_work_units: Decimal
    month_name: str
    current_month_gross: Decimal
    current_month_advances: Decimal
    current_month_net: Decimal

# --- Site Analytics Schemas ---
class SiteDateWorkDetail(BaseModel):
    date: date
    work_units: Decimal
    wage_earned: Decimal

class SiteWorkerDetail(BaseModel):
    worker_id: int
    worker_name: str
    daily_wage: Decimal
    work_units: Decimal
    labour_expense: Decimal
    dates_worked: List[SiteDateWorkDetail]

class SiteAnalyticsItem(BaseModel):
    site_id: int
    site_name: str
    address: Optional[str] = None
    is_active: bool
    unique_worker_count: int
    total_work_units: Decimal
    total_labour_expense: Decimal
    workers: List[SiteWorkerDetail]

class MonthlySiteAnalyticsResponse(BaseModel):
    year: int
    month: int
    month_name: str
    total_sites_used: int
    total_unique_workers: int
    total_work_units: Decimal
    total_labour_expense: Decimal
    sites: List[SiteAnalyticsItem]
