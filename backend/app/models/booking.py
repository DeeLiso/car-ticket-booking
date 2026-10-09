from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk
from app.models.enums import BookingStatus

if TYPE_CHECKING:
    from app.models.payment import Payment
    from app.models.ticket import Ticket
    from app.models.trip import Trip
    from app.models.user import User


class Booking(Base, UUIDPk, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("seat_count > 0", name="seat_count_positive"),
        CheckConstraint("total_amount >= 0", name="total_non_negative"),
        Index("ix_bookings_user_status", "user_id", "status"),
        Index("ix_bookings_trip_status", "trip_id", "status"),
    )

    reference: Mapped[str] = mapped_column(String(24), nullable=False, unique=True, index=True)
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    trip_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("trips.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=BookingStatus.PENDING.value, index=True
    )
    seat_count: Mapped[int] = mapped_column(nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    fees: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="MMK")
    contact_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), index=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(255))

    user: Mapped["User"] = relationship(back_populates="bookings")
    trip: Mapped["Trip"] = relationship()
    seats: Mapped[list["BookingSeat"]] = relationship(
        back_populates="booking", cascade="all, delete-orphan", lazy="selectin"
    )
    passengers: Mapped[list["BookingPassenger"]] = relationship(
        back_populates="booking", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="booking")
    ticket: Mapped[Optional["Ticket"]] = relationship(
        back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )


class BookingSeat(Base, UUIDPk, TimestampMixin):
    """Seat lines of a booking. Kept after cancellation for history, therefore a
    database-level uniqueness for *active* bookings is enforced on
    ``trip_seat_inventory`` instead of here."""

    __tablename__ = "booking_seats"
    __table_args__ = (
        UniqueConstraint("booking_id", "seat_id", name="uq_booking_seats_booking_seat"),
        CheckConstraint("price >= 0", name="booking_seat_price_non_negative"),
        Index("ix_booking_seats_trip_seat", "trip_id", "seat_id"),
    )

    booking_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id: Mapped[str] = mapped_column(String(32), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    seat_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bus_seats.id", ondelete="RESTRICT"), nullable=False
    )
    seat_number: Mapped[str] = mapped_column(String(8), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="ORDINARY")
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    booking: Mapped["Booking"] = relationship(back_populates="seats")


class BookingPassenger(Base, UUIDPk, TimestampMixin):
    """One row per seat: passenger data is captured once, at booking time."""

    __tablename__ = "booking_passengers"
    __table_args__ = (
        UniqueConstraint("booking_id", "seat_id", name="uq_booking_passengers_booking_seat"),
    )

    booking_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seat_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("bus_seats.id", ondelete="SET NULL"))
    seat_number: Mapped[str] = mapped_column(String(8), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255))
    id_number: Mapped[Optional[str]] = mapped_column(String(64))

    booking: Mapped["Booking"] = relationship(back_populates="passengers")
