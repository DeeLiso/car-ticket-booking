from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole, UserStatus
from app.schemas.common import ORMModel


class DashboardStats(BaseModel):
    total_passengers: int
    total_operators: int
    total_buses: int
    total_routes: int
    total_trips: int
    total_bookings: int
    confirmed_bookings: int
    pending_payments: int
    cancelled_bookings: int
    total_revenue: float
    refunded_amount: float
    net_revenue: float
    seats_sold: int
    occupancy_rate: float


class TimeSeriesPoint(BaseModel):
    label: str
    value: float


class NamedValue(BaseModel):
    name: str
    value: float


class DashboardCharts(BaseModel):
    booking_trend: List[TimeSeriesPoint] = []
    revenue_trend: List[TimeSeriesPoint] = []
    popular_routes: List[NamedValue] = []
    payment_status_distribution: List[NamedValue] = []
    bus_type_distribution: List[NamedValue] = []
    occupancy_by_trip: List[NamedValue] = []


class DashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts


class AdminUserOut(ORMModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    status: UserStatus
    created_at: datetime
    last_login_at: Optional[datetime] = None
    bookings_count: int = 0


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None


class OperatorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    company_name: str = Field(min_length=2, max_length=120)
    license_number: Optional[str] = Field(default=None, max_length=64)
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    is_verified: bool = False


class OperatorUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    company_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    license_number: Optional[str] = Field(default=None, max_length=64)
    contact_phone: Optional[str] = Field(default=None, max_length=32)
    is_verified: Optional[bool] = None


class OperatorOut(ORMModel):
    id: str
    company_name: str
    license_number: Optional[str] = None
    contact_phone: Optional[str] = None
    is_verified: bool
    user_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    buses_count: int = 0


class ReportKPI(BaseModel):
    label: str
    value: float
    previous: Optional[float] = None


class ReportsResponse(BaseModel):
    range_start: datetime
    range_end: datetime
    kpis: List[ReportKPI]
    booking_trend: List[TimeSeriesPoint]
    revenue_trend: List[TimeSeriesPoint]
    revenue_by_method: List[NamedValue]
    top_routes: List[NamedValue]
    top_operators: List[NamedValue]


class SystemSettingOut(ORMModel):
    key: str
    value: object
    description: Optional[str] = None


class SystemSettingUpdate(BaseModel):
    value: object


class AuditLogOut(ORMModel):
    id: str
    actor_user_id: Optional[str]
    actor_role: Optional[str]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    ip_address: Optional[str]
    detail: Optional[dict]
    created_at: datetime
