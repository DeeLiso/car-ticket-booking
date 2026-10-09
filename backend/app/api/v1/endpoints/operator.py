from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_roles
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.booking import Booking, BookingPassenger
from app.models.catalog import Bus, BusSeat
from app.models.enums import BookingStatus, TripStatus, UserRole
from app.models.trip import Trip, TripSeatInventory
from app.models.user import OperatorProfile, User
from app.schemas.catalog import BusCreate, BusDetail, BusOut, BusSeatOut, BusUpdate
from app.schemas.passenger import ManifestPassenger, TripManifest
from app.services import catalog_service

router = APIRouter(prefix="/operator", tags=["operator"])

Operator = require_roles(UserRole.BUS_OPERATOR, UserRole.ADMIN)


def _operator_profile(db: Session, user: User) -> OperatorProfile | None:
    return db.scalar(select(OperatorProfile).where(OperatorProfile.user_id == user.id))


@router.get("/profile")
def operator_profile(user: User = Depends(Operator), db: Session = Depends(get_db)):
    profile = _operator_profile(db, user)
    if profile is None:
        raise NotFoundError("Operator profile not found")
    return profile


@router.get("/buses", response_model=list[BusOut])
def my_buses(user: User = Depends(Operator), db: Session = Depends(get_db)):
    stmt = select(Bus).where(Bus.deleted_at.is_(None)).order_by(Bus.created_at.desc())
    if user.role != UserRole.ADMIN.value:
        stmt = stmt.where(Bus.operator_id == user.id)
    return db.scalars(stmt).all()


@router.post("/buses", response_model=BusDetail, status_code=201)
def create_bus(payload: BusCreate, user: User = Depends(Operator), db: Session = Depends(get_db)):
    operator_id = payload.operator_id if user.role == UserRole.ADMIN.value else user.id
    bus = catalog_service.create_bus(db, payload, operator_id=operator_id)
    return _bus_detail(db, bus)


@router.patch("/buses/{bus_id}", response_model=BusDetail)
def update_bus(
    bus_id: str, payload: BusUpdate, user: User = Depends(Operator), db: Session = Depends(get_db)
):
    operator_id = None if user.role == UserRole.ADMIN.value else user.id
    bus = catalog_service.update_bus(db, bus_id, payload, operator_id=operator_id)
    return _bus_detail(db, bus)


@router.get("/trips")
def my_trips(
    user: User = Depends(Operator),
    db: Session = Depends(get_db),
    status: TripStatus | None = None,
    upcoming_only: bool = Query(default=False),
):
    stmt = select(Trip).options(selectinload(Trip.route), selectinload(Trip.bus)).order_by(Trip.departure_at.desc())
    if user.role != UserRole.ADMIN.value:
        bus_ids = select(Bus.id).where(Bus.operator_id == user.id)
        stmt = stmt.where(Trip.bus_id.in_(bus_ids))
    if status:
        stmt = stmt.where(Trip.status == status.value)
    if upcoming_only:
        from app.utils.timeutil import now_utc

        stmt = stmt.where(Trip.departure_at >= now_utc())
    trips = db.scalars(stmt).all()

    out = []
    for trip in trips:
        confirmed = db.scalar(
            select(func.count(TripSeatInventory.id)).where(
                TripSeatInventory.trip_id == trip.id, TripSeatInventory.status == "SOLD"
            )
        ) or 0
        total = db.scalar(
            select(func.count(TripSeatInventory.id)).where(TripSeatInventory.trip_id == trip.id)
        ) or 0
        out.append(
            {
                "id": trip.id,
                "route_id": trip.route_id,
                "bus_id": trip.bus_id,
                "departure_at": trip.departure_at,
                "arrival_at": trip.arrival_at,
                "base_price": float(trip.base_price),
                "status": trip.status,
                "origin": trip.route.origin_city.name if trip.route and trip.route.origin_city else None,
                "destination": trip.route.destination_city.name if trip.route and trip.route.destination_city else None,
                "bus": trip.bus.name if trip.bus else None,
                "seats_sold": int(confirmed),
                "total_seats": int(total),
            }
        )
    return out


@router.get("/trips/{trip_id}/manifest", response_model=TripManifest)
def trip_manifest(
    trip_id: str, user: User = Depends(Operator), db: Session = Depends(get_db)
):
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError("Trip not found")
    if user.role != UserRole.ADMIN.value:
        bus = db.get(Bus, trip.bus_id)
        if bus is None or bus.operator_id != user.id:
            raise ForbiddenError("This trip does not belong to your fleet")

    rows = db.execute(
        select(Booking.reference, BookingPassenger.full_name, BookingPassenger.phone, BookingPassenger.seat_number)
        .join(BookingPassenger, BookingPassenger.booking_id == Booking.id)
        .where(Booking.trip_id == trip_id, Booking.status == BookingStatus.CONFIRMED.value)
        .order_by(BookingPassenger.seat_number)
    ).all()
    passengers = [
        ManifestPassenger(
            booking_reference=ref, passenger_name=name, phone=phone, seat_number=seat
        )
        for ref, name, phone, seat in rows
    ]
    return TripManifest(
        trip_id=trip.id,
        departure_at=trip.departure_at,
        origin=trip.route.origin_city.name if trip.route and trip.route.origin_city else "",
        destination=trip.route.destination_city.name if trip.route and trip.route.destination_city else "",
        bus_registration=trip.bus.registration_number if trip.bus else "",
        confirmed_seats=len(passengers),
        passengers=passengers,
    )


@router.get("/bookings")
def operator_bookings(
    user: User = Depends(Operator),
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
):
    stmt = (
        select(Booking)
        .options(selectinload(Booking.trip), selectinload(Booking.passengers), selectinload(Booking.seats))
        .order_by(Booking.created_at.desc())
        .limit(limit)
    )
    if user.role != UserRole.ADMIN.value:
        bus_ids = select(Bus.id).where(Bus.operator_id == user.id)
        trip_ids = select(Trip.id).where(Trip.bus_id.in_(bus_ids))
        stmt = stmt.where(Booking.trip_id.in_(trip_ids))
    bookings = db.scalars(stmt).all()
    from app.services.booking_service import to_booking_out

    return [to_booking_out(db, b) for b in bookings]


@router.get("/stats")
def operator_stats(user: User = Depends(Operator), db: Session = Depends(get_db)):
    bus_filter = []
    if user.role != UserRole.ADMIN.value:
        bus_filter = select(Bus.id).where(Bus.operator_id == user.id)
        trip_ids = select(Trip.id).where(Trip.bus_id.in_(bus_filter))
    else:
        trip_ids = select(Trip.id)

    total_buses = db.scalar(
        select(func.count(Bus.id)).where(
            Bus.deleted_at.is_(None),
            Bus.operator_id == user.id,
        )
    ) or 0
    if user.role == UserRole.ADMIN.value:
        total_buses = db.scalar(
            select(func.count(Bus.id)).where(Bus.deleted_at.is_(None))
        ) or 0
    total_trips = db.scalar(select(func.count(Trip.id)).where(Trip.id.in_(trip_ids))) or 0
    total_bookings = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.trip_id.in_(trip_ids), Booking.status == BookingStatus.CONFIRMED.value
        )
    ) or 0
    seats_sold = db.scalar(
        select(func.count(TripSeatInventory.id)).where(
            TripSeatInventory.trip_id.in_(trip_ids), TripSeatInventory.status == "SOLD"
        )
    ) or 0
    return {
        "total_buses": int(total_buses),
        "total_trips": int(total_trips),
        "confirmed_bookings": int(total_bookings),
        "seats_sold": int(seats_sold),
    }


def _bus_detail(db: Session, bus: Bus) -> BusDetail:
    seats = db.scalars(
        select(BusSeat).where(BusSeat.bus_id == bus.id).order_by(BusSeat.row_index, BusSeat.col_index)
    ).all()
    data = BusDetail.model_validate(bus)
    data.seats = [BusSeatOut.model_validate(s) for s in seats]
    return data
