from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import BookingStatus, SeatCategory


class PassengerInput(BaseModel):
    seat_id: str
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=32)
    email: Optional[EmailStr] = None
    id_number: Optional[str] = Field(default=None, max_length=64)


class BookingCreate(BaseModel):
    trip_id: str
    seat_ids: List[str] = Field(min_length=1, max_length=10)
    passengers: List[PassengerInput]
    contact_name: str = Field(min_length=2, max_length=120)
    contact_phone: str = Field(min_length=6, max_length=32)
    contact_email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def seats_match_passengers(self):
        if len(self.seat_ids) != len(self.passengers):
            raise ValueError("Number of passengers must equal number of seats")
        if len(set(self.seat_ids)) != len(self.seat_ids):
            raise ValueError("Duplicate seat selected")
        pax_seats = [p.seat_id for p in self.passengers]
        if sorted(pax_seats) != sorted(self.seat_ids):
            raise ValueError("Passenger seat assignments do not match selected seats")
        return self


class BookingSeatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    seat_id: str
    seat_number: str
    category: SeatCategory
    price: float


class BookingPassengerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    seat_number: str
    full_name: str
    phone: str
    email: Optional[str] = None
    id_number: Optional[str] = None


class BookingTripInfo(BaseModel):
    id: str
    departure_at: datetime
    arrival_at: datetime
    origin: str
    destination: str
    operator: str
    bus_name: str
    bus_registration: str


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reference: str
    user_id: str
    trip_id: str
    status: BookingStatus
    seat_count: int
    subtotal: float
    fees: float
    total_amount: float
    currency: str
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    expires_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    created_at: datetime
    seats: List[BookingSeatOut] = []
    passengers: List[BookingPassengerOut] = []
    trip: Optional[BookingTripInfo] = None
    has_ticket: bool = False
    ticket_id: Optional[str] = None

    @field_validator("trip", mode="before")
    @classmethod
    def _drop_raw_trip(cls, v):
        # The ORM relationship returns a full Trip object; the rich trip payload
        # is assembled separately in booking_service.to_booking_out().
        if isinstance(v, (dict, BookingTripInfo)) or v is None:
            return v
        return None


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=255)
