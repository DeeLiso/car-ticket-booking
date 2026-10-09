from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, and_, case, func, or_, select
from sqlalchemy.orm import Session, aliased

from app.core.exceptions import NotFoundError
from app.models.catalog import Bus, City, Route
from app.models.enums import InventoryStatus, TripStatus, UserRole
from app.models.trip import Trip, TripSeatInventory
from app.models.user import OperatorProfile
from app.schemas.catalog import CityOut
from app.schemas.trip import (
    SeatMapResponse,
    SeatStatus,
    TripBusInfo,
    TripOperator,
    TripSummary,
)
from app.services import seat_service
from app.utils.seat_layout import layout_columns
from app.utils.timeutil import day_bounds_utc, ensure_aware, now_utc


def _available_subquery():
    return (
        select(func.count(TripSeatInventory.id))
        .where(
            TripSeatInventory.trip_id == Trip.id,
            TripSeatInventory.status == InventoryStatus.AVAILABLE.value,
        )
        .correlate(Trip)
        .scalar_subquery()
    )


def _total_subquery():
    return (
        select(func.count(TripSeatInventory.id))
        .where(TripSeatInventory.trip_id == Trip.id)
        .correlate(Trip)
        .scalar_subquery()
    )


def search_trips(db: Session, params) -> tuple[list[TripSummary], int]:
    origin = aliased(City)
    destination = aliased(City)

    available = _available_subquery()
    total = _total_subquery()

    stmt = (
        select(Trip, available.label("available_seats"), total.label("total_seats"))
        .join(Route, Route.id == Trip.route_id)
        .join(origin, origin.id == Route.origin_city_id)
        .join(destination, destination.id == Route.destination_city_id)
        .join(Bus, Bus.id == Trip.bus_id)
        .where(
            Trip.status.in_([TripStatus.SCHEDULED.value, TripStatus.BOARDING.value]),
            Trip.departure_at >= now_utc(),
        )
    )

    if params.origin_city_id:
        stmt = stmt.where(Route.origin_city_id == params.origin_city_id)
    if params.destination_city_id:
        stmt = stmt.where(Route.destination_city_id == params.destination_city_id)
    if params.departure_date:
        start, end = day_bounds_utc(params.departure_date)
        stmt = stmt.where(and_(Trip.departure_at >= start, Trip.departure_at < end))
    if params.min_price is not None:
        stmt = stmt.where(Trip.base_price >= params.min_price)
    if params.max_price is not None:
        stmt = stmt.where(Trip.base_price <= params.max_price)
    if params.bus_type:
        stmt = stmt.where(Bus.bus_type == params.bus_type)
    if params.operator_id:
        stmt = stmt.where(Bus.operator_id == params.operator_id)
    if params.departure_window:
        hour = func.extract("hour", Trip.departure_at)
        windows = {
            "morning": (6, 12),
            "afternoon": (12, 17),
            "evening": (17, 21),
            "night": (21, 24),
        }
        lo, hi = windows[params.departure_window]
        stmt = stmt.where(and_(hour >= lo, hour < hi))

    if params.passengers and params.passengers > 1:
        stmt = stmt.where(available >= params.passengers)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = int(db.scalar(count_stmt) or 0)

    order = {
        "price": Trip.base_price.asc(),
        "departure": Trip.departure_at.asc(),
        "duration": (Trip.arrival_at - Trip.departure_at).asc(),
    }[params.sort]
    stmt = stmt.order_by(order)

    rows = db.execute(
        stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
    ).all()

    items = [_to_summary(db, trip, avail, tot) for trip, avail, tot in rows]
    return items, total_count


def get_trip(db: Session, trip_id: str) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError("Trip not found")
    return trip


def trip_summary(db: Session, trip: Trip) -> TripSummary:
    available = _count_seats(db, trip.id)
    total = _count_seats(db, trip.id, only_available=False)
    return _to_summary(db, trip, available, total)


def _count_seats(db: Session, trip_id: str, only_available: bool = True) -> int:
    q = select(func.count(TripSeatInventory.id)).where(TripSeatInventory.trip_id == trip_id)
    if only_available:
        q = q.where(TripSeatInventory.status == InventoryStatus.AVAILABLE.value)
    return int(db.scalar(q) or 0)


def _to_summary(db: Session, trip: Trip, available: int, total: int) -> TripSummary:
    route = trip.route
    bus = trip.bus
    origin = route.origin_city if route else None
    destination = route.destination_city if route else None
    operator = None
    if bus:
        profile = db.scalar(select(OperatorProfile).where(OperatorProfile.user_id == bus.operator_id))
        if profile:
            operator = TripOperator(
                id=bus.operator_id, company_name=profile.company_name, is_verified=profile.is_verified
            )
    return TripSummary(
        id=trip.id,
        departure_at=ensure_aware(trip.departure_at),
        arrival_at=ensure_aware(trip.arrival_at),
        base_price=float(trip.base_price),
        status=TripStatus(trip.status),
        duration_minutes=int((ensure_aware(trip.arrival_at) - ensure_aware(trip.departure_at)).total_seconds() // 60),
        route_id=trip.route_id,
        origin_city=CityOut.model_validate(origin) if origin else None,
        destination_city=CityOut.model_validate(destination) if destination else None,
        operator=operator,
        bus=TripBusInfo(
            id=bus.id,
            name=bus.name,
            registration_number=bus.registration_number,
            bus_type=bus.bus_type,
            layout=bus.layout,
            amenities=list(bus.amenities or []),
        )
        if bus
        else None,
        available_seats=int(available),
        total_seats=int(total),
    )


def get_seat_map(db: Session, trip_id: str, user=None) -> SeatMapResponse:
    trip = get_trip(db, trip_id)
    # Lazily expire stale holds so the map is accurate, then read inventory.
    seat_service.release_expired_holds(db, commit=True, trip_id=trip.id)

    rows = db.scalars(
        select(TripSeatInventory)
        .where(TripSeatInventory.trip_id == trip.id)
        .order_by(TripSeatInventory.row_index, TripSeatInventory.col_index)
    ).all()

    cols, aisle = layout_columns(trip.bus.layout if trip.bus else "2+2")
    seat_statuses = []
    available = 0
    for row in rows:
        status = row.status
        # A reserved seat whose hold lapsed is shown as available again.
        if status == InventoryStatus.RESERVED.value and row.is_hold_expired:
            status = InventoryStatus.AVAILABLE.value
        if status == InventoryStatus.AVAILABLE.value:
            available += 1
        seat_statuses.append(
            SeatStatus(
                seat_id=row.seat_id,
                seat_number=row.seat_number,
                row_index=row.row_index,
                col_index=row.col_index,
                category=row.category,
                price=float(row.price),
                is_accessible=bool(row.seat.is_accessible) if row.seat else False,
                status=InventoryStatus(status),
            )
        )

    max_row = max((s.row_index for s in seat_statuses), default=0)
    return SeatMapResponse(
        trip_id=trip.id,
        layout=trip.bus.layout if trip.bus else "2+2",
        rows=max_row,
        cols=cols,
        aisle_after_col=aisle,
        seats=seat_statuses,
        available_seats=available,
        base_price=float(trip.base_price),
    )
