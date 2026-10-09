from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk
from app.models.enums import InventoryStatus, TripStatus

if TYPE_CHECKING:
    from app.models.booking import Booking
    from app.models.catalog import BusSeat


class Trip(Base, UUIDPk, TimestampMixin):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("arrival_at > departure_at", name="arrival_after_departure"),
        CheckConstraint("base_price >= 0", name="price_non_negative"),
        Index("ix_trips_route_departure", "route_id", "departure_at"),
        Index("ix_trips_departure_at", "departure_at"),
        Index("ix_trips_bus_departure", "bus_id", "departure_at"),
    )

    route_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("routes.id", ondelete="RESTRICT"), nullable=False
    )
    bus_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    departure_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    arrival_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    base_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=TripStatus.SCHEDULED.value, index=True)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(String(255))

    route: Mapped["Route"] = relationship()  # noqa: F821
    bus: Mapped["Bus"] = relationship()  # noqa: F821

    @property
    def duration_minutes(self) -> int:
        return int((self.arrival_at - self.departure_at).total_seconds() // 60)


class TripSeatInventory(Base, UUIDPk, TimestampMixin):
    """Per-trip seat state. Exactly one row per (trip, seat).

    This table is the single source of truth for seat availability. Booking
    claims are performed with an atomic conditional UPDATE on this row, which
    guarantees that only one concurrent transaction can move a seat from
    AVAILABLE to RESERVED - enforced by the DB on both PostgreSQL and SQLite.
    """

    __tablename__ = "trip_seat_inventory"
    __table_args__ = (
        UniqueConstraint("trip_id", "seat_id", name="uq_trip_seat_inventory_trip_seat"),
        CheckConstraint("price >= 0", name="inventory_price_non_negative"),
        # A RESERVED/SOLD seat must always be attributed to a booking.
        CheckConstraint(
            "status IN ('AVAILABLE','BLOCKED') OR booking_id IS NOT NULL",
            name="claimed_seat_has_booking",
        ),
        Index("ix_trip_seat_inventory_trip_status", "trip_id", "status"),
    )

    trip_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    seat_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bus_seats.id", ondelete="RESTRICT"), nullable=False
    )
    seat_number: Mapped[str] = mapped_column(String(8), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="ORDINARY")
    row_index: Mapped[int] = mapped_column(nullable=False, default=0)
    col_index: Mapped[int] = mapped_column(nullable=False, default=0)
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=InventoryStatus.AVAILABLE.value, index=True
    )
    booking_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("bookings.id", ondelete="SET NULL"))
    hold_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    trip: Mapped["Trip"] = relationship()
    seat: Mapped["BusSeat"] = relationship()

    @property
    def is_hold_expired(self) -> bool:
        if self.status != InventoryStatus.RESERVED.value or self.hold_expires_at is None:
            return False
        from datetime import timezone

        exp = self.hold_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return exp <= datetime.now(timezone.utc)
