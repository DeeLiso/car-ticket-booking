from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError
from app.models.booking import Booking
from app.models.enums import NotificationType
from app.models.misc import Notification
from app.models.payment import Payment
from app.models.ticket import Ticket
from app.models.user import PassengerProfile, User
from app.schemas.common import Message
from app.schemas.passenger import NotificationOut, ProfileOut, ProfileUpdate
from app.schemas.payment import PaymentOut
from app.schemas.ticket import TicketOut
from app.services import ticket_service

router = APIRouter(prefix="/me", tags=["passenger"])


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.scalar(select(PassengerProfile).where(PassengerProfile.user_id == user.id))
    return ProfileOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role,
        id_number=profile.id_number if profile else None,
        address=profile.address if profile else None,
        emergency_contact=profile.emergency_contact if profile else None,
    )


@router.patch("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"] is not None:
        user.full_name = data["full_name"]
    if "phone" in data:
        user.phone = data["phone"]

    profile = db.scalar(select(PassengerProfile).where(PassengerProfile.user_id == user.id))
    if profile is None:
        profile = PassengerProfile(user_id=user.id)
        db.add(profile)
    for field in ("id_number", "address", "emergency_contact"):
        if field in data:
            setattr(profile, field, data[field])
    db.commit()
    return get_profile(user=user, db=db)


@router.get("/payments", response_model=list[PaymentOut])
def my_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
):
    return db.scalars(
        select(Payment).where(Payment.user_id == user.id).order_by(Payment.created_at.desc()).limit(limit)
    ).all()


@router.get("/tickets", response_model=list[TicketOut])
def my_tickets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=200),
):
    tickets = db.scalars(
        select(Ticket)
        .join(Booking, Ticket.booking_id == Booking.id)
        .where(Booking.user_id == user.id)
        .order_by(Ticket.issued_at.desc())
        .limit(limit)
    ).all()
    return [ticket_service.build_ticket_out(db, t) for t in tickets]


@router.get("/notifications", response_model=list[NotificationOut])
def my_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    unread_only: bool = Query(default=False),
    limit: int = Query(50, ge=1, le=200),
):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    return db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit)).all()


@router.post("/notifications/{notification_id}/read", response_model=Message)
def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notif = db.get(Notification, notification_id)
    if notif is None or notif.user_id != user.id:
        raise NotFoundError("Notification not found")
    from app.utils.timeutil import now_utc

    notif.read_at = now_utc()
    db.commit()
    return Message(detail="Notification marked as read")
