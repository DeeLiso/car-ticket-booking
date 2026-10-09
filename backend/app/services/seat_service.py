from __future__ import annotations

from datetime import timedelta
from typing import Iterable, Optional

from sqlalchemy import and_, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, SeatUnavailableError
from app.models.booking import Booking
from app.models.catalog import BusSeat
from app.models.enums import BookingStatus, InventoryStatus, TripStatus
from app.models.trip import Trip, TripSeatInventory
from app.utils.timeutil import now_utc


def release_expired_holds(db: Session, *, commit: bool = True, trip_id: Optional[str] = None) -> int:
    """Release RESERVED seats whose hold has lapsed and expire their bookings.

    Returns the number of seats released. Safe to call from a background task or
    lazily before serving a seat map.
    """
    now = now_utc()
    stmt = update(TripSeatInventory).where(
        TripSeatInventory.status == InventoryStatus.RESERVED.value,
        TripSeatInventory.hold_expires_at.is_not(None),
        TripSeatInventory.hold_expires_at < now,
    )
    if trip_id:
        stmt = stmt.where(TripSeatInventory.trip_id == trip_id)
    stmt = stmt.execution_options(synchronize_session=False)
    result = db.execute(
        stmt.values(status=InventoryStatus.AVAILABLE.value, booking_id=None, hold_expires_at=None)
    )
    released = result.rowcount or 0

    booking_stmt = (
        update(Booking)
        .where(
            Booking.status == BookingStatus.PENDING.value,
            Booking.expires_at.is_not(None),
            Booking.expires_at < now,
        )
        .execution_options(synchronize_session=False)
        .values(status=BookingStatus.EXPIRED.value, updated_at=now)
    )
    if trip_id:
        booking_stmt = booking_stmt.where(Booking.trip_id == trip_id)
    db.execute(booking_stmt)
    if commit:
        db.commit()
    return released


def ensure_inventory_for_trip(db: Session, trip: Trip) -> None:
    """Create the per-trip seat inventory from the bus layout (idempotent)."""
    existing = db.scalar(
        select(TripSeatInventory.id).where(TripSeatInventory.trip_id == trip.id).limit(1)
    )
    if existing:
        return
    seats = db.scalars(
        select(BusSeat).where(BusSeat.bus_id == trip.bus_id, BusSeat.is_active.is_(True))
    ).all()
    if not seats:
        raise ConflictError("The bus assigned to this trip has no seat layout configured")
    base = float(trip.base_price)
    for seat in seats:
        db.add(
            TripSeatInventory(
                trip_id=trip.id,
                seat_id=seat.id,
                seat_number=seat.seat_number,
                category=seat.category,
                row_index=seat.row_index,
                col_index=seat.col_index,
                price=round(base * float(seat.price_multiplier or 1.0), 2),
                status=InventoryStatus.AVAILABLE.value,
            )
        )
    db.flush()


def get_trip_or_404(db: Session, trip_id: str) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError("Trip not found")
    return trip


def count_available_seats(db: Session, trip_id: str) -> int:
    from sqlalchemy import func

    return int(
        db.scalar(
            select(func.count(TripSeatInventory.id)).where(
                TripSeatInventory.trip_id == trip_id,
                TripSeatInventory.status == InventoryStatus.AVAILABLE.value,
            )
        )
        or 0
    )


def claim_seats_atomic(
    db: Session, trip: Trip, seat_ids: Iterable[str], booking_id: str
) -> list[TripSeatInventory]:
    """Atomically reserve seats for a booking inside the caller's transaction.

    Strategy (belt and braces - see README "Double booking"):
      1. Lock the inventory rows (``SELECT ... FOR UPDATE`` on PostgreSQL) so
         concurrent claimers serialize on the same rows.
      2. Perform a single conditional ``UPDATE ... WHERE status='AVAILABLE'`` and
         verify ``rowcount``. This test-and-set is atomic on PostgreSQL *and*
         SQLite, so it remains correct even if row locking is unavailable.
    Raises ``SeatUnavailableError`` (HTTP 409) and must be called within a
    transaction that the caller rolls back on failure.
    """
    seat_ids = list(dict.fromkeys(seat_ids))
    now = now_utc()
    expires = now + timedelta(minutes=settings.seat_reservation_timeout_minutes)

    # 1. Lock rows (no-op on SQLite) to reduce contention/retries on Postgres.
    lock_stmt = (
        select(TripSeatInventory)
        .where(
            TripSeatInventory.trip_id == trip.id,
            TripSeatInventory.seat_id.in_(seat_ids),
        )
        .order_by(TripSeatInventory.seat_id)
    )
    if not settings.is_sqlite:
        lock_stmt = lock_stmt.with_for_update()
    rows = db.scalars(lock_stmt).all()

    found = {r.seat_id for r in rows}
    missing = set(seat_ids) - found
    if missing:
        raise ConflictError("One or more seats do not belong to this trip", detail={"seat_ids": sorted(missing)})

    claimed: list[TripSeatInventory] = []
    failed: list[str] = []
    for seat_id in seat_ids:
        res = db.execute(
            update(TripSeatInventory)
            .where(
                TripSeatInventory.trip_id == trip.id,
                TripSeatInventory.seat_id == seat_id,
                or_(
                    TripSeatInventory.status == InventoryStatus.AVAILABLE.value,
                    and_(
                        TripSeatInventory.status == InventoryStatus.RESERVED.value,
                        TripSeatInventory.hold_expires_at.is_not(None),
                        TripSeatInventory.hold_expires_at < now,
                    ),
                ),
            )
            .execution_options(synchronize_session=False)
            .values(
                status=InventoryStatus.RESERVED.value,
                booking_id=booking_id,
                hold_expires_at=expires,
            )
        )
        if res.rowcount != 1:
            failed.append(seat_id)
        else:
            claimed.append(db.get(TripSeatInventory, _inventory_id(rows, seat_id)))

    if failed:
        raise SeatUnavailableError(
            "Some selected seats were just taken by another passenger",
            detail={"unavailable_seats": failed},
        )
    return claimed


def _inventory_id(rows, seat_id: str) -> str:
    for r in rows:
        if r.seat_id == seat_id:
            return r.id
    raise SeatUnavailableError("Seat not found during claim")


def mark_seats_sold(db: Session, booking: Booking) -> int:
    result = db.execute(
        update(TripSeatInventory)
        .where(
            TripSeatInventory.booking_id == booking.id,
            TripSeatInventory.trip_id == booking.trip_id,
        )
        .values(status=InventoryStatus.SOLD.value, hold_expires_at=None)
    )
    return result.rowcount or 0


def release_seats_for_booking(db: Session, booking: Booking) -> int:
    result = db.execute(
        update(TripSeatInventory)
        .where(
            TripSeatInventory.booking_id == booking.id,
            TripSeatInventory.status.in_(
                [InventoryStatus.RESERVED.value, InventoryStatus.SOLD.value]
            ),
        )
        .values(status=InventoryStatus.AVAILABLE.value, booking_id=None, hold_expires_at=None)
    )
    return result.rowcount or 0
