from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import BusLayout, BusType, SeatCategory


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    region: Optional[str] = None
    country: str
    is_popular: bool


class RouteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    origin_city_id: str
    destination_city_id: str
    origin_city: Optional[CityOut] = None
    destination_city: Optional[CityOut] = None
    distance_km: Optional[float] = None
    duration_minutes: int
    is_active: bool


class RouteCreate(BaseModel):
    origin_city_id: str
    destination_city_id: str
    distance_km: Optional[float] = Field(default=None, gt=0, le=5000)
    duration_minutes: int = Field(gt=0, le=6000)
    is_active: bool = True

    @field_validator("destination_city_id")
    @classmethod
    def different_cities(cls, v: str, info):
        if v == info.data.get("origin_city_id"):
            raise ValueError("Origin and destination must differ")
        return v


class RouteUpdate(BaseModel):
    distance_km: Optional[float] = Field(default=None, gt=0, le=5000)
    duration_minutes: Optional[int] = Field(default=None, gt=0, le=6000)
    is_active: Optional[bool] = None


class BusSeatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seat_number: str
    row_index: int
    col_index: int
    category: SeatCategory
    price_multiplier: float
    is_accessible: bool
    is_active: bool


class BusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    operator_id: str
    registration_number: str
    name: str
    bus_type: BusType
    layout: BusLayout
    seat_capacity: int
    amenities: List[str]
    is_active: bool
    created_at: datetime


class BusDetail(BusOut):
    seats: List[BusSeatOut] = []


class BusCreate(BaseModel):
    operator_id: Optional[str] = None
    registration_number: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=2, max_length=120)
    bus_type: BusType
    layout: BusLayout
    seat_capacity: int = Field(gt=0, le=100)
    amenities: List[str] = Field(default_factory=list)
    is_active: bool = True
    # Optional explicit custom seat layout, e.g. ["1A","1B",...]. When omitted the
    # layout is generated from ``layout`` + ``seat_capacity``.
    seat_numbers: Optional[List[str]] = None
    vip_rows: int = Field(default=0, ge=0)


class BusUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    bus_type: Optional[BusType] = None
    amenities: Optional[List[str]] = None
    is_active: Optional[bool] = None
