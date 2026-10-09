from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk
from app.models.enums import TicketStatus, ValidationOutcome

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.trip import Trip
    from app.models.user import User


class Ticket(Base, UUIDPk, TimestampMixin):
    """Digital ticket for a booking.

    ``token_hash`` stores a SHA-256 of the opaque QR token; the raw token is
    only ever returned once (at issue time) so the QR code never contains
    passenger PII and a database leak cannot be replayed as valid tickets.
    """

    __tablename__ = "tickets"

    booking_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    ticket_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=TicketStatus.ACTIVE.value, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    used_by: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL")
    )

    booking: Mapped["Booking"] = relationship(back_populates="ticket")
    validations: Mapped[list["TicketValidation"]] = relationship(
        back_populates="ticket", cascade="all, delete-orphan"
    )


class TicketValidation(Base, UUIDPk, TimestampMixin):
    """Audit trail of every QR scan / manual validation attempt."""

    __tablename__ = "ticket_validations"
    __table_args__ = (Index("ix_ticket_validations_ticket_created", "ticket_id", "created_at"),)

    ticket_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("tickets.id", ondelete="CASCADE")
    )
    trip_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("trips.id", ondelete="SET NULL"))
    validated_by: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL")
    )
    outcome: Mapped[str] = mapped_column(String(24), nullable=False, default=ValidationOutcome.VALID.value)
    method: Mapped[str] = mapped_column(String(16), nullable=False, default="QR")
    raw_token_hash: Mapped[Optional[str]] = mapped_column(String(64))
    note: Mapped[Optional[str]] = mapped_column(String(255))

    ticket: Mapped[Optional["Ticket"]] = relationship(back_populates="validations")
