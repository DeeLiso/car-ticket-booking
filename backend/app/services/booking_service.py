from __future__ import annotations

from datetime import timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PaymentError,
    PreconditionFailed,
)
from app.models.booking import Booking, BookingPassenger, BookingSeat
from app.models.catalog import Route
from app.models.enums import (
    BookingStatus,
    PaymentStatus,
    RefundStatus,
    TicketStatus,
    TripStatus,
    UserRole,
)
from app.models.payment import Payment, Refund
from app.models.ticket import Ticket
from app.models.trip import Trip
from app.schemas.booking import BookingOut, BookingTripInfo
from app.services import seat_service
from app.utils.refs import generate_unique_reference
from app.utils.timeutil import ensure_aware, now_utc


def _trip_info(db: Session, trip: Trip) -> BookingTripInfo:
    route = db.get(Route, trip.route_id)
    origin = route.origin_city.name if route and route.origin_city else "?"
    destination = route.destination_city.name if route and route.destination_city else "?"
    operator_name = "Unknown"
    bus_name = trip.bus.name if trip.bus else "?"
    bus_reg = trip.bus.registration_number if trip.bus else "?"
    if trip.bus:
        from app.models.catalog import Bus
        from app.models.user import OperatorProfile

        bus = db.get(Bus, trip.bus_id)
        if bus:
            profile = db.scalar(
                select(OperatorProfile).where(OperatorProfile.user_id == bus.operator_id)
            )
            if profile:
                operator_name = profile.company_name
    return BookingTripInfo(
        id=trip.id,
        departure_at=ensure_aware(trip.departure_at),
        arrival_at=ensure_aware(trip.arrival_at),
        origin=origin,
        destination=destination,
        operator=operator_name,
        bus_name=bus_name,
        bus_registration=bus_reg,
    )


def to_booking_out(db: Session, booking: Booking, *, include_trip: bool = True) -> BookingOut:
    data = BookingOut.model_validate(booking)
    if booking.ticket is not None:
        data.has_ticket = booking.ticket.status != TicketStatus.CANCELLED.value
        data.ticket_id = booking.ticket.id
    if include_trip and booking.trip is not None:
        data.trip = _trip_info(db, booking.trip)
    return data


def _validate_bookable(trip: Trip) -> None:
    if trip.status in (TripStatus.CANCELLED.value, TripStatus.COMPLETED.value, TripStatus.DEPARTED.value):
        raise ConflictError(f"Trip is {trip.status.lower()} and cannot be booked")
    if ensure_aware(trip.departure_at) <= now_utc():
        raise ConflictError("This trip has already departed")


def create_booking(
    db: Session,
    *,
    user_id: str,
    trip_id: str,
    seat_ids: list[str],
    passengers: list,
    contact_name: str,
    contact_phone: str,
    contact_email: Optional[str],
) -> Booking:
    # Lazily release lapsed holds before evaluating availability (same transaction).
    seat_service.release_expired_holds(db, commit=False, trip_id=trip_id)

    trip = seat_service.get_trip_or_404(db, trip_id)
    _validate_bookable(trip)

    seat_ids = list(dict.fromkeys(seat_ids))

    booking = Booking(
        reference=generate_unique_reference(db, Booking, Booking.reference, "CTB", 6),
        user_id=user_id,
        trip_id=trip.id,
        status=BookingStatus.PENDING.value,
        seat_count=len(seat_ids),
        contact_name=contact_name,
        contact_phone=contact_phone,
        contact_email=contact_email,
        expires_at=now_utc() + timedelta(minutes=settings.booking_expiry_minutes),
        currency="MMK",
    )
    db.add(booking)
    db.flush()  # obtain booking.id for the seat claim

    try:
        claimed = seat_service.claim_seats_atomic(db, trip, seat_ids, booking.id)
    except Exception:
        db.rollback()
        raise

    # Totals are always derived from server-side inventory prices.
    price_by_seat = {row.seat_id: row for row in claimed}
    subtotal = 0.0
    for seat_id in seat_ids:
        inv = price_by_seat[seat_id]
        subtotal += float(inv.price)
        db.add(
            BookingSeat(
                booking_id=booking.id,
                trip_id=trip.id,
                seat_id=seat_id,
                seat_number=inv.seat_number,
                category=inv.category,
                price=float(inv.price),
            )
        )
    fees = round(subtotal * settings.booking_fee_percent / 100.0, 2)
    booking.subtotal = round(subtotal, 2)
    booking.fees = fees
    booking.total_amount = round(subtotal + fees, 2)

    for pax in passengers:
        inv = price_by_seat[pax.seat_id]
        db.add(
            BookingPassenger(
                booking_id=booking.id,
                seat_id=pax.seat_id,
                seat_number=inv.seat_number,
                full_name=pax.full_name,
                phone=pax.phone,
                email=str(pax.email) if pax.email else None,
                id_number=pax.id_number,
            )
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Booking could not be completed due to a seat conflict")
    db.refresh(booking)
    return booking


def confirm_after_payment(db: Session, booking: Booking, *, commit: bool = True) -> Booking:
    """Confirm a booking once payment is verified. Idempotent."""
    if booking.status == BookingStatus.CONFIRMED.value:
        return booking
    if booking.status != BookingStatus.PENDING.value:
        raise ConflictError(f"Booking in status {booking.status} cannot be confirmed")
    if booking.expires_at is not None and ensure_aware(booking.expires_at) < now_utc():
        raise PreconditionFailed("Booking reservation has expired")

    seat_service.mark_seats_sold(db, booking)
    booking.status = BookingStatus.CONFIRMED.value
    booking.confirmed_at = now_utc()
    db.flush()
    if commit:
        db.commit()
        db.refresh(booking)
    return booking


def get_booking_for_user(db: Session, booking_id: str, user) -> Booking:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise NotFoundError("Booking not found")
    if user.role == UserRole.ADMIN.value:
        return booking
    if user.role == UserRole.BUS_OPERATOR.value:
        if booking.trip and _operator_owns_trip(db, booking.trip, user.id):
            return booking
        raise ForbiddenError("This booking does not belong to your trips")
    if booking.user_id != user.id:
        raise ForbiddenError("This booking does not belong to you")
    return booking


def _operator_owns_trip(db: Session, trip: Trip, operator_user_id: str) -> bool:
    from app.models.catalog import Bus

    bus = db.get(Bus, trip.bus_id)
    return bool(bus and bus.operator_id == operator_user_id)


def cancel_booking(
    db: Session,
    booking_id: str,
    user,
    *,
    reason: Optional[str] = None,
    force: bool = False,
) -> Booking:
    booking = get_booking_for_user(db, booking_id, user)
    if booking.status not in (BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value):
        raise ConflictError(f"Booking in status {booking.status} cannot be cancelled")

    if not force:
        cutoff = ensure_aware(booking.trip.departure_at) - timedelta(hours=settings.cancellation_cutoff_hours)
        if now_utc() > cutoff:
            raise PreconditionFailed(
                f"Cancellation window closed ({settings.cancellation_cutoff_hours}h before departure)"
            )

    payment = db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking.id, Payment.status == PaymentStatus.SUCCEEDED.value)
        .order_by(Payment.created_at.desc())
    )

    seat_service.release_seats_for_booking(db, booking)

    if booking.ticket is not None:
        booking.ticket.status = TicketStatus.CANCELLED.value

    if payment is not None:
        # Refundable amount = paid amount minus any already-processed refund.
        from sqlalchemy import func

        refunded = db.scalar(
            select(func.coalesce(func.sum(Refund.amount), 0)).where(
                Refund.payment_id == payment.id,
                Refund.status == RefundStatus.PROCESSED.value,
            )
        ) or 0
        refundable = float(payment.amount) - float(refunded)
        if refundable > 0:
            db.add(
                Refund(
                    payment_id=payment.id,
                    booking_id=booking.id,
                    amount=round(refundable, 2),
                    currency=payment.currency,
                    status=RefundStatus.REQUESTED.value,
                    reason=reason or "Passenger cancellation",
                    reference=generate_unique_reference(db, Refund, Refund.reference, "RFD", 8),
                    requested_by=user.id,
                )
            )
            payment.status = PaymentStatus.REFUND_PENDING.value
            booking.status = BookingStatus.REFUND_PENDING.value
        else:
            booking.status = BookingStatus.CANCELLED.value
    else:
        booking.status = BookingStatus.CANCELLED.value

    booking.cancelled_at = now_utc()
    booking.cancellation_reason = reason
    db.commit()
    db.refresh(booking)
    return booking
