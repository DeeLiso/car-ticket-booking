from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import InventoryStatus, SeatCategory, TripStatus
from app.schemas.catalog import CityOut


class TripSearchParams(BaseModel):
    origin_city_id: Optional[str] = None
    destination_city_id: Optional[str] = None
    departure_date: Optional[datetime] = None
    passengers: int = Field(default=1, ge=1, le=10)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)
    sort: str = Field(default="departure", pattern="^(price|departure|duration)$")
    # filters
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)
    bus_type: Optional[str] = None
    operator_id: Optional[str] = None
    departure_window: Optional[str] = Field(default=None, pattern="^(morning|afternoon|evening|night)$")


class TripOperator(BaseModel):
    id: str
    company_name: str
    is_verified: bool


class TripBusInfo(BaseModel):
    id: str
    name: str
    registration_number: str
    bus_type: str
    layout: str
    amenities: List[str] = []


class TripSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    departure_at: datetime
    arrival_at: datetime
    base_price: float
    status: TripStatus
    duration_minutes: int
    route_id: str
    origin_city: Optional[CityOut] = None
    destination_city: Optional[CityOut] = None
    operator: Optional[TripOperator] = None
    bus: Optional[TripBusInfo] = None
    available_seats: int = 0
    total_seats: int = 0


class SeatStatus(BaseModel):
    seat_id: str
    seat_number: str
    row_index: int
    col_index: int
    category: SeatCategory
    price: float
    is_accessible: bool
    status: InventoryStatus
    # For VIP/ordinary pricing display the multiplier is already applied to price.


class SeatMapResponse(BaseModel):
    trip_id: str
    layout: str
    rows: int
    cols: int
    aisle_after_col: int
    seats: List[SeatStatus]
    available_seats: int
    base_price: float
    currency: str = "MMK"
    hold_expires_at: Optional[datetime] = None


class TripCreate(BaseModel):
    route_id: str
    bus_id: str
    departure_at: datetime
    arrival_at: datetime
    base_price: float = Field(gt=0)
    status: TripStatus = TripStatus.SCHEDULED
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate(self):
        if self.arrival_at <= self.departure_at:
            raise ValueError("arrival_at must be after departure_at")
        return self


class TripUpdate(BaseModel):
    departure_at: Optional[datetime] = None
    arrival_at: Optional[datetime] = None
    base_price: Optional[float] = Field(default=None, gt=0)
    status: Optional[TripStatus] = None
    notes: Optional[str] = None
