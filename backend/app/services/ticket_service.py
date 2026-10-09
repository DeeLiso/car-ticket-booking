from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import (
    hash_ticket_token,
    sign_ticket_reference,
    verify_ticket_reference,
)
from app.db.base import gen_uuid
from app.models.booking import Booking
from app.models.enums import (
    BookingStatus,
    PaymentStatus,
    TicketStatus,
    UserRole,
    ValidationOutcome,
)
from app.models.payment import Payment
from app.models.ticket import Ticket, TicketValidation
from app.models.user import User
from app.schemas.ticket import TicketOut, ValidateTicketResponse
from app.services.booking_service import _trip_info, to_booking_out
from app.utils.refs import generate_unique_reference
from app.utils.timeutil import ensure_aware, now_utc


def issue_ticket(db: Session, booking: Booking) -> Tuple[Ticket, Optional[str]]:
    """Create the single ticket for a booking. Returns ``(ticket, raw_token)``.

    The signed token is deterministic from ``ticket.id`` so it can be
    regenerated for rendering (QR / PDF); storing its hash lets us detect any
    tampering with the persisted record.
    """
    existing = db.scalar(select(Ticket).where(Ticket.booking_id == booking.id))
    if existing is not None:
        return existing, sign_ticket_reference(existing.id)

    ticket_id = gen_uuid()
    raw_token = sign_ticket_reference(ticket_id)
    ticket = Ticket(
        id=ticket_id,
        booking_id=booking.id,
        ticket_number=generate_unique_reference(db, Ticket, Ticket.ticket_number, "TKT", 8),
        token_hash=hash_ticket_token(raw_token),
        status=TicketStatus.ACTIVE.value,
        issued_at=now_utc(),
    )
    db.add(ticket)
    db.flush()
    return ticket, raw_token


def build_ticket_out(db: Session, ticket: Ticket) -> TicketOut:
    booking = ticket.booking
    data = TicketOut.model_validate(ticket)
    data.booking_reference = booking.reference
    data.passenger_names = [p.full_name for p in booking.passengers]
    data.seat_numbers = [s.seat_number for s in booking.seats]
    data.trip = _trip_info(db, booking.trip)
    payment = db.scalar(
        select(Payment)
        .where(Payment.booking_id == booking.id, Payment.status == PaymentStatus.SUCCEEDED.value)
        .order_by(Payment.created_at.desc())
    )
    data.payment_status = payment.status if payment else None
    return data


def get_ticket_for_user(db: Session, ticket_id: str, user: User) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise NotFoundError("Ticket not found")
    booking = ticket.booking
    if user.role == UserRole.ADMIN.value:
        return ticket
    if user.role == UserRole.BUS_OPERATOR.value:
        from app.services.booking_service import _operator_owns_trip

        if booking.trip and _operator_owns_trip(db, booking.trip, user.id):
            return ticket
        raise ForbiddenError("This ticket does not belong to your trips")
    if booking.user_id != user.id:
        raise ForbiddenError("This ticket does not belong to you")
    return ticket


def _record_validation(
    db: Session,
    *,
    ticket: Optional[Ticket],
    trip_id: Optional[str],
    validated_by: Optional[str],
    outcome: ValidationOutcome,
    method: str,
    raw_token: str,
    note: Optional[str] = None,
) -> None:
    # Always record against a trip that exists. If the operator scanned under a
    # trip id that differs from the ticket's, log it under the ticket's trip so
    # the FK stays valid (the mismatch is captured in the outcome + note).
    recorded_trip_id = trip_id
    if ticket is not None and ticket.booking is not None:
        recorded_trip_id = ticket.booking.trip_id
    db.add(
        TicketValidation(
            ticket_id=ticket.id if ticket else None,
            trip_id=recorded_trip_id or (ticket.booking.trip_id if ticket else None),
            validated_by=validated_by,
            outcome=outcome.value,
            method=method,
            raw_token_hash=hash_ticket_token(raw_token),
            note=note,
        )
    )


def ticket_qr_payload(ticket: Ticket) -> str:
    """Regenerate the QR payload for a ticket (deterministic signed reference)."""
    return sign_ticket_reference(ticket.id)


def validate_ticket(
    db: Session,
    *,
    raw_token: str,
    trip_id: Optional[str],
    validator: User,
    method: str = "QR",
) -> ValidateTicketResponse:
    ticket_id = verify_ticket_reference(raw_token)
    ticket = db.get(Ticket, ticket_id) if ticket_id else None
    if ticket is not None and ticket.token_hash != hash_ticket_token(raw_token):
        ticket = None  # signature matched but stored fingerprint differs: reject

    def respond(outcome: ValidationOutcome, message: str, t: Optional[Ticket] = None) -> ValidateTicketResponse:
        _record_validation(
            db,
            ticket=t,
            trip_id=trip_id,
            validated_by=validator.id,
            outcome=outcome,
            method=method,
            raw_token=raw_token,
            note=message,
        )
        db.commit()
        if t is None:
            return ValidateTicketResponse(outcome=outcome, valid=False, message=message)
        return ValidateTicketResponse(
            outcome=outcome,
            valid=outcome == ValidationOutcome.VALID,
            message=message,
            ticket_number=t.ticket_number,
            booking_reference=t.booking.reference,
            passenger_names=[p.full_name for p in t.booking.passengers],
            seat_numbers=[s.seat_number for s in t.booking.seats],
            trip_id=t.booking.trip_id,
        )

    if ticket is None:
        return respond(ValidationOutcome.NOT_FOUND, "Ticket not found")

    booking = ticket.booking
    if booking is None:
        return respond(ValidationOutcome.NOT_FOUND, "Ticket has no booking")

    if trip_id and booking.trip_id != trip_id:
        return respond(ValidationOutcome.WRONG_TRIP, "Ticket belongs to a different trip", ticket)

    if ticket.status == TicketStatus.CANCELLED.value or booking.status in (
        BookingStatus.CANCELLED.value,
        BookingStatus.EXPIRED.value,
        BookingStatus.REFUNDED.value,
    ):
        return respond(ValidationOutcome.CANCELLED, "Ticket was cancelled", ticket)

    if booking.status != BookingStatus.CONFIRMED.value:
        return respond(ValidationOutcome.NOT_CONFIRMED, "Booking is not confirmed", ticket)

    paid = db.scalar(
        select(Payment).where(
            Payment.booking_id == booking.id,
            Payment.status == PaymentStatus.SUCCEEDED.value,
        )
    )
    if paid is None:
        return respond(ValidationOutcome.PAYMENT_INVALID, "No successful payment for this ticket", ticket)

    if settings.ticket_single_use and (ticket.used_at is not None or ticket.status == TicketStatus.USED.value):
        used = ensure_aware(ticket.used_at) if ticket.used_at else None
        return respond(
            ValidationOutcome.ALREADY_USED,
            f"Ticket already used at {used.isoformat() if used else 'unknown time'}",
            ticket,
        )

    if settings.ticket_single_use:
        ticket.used_at = now_utc()
        ticket.status = TicketStatus.USED.value
        ticket.used_by = validator.id

    return respond(ValidationOutcome.VALID, "Ticket is valid", ticket)


def booking_ticket_summary(db: Session, booking: Booking) -> Optional[TicketOut]:
    if booking.ticket is None:
        return None
    return build_ticket_out(db, booking.ticket)
