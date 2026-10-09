from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import TicketStatus, ValidationOutcome
from app.schemas.booking import BookingTripInfo


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    booking_id: str
    ticket_number: str
    status: TicketStatus
    issued_at: datetime
    used_at: Optional[datetime] = None
    booking_reference: Optional[str] = None
    passenger_names: List[str] = []
    seat_numbers: List[str] = []
    trip: Optional[BookingTripInfo] = None
    payment_status: Optional[str] = None


class TicketIssueResponse(BaseModel):
    ticket: TicketOut
    # Raw opaque QR token - returned only once, at issue time.
    qr_token: str
    qr_payload: str


class ValidateTicketRequest(BaseModel):
    token: str
    trip_id: Optional[str] = None
    method: str = "QR"


class ValidateTicketResponse(BaseModel):
    outcome: ValidationOutcome
    valid: bool
    message: str
    ticket_number: Optional[str] = None
    booking_reference: Optional[str] = None
    passenger_names: List[str] = []
    seat_numbers: List[str] = []
    trip_id: Optional[str] = None
