from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str
    id_number: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    id_number: Optional[str] = Field(default=None, max_length=64)
    address: Optional[str] = Field(default=None, max_length=255)
    emergency_contact: Optional[str] = Field(default=None, max_length=32)


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class ManifestPassenger(BaseModel):
    booking_reference: str
    passenger_name: str
    phone: str
    seat_number: str
    board_status: str = "NOT_BOARDED"


class TripManifest(BaseModel):
    trip_id: str
    departure_at: datetime
    origin: str
    destination: str
    bus_registration: str
    confirmed_seats: int
    passengers: List[ManifestPassenger]
