from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError
from app.models.booking import Booking
from app.models.enums import BookingStatus, UserRole
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingOut, CancelBookingRequest
from app.schemas.common import Message, Page
from app.services import booking_service, payment_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = booking_service.create_booking(
        db,
        user_id=user.id,
        trip_id=payload.trip_id,
        seat_ids=payload.seat_ids,
        passengers=payload.passengers,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        contact_email=str(payload.contact_email) if payload.contact_email else None,
    )
    return booking_service.to_booking_out(db, booking)


@router.get("", response_model=Page[BookingOut])
def list_my_bookings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[BookingStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.seats),
            selectinload(Booking.passengers),
            selectinload(Booking.trip),
            selectinload(Booking.ticket),
        )
        .where(Booking.user_id == user.id)
        .order_by(Booking.created_at.desc())
    )
    if status:
        stmt = stmt.where(Booking.status == status.value)

    from app.utils.pagination import paginate

    page_obj = paginate(db, stmt, page, page_size, None)
    page_obj.items = [booking_service.to_booking_out(db, b) for b in page_obj.items]
    return page_obj


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = booking_service.get_booking_for_user(db, booking_id, user)
    return booking_service.to_booking_out(db, booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: str,
    payload: CancelBookingRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = booking_service.cancel_booking(db, booking_id, user, reason=payload.reason)
    return booking_service.to_booking_out(db, booking)
