"""Double-booking concurrency tests.

Key requirement: two passengers must never both succeed in reserving the same
seat on the same trip. These tests attempt simultaneous claims over distinct DB
connections and assert exactly one winner.
"""

from __future__ import annotations

import threading
from datetime import timedelta

from sqlalchemy import func, select

from app.core.exceptions import SeatUnavailableError
from app.db.session import SessionLocal
from app.models.booking import Booking
from app.models.catalog import Bus, City, Route
from app.models.enums import InventoryStatus, UserRole, UserStatus
from app.models.trip import Trip, TripSeatInventory
from app.models.user import User
from app.schemas.booking import PassengerInput
from app.schemas.catalog import BusCreate, RouteCreate
from app.schemas.trip import TripCreate
from app.services import catalog_service, seat_service
from app.services.booking_service import create_booking
from app.utils.timeutil import now_utc

N_THREADS = 5


def _mini_env() -> tuple[str, str]:
    session = SessionLocal()
    try:
        operator = User(
            email="op-conc@test.com",
            password_hash="x",
            full_name="Operator",
            role=UserRole.BUS_OPERATOR.value,
            status=UserStatus.ACTIVE.value,
        )
        session.add(operator)
        session.flush()
        bus = catalog_service.create_bus(
            session,
            BusCreate(
                operator_id=operator.id,
                registration_number="CONC-001",
                name="Concurrency Bus",
                bus_type="AC_SEATER",
                layout="2+2",
                seat_capacity=12,
            ),
            operator_id=operator.id,
        )
        session.add(City(name="ConcA", slug="conca", is_popular=False))
        session.add(City(name="ConcB", slug="concb", is_popular=False))
        session.flush()
        ca = session.scalar(select(City).where(City.name == "ConcA"))
        cb = session.scalar(select(City).where(City.name == "ConcB"))
        route = catalog_service.create_route(
            session,
            RouteCreate(origin_city_id=ca.id, destination_city_id=cb.id, duration_minutes=120),
        )
        departure = now_utc().replace(microsecond=0) + timedelta(days=2)
        trip = catalog_service.create_trip(
            session,
            TripCreate(
                route_id=route.id,
                bus_id=bus.id,
                departure_at=departure,
                arrival_at=departure + timedelta(hours=2),
                base_price=10000,
            ),
        )
        target = session.scalar(select(TripSeatInventory).where(TripSeatInventory.trip_id == trip.id))
        trip_id, seat_id = trip.id, target.seat_id
        session.commit()
        return trip_id, seat_id
    finally:
        session.close()


def _make_passengers(seat_id: str):
    return [PassengerInput(seat_id=seat_id, full_name="Racer Passenger", phone="09-123")]


def test_single_winner_among_simultaneous_claimants():
    trip_id, seat_id = _mini_env()

    setup = SessionLocal()
    try:
        users = [
            User(
                email=f"racer{i}@test.com",
                password_hash="x",
                full_name=f"Racer {i}",
                role=UserRole.PASSENGER.value,
                status=UserStatus.ACTIVE.value,
            )
            for i in range(N_THREADS)
        ]
        setup.add_all(users)
        setup.commit()
        user_ids = [u.id for u in users]
    finally:
        setup.close()

    barrier = threading.Barrier(N_THREADS)
    results = []
    lock = threading.Lock()

    def attempt(user_id: str):
        session = SessionLocal()
        try:
            barrier.wait(timeout=20)
            booking = create_booking(
                session,
                user_id=user_id,
                trip_id=trip_id,
                seat_ids=[seat_id],
                passengers=_make_passengers(seat_id),
                contact_name="Racer",
                contact_phone="09-1",
                contact_email=None,
            )
            with lock:
                results.append(("ok", booking.id))
        except SeatUnavailableError as exc:
            with lock:
                results.append(("conflict", exc.detail))
        except Exception as exc:  # pragma: no cover - debug aid
            with lock:
                results.append(("error", repr(exc)))
        finally:
            session.close()

    threads = [threading.Thread(target=attempt, args=(uid,)) for uid in user_ids]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=60)

    oks = [r for r in results if r[0] == "ok"]
    errors = [r for r in results if r[0] == "error"]

    # Exactly one concurrent claim wins; the rest are rejected with 409 conflicts.
    assert len(oks) == 1, f"expected exactly 1 winner, got {results}"
    assert not errors, f"unexpected errors: {errors}"
    assert len(results) == N_THREADS

    session = SessionLocal()
    try:
        row = session.scalar(
            select(TripSeatInventory).where(
                TripSeatInventory.trip_id == trip_id,
                TripSeatInventory.seat_id == seat_id,
            )
        )
        assert row.status == InventoryStatus.RESERVED.value
        assert row.booking_id is not None
        winner = session.scalar(select(Booking).where(Booking.id == row.booking_id))
        assert winner.status == "PENDING"
        # Availability reflects the claimed seat (12-seat bus, 1 claimed).
        assert seat_service.count_available_seats(session, trip_id) == 11
        pending = session.scalar(
            select(func.count(Booking.id)).where(Booking.status == "PENDING")
        ) or 0
        assert pending >= 1
    finally:
        session.close()