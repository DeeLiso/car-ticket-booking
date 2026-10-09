from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.core.exceptions import NotFoundError
from app.core.security import new_ticket_token
from app.models.booking import Booking
from app.models.enums import UserRole
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketOut, ValidateTicketRequest, ValidateTicketResponse
from app.services import ticket_service
from app.utils.pdf import build_ticket_pdf
from app.utils.qr import make_qr_png

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("/lookup", response_model=TicketOut)
def lookup_by_reference(
    reference: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.scalar(select(Booking).where(Booking.reference == reference.upper()))
    if booking is None or booking.ticket is None:
        raise NotFoundError("No ticket found for that booking reference")
    if user.role not in (UserRole.ADMIN.value, UserRole.BUS_OPERATOR.value) and booking.user_id != user.id:
        from app.core.exceptions import ForbiddenError

        raise ForbiddenError("This ticket does not belong to you")
    return ticket_service.build_ticket_out(db, booking.ticket)


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = ticket_service.get_ticket_for_user(db, ticket_id, user)
    return ticket_service.build_ticket_out(db, ticket)


@router.get("/{ticket_id}/qr")
def get_ticket_qr(
    ticket_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = ticket_service.get_ticket_for_user(db, ticket_id, user)
    payload = ticket_service.ticket_qr_payload(ticket)
    return Response(content=make_qr_png(payload), media_type="image/png")


@router.get("/{ticket_id}/pdf")
def get_ticket_pdf(
    ticket_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ticket = ticket_service.get_ticket_for_user(db, ticket_id, user)
    booking = ticket.booking
    info = ticket_service._trip_info(db, booking.trip)  # noqa: SLF001
    payload = ticket_service.ticket_qr_payload(ticket)
    pdf = build_ticket_pdf(booking=booking, ticket=ticket, qr_payload=payload, trip_info=info)
    headers = {"Content-Disposition": f'attachment; filename="ticket-{ticket.ticket_number}.pdf"'}
    return StreamingResponse(iter([pdf]), media_type="application/pdf", headers=headers)


@router.post("/validate", response_model=ValidateTicketResponse)
def validate_ticket(
    payload: ValidateTicketRequest,
    user: User = Depends(require_roles(UserRole.BUS_OPERATOR, UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return ticket_service.validate_ticket(
        db,
        raw_token=payload.token,
        trip_id=payload.trip_id,
        validator=user,
        method=payload.method,
    )
