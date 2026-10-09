from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.catalog import Bus, BusSeat, City, Route
from app.models.enums import TripStatus
from app.models.trip import Trip
from app.schemas.catalog import BusCreate, BusUpdate, RouteCreate, RouteUpdate
from app.schemas.trip import TripCreate, TripUpdate
from app.services import seat_service
from app.utils.seat_layout import generate_layout
from app.utils.timeutil import ensure_aware, now_utc


def create_bus(db: Session, payload: BusCreate, *, operator_id: Optional[str] = None) -> Bus:
    operator = operator_id or payload.operator_id
    if not operator:
        raise ValidationError("operator_id is required")
    if db.scalar(select(Bus).where(Bus.registration_number == payload.registration_number)):
        raise ConflictError("A bus with this registration number already exists")

    bus = Bus(
        operator_id=operator,
        registration_number=payload.registration_number,
        name=payload.name,
        bus_type=payload.bus_type.value,
        layout=payload.layout.value,
        seat_capacity=payload.seat_capacity,
        amenities=payload.amenities,
        is_active=payload.is_active,
    )
    db.add(bus)
    db.flush()

    if payload.seat_numbers:
        specs = _specs_from_numbers(payload.seat_numbers, payload.layout.value)
    else:
        specs = generate_layout(payload.layout.value, payload.seat_capacity, payload.vip_rows)
    if len(specs) != payload.seat_capacity:
        raise ValidationError(
            f"Seat layout provides {len(specs)} seats but capacity is {payload.seat_capacity}"
        )
    for spec in specs:
        db.add(BusSeat(bus_id=bus.id, **spec))
    db.commit()
    db.refresh(bus)
    return bus


def _specs_from_numbers(seat_numbers: list[str], layout: str) -> list[dict]:
    from app.utils.seat_layout import layout_columns

    cols, _ = layout_columns(layout)
    specs = []
    for i, number in enumerate(seat_numbers):
        specs.append(
            dict(
                seat_number=number,
                row_index=i // cols + 1,
                col_index=i % cols + 1,
                category="ORDINARY",
                price_multiplier=1.0,
                is_accessible=False,
            )
        )
    return specs


def update_bus(db: Session, bus_id: str, payload: BusUpdate, *, operator_id: Optional[str] = None) -> Bus:
    bus = db.get(Bus, bus_id)
    if bus is None or bus.deleted_at is not None:
        raise NotFoundError("Bus not found")
    if operator_id and bus.operator_id != operator_id:
        raise NotFoundError("Bus not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "bus_type" and value is not None:
            value = value.value
        setattr(bus, field, value)
    db.commit()
    db.refresh(bus)
    return bus


def delete_bus(db: Session, bus_id: str, *, operator_id: Optional[str] = None) -> None:
    bus = db.get(Bus, bus_id)
    if bus is None or bus.deleted_at is not None:
        raise NotFoundError("Bus not found")
    if operator_id and bus.operator_id != operator_id:
        raise NotFoundError("Bus not found")
    upcoming = db.scalar(
        select(Trip.id).where(
            Trip.bus_id == bus.id,
            Trip.departure_at >= now_utc(),
            Trip.status != TripStatus.CANCELLED.value,
        )
    )
    if upcoming:
        raise ConflictError("Bus has upcoming trips and cannot be deleted")
    bus.deleted_at = now_utc()
    bus.is_active = False
    db.commit()


def create_route(db: Session, payload: RouteCreate) -> Route:
    if payload.origin_city_id == payload.destination_city_id:
        raise ValidationError("Origin and destination must differ")
    for city_id in (payload.origin_city_id, payload.destination_city_id):
        if db.get(City, city_id) is None:
            raise ValidationError(f"City {city_id} does not exist")
    exists = db.scalar(
        select(Route).where(
            Route.origin_city_id == payload.origin_city_id,
            Route.destination_city_id == payload.destination_city_id,
        )
    )
    if exists:
        raise ConflictError("A route between these cities already exists")
    route = Route(**payload.model_dump())
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


def update_route(db: Session, route_id: str, payload: RouteUpdate) -> Route:
    route = db.get(Route, route_id)
    if route is None:
        raise NotFoundError("Route not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(route, field, value)
    db.commit()
    db.refresh(route)
    return route


def _check_bus_conflict(db: Session, bus_id: str, departure: datetime, arrival: datetime, exclude_trip: Optional[str] = None) -> None:
    """Prevent a bus from being double-assigned to overlapping trips.

    A conflict exists when another non-cancelled trip for the same bus overlaps
    [departure, arrival). Buffer of the trip's own schedule is included.
    """
    stmt = select(Trip).where(
        Trip.bus_id == bus_id,
        Trip.status != TripStatus.CANCELLED.value,
        Trip.departure_at < arrival,
        Trip.arrival_at > departure,
    )
    if exclude_trip:
        stmt = stmt.where(Trip.id != exclude_trip)
    conflict = db.scalar(stmt)
    if conflict:
        raise ConflictError(
            "This bus is already assigned to a trip that overlaps this schedule",
            detail={"conflicting_trip_id": conflict.id},
        )


def create_trip(db: Session, payload: TripCreate, *, operator_id: Optional[str] = None) -> Trip:
    bus = db.get(Bus, payload.bus_id)
    if bus is None or bus.deleted_at is not None:
        raise NotFoundError("Bus not found")
    if operator_id and bus.operator_id != operator_id:
        raise NotFoundError("Bus not found")
    route = db.get(Route, payload.route_id)
    if route is None:
        raise NotFoundError("Route not found")
    _check_bus_conflict(db, bus.id, payload.departure_at, payload.arrival_at)

    trip = Trip(
        route_id=payload.route_id,
        bus_id=payload.bus_id,
        departure_at=payload.departure_at,
        arrival_at=payload.arrival_at,
        base_price=payload.base_price,
        status=payload.status.value,
        notes=payload.notes,
    )
    db.add(trip)
    db.flush()
    seat_service.ensure_inventory_for_trip(db, trip)
    db.commit()
    db.refresh(trip)
    return trip


def update_trip(db: Session, trip_id: str, payload: TripUpdate, *, operator_id: Optional[str] = None) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError("Trip not found")
    if operator_id:
        bus = db.get(Bus, trip.bus_id)
        if bus is None or bus.operator_id != operator_id:
            raise NotFoundError("Trip not found")

    data = payload.model_dump(exclude_unset=True)
    departure = data.get("departure_at", trip.departure_at)
    arrival = data.get("arrival_at", trip.arrival_at)
    if arrival <= departure:
        raise ValidationError("arrival_at must be after departure_at")
    if "departure_at" in data or "arrival_at" in data or "status" in data:
        _check_bus_conflict(db, trip.bus_id, departure, arrival, exclude_trip=trip.id)

    for field, value in data.items():
        if field == "status" and value is not None:
            value = value.value
        setattr(trip, field, value)
    db.commit()
    db.refresh(trip)
    return trip
