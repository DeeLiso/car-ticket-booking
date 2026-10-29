"""Database seeder.

Usage:
    python -m app.seed            # seed development data (non-destructive)
    python -m app.seed --reset    # drop all and reseed

Never run against a production database. Sample credentials are development only.
"""

from __future__ import annotations

import argparse
import sys
from datetime import timedelta

from sqlalchemy import delete, func, or_, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.booking import Booking  # noqa: F401  register tables
from app.models.catalog import Bus, BusSeat, City, Route
from app.models.enums import BusType, UserRole, UserStatus
from app.models.payment import Payment, Refund
from app.models.trip import Trip, TripSeatInventory
from app.models.user import OperatorProfile, User
from app.schemas.catalog import BusCreate
from app.services import catalog_service, seat_service
from app.utils.logging import logger
from app.utils.timeutil import now_utc

CITIES = [
    ("Yangon", "yangon", "Yangon Region", True),
    ("Mandalay", "mandalay", "Mandalay Region", True),
    ("Naypyidaw", "naypyidaw", "Naypyidaw Union Territory", True),
    ("Bagan", "bagan", "Mandalay Region", True),
    ("Taunggyi", "taunggyi", "Shan State", True),
    ("Mawlamyine", "mawlamyine", "Mon State", False),
    ("Pyay", "pyay", "Bago Region", False),
    ("Pathein", "pathein", "Ayeyarwady Region", False),
    ("Hpa-An", "hpa-an", "Kayin State", False),
    ("Kyaikhto", "kyaikhto", "Mon State", False),
    ("Pyin Oo Lwin", "pyin-oo-lwin", "Mandalay Region", False),
    ("Dawei", "dawei", "Tanintharyi Region", False),
    ("Myeik", "myeik", "Tanintharyi Region", False),
    ("Lashio", "lashio", "Shan State", False),
]

# (origin, destination, distance_km, duration_minutes)
ROUTE_SPECS = [
    ("Yangon", "Mandalay", 620, 540),
    ("Mandalay", "Yangon", 620, 540),
    ("Yangon", "Bagan", 560, 480),
    ("Bagan", "Yangon", 560, 480),
    ("Yangon", "Naypyidaw", 400, 330),
    ("Naypyidaw", "Yangon", 400, 330),
    ("Yangon", "Taunggyi", 530, 480),
    ("Taunggyi", "Yangon", 530, 480),
    ("Mandalay", "Naypyidaw", 310, 240),
    ("Naypyidaw", "Mandalay", 310, 240),
    ("Mandalay", "Taunggyi", 220, 210),
    ("Taunggyi", "Mandalay", 220, 210),
    ("Yangon", "Mawlamyine", 300, 270),
    ("Mawlamyine", "Yangon", 300, 270),
    ("Yangon", "Pathein", 190, 240),
    ("Pathein", "Yangon", 190, 240),
    ("Yangon", "Pyay", 260, 240),
    ("Pyay", "Yangon", 260, 240),
    ("Yangon", "Hpa-An", 250, 360),
    ("Hpa-An", "Yangon", 250, 360),
    ("Yangon", "Kyaikhto", 190, 240),
    ("Kyaikhto", "Yangon", 190, 240),
    ("Yangon", "Pyin Oo Lwin", 630, 600),
    ("Pyin Oo Lwin", "Yangon", 630, 600),
    ("Mandalay", "Pyin Oo Lwin", 75, 120),
    ("Pyin Oo Lwin", "Mandalay", 75, 120),
    ("Mandalay", "Bagan", 160, 240),
    ("Bagan", "Mandalay", 160, 240),
    ("Yangon", "Dawei", 700, 720),
    ("Dawei", "Yangon", 700, 720),
    ("Yangon", "Myeik", 850, 840),
    ("Myeik", "Yangon", 850, 840),
    ("Mandalay", "Lashio", 300, 300),
    ("Lashio", "Mandalay", 300, 300),
]

# (registration, name, bus_type, layout, capacity, amenities, vip_rows)
BUS_SPECS = [
    ("9K/XXXX1", "Shwe Mandalar Elite", "AC_SEATER", "2+2", 45, ["WiFi", "AC", "Water", "Charging", "Blanket"], 2),
    ("YGN/3H/2025", "Shwe Mandalar 02", "AC_SLEEPER", "2+1", 32, ["AC", "Water", "Charging", "Restroom"], 0),
    ("MDY/5J/2024", "Lwin Motorline 12", "AC_SEATER", "2+2", 33, ["AC", "Charging"], 1),
    ("MDY/8K/2025", "Lwin Motorline 15", "AC_SLEEPER", "2+1", 24, ["AC", "Water", "Charging", "Blanket"], 0),
    ("YGN/2F/2025", "JJ Express 01", "AC_SEATER", "2+1", 32, ["WiFi", "AC", "Water", "Charging", "Snacks"], 1),
    ("YGN/6C/2024", "JJ Express 05", "AC_SLEEPER", "2+1", 28, ["AC", "Charging", "Blanket"], 0),
    ("NYW/1A/2025", "Htoo Travels 07", "LUXURY", "2+2", 40, ["WiFi", "AC", "Water", "Charging", "Wet Towel"], 4),
    ("YGN/9B/2025", "Htoo Travels 11", "AC_SEATER", "2+2", 45, ["AC", "Water", "Charging"], 1),
]

# Operator (company, license, contact, verified, buses assigned by index)
OPERATORS = [
    ("Shwe Mandalar Express", "LIC-001", "09-420000001", True, [0, 1]),
    ("Lwin Motorline", "LIC-002", "09-420000002", True, [2, 3]),
    ("JJ Express", "LIC-003", "09-420000003", True, [4, 5]),
    ("Htoo Travels", "LIC-004", "09-420000004", True, [6, 7]),
]

DEPARTURE_HOURS = [6, 8, 10, 13, 17, 20, 23]
PRICE_BY_BUS = {0: 42000, 1: 52000, 2: 36000, 3: 48000, 4: 46000, 5: 54000, 6: 56000, 7: 39000}


def _prune_test_data(db: SessionLocal) -> None:
    """Remove leftover test/dummy rows (e.g. "ScrA -> ScrB" routes) so they
    never surface in the admin catalog or public search. Safe when empty."""
    scr_city_ids = select(City.id).where(City.name.like("Scr%"))
    scr_route_ids = select(Route.id).where(
        or_(
            Route.origin_city_id.in_(scr_city_ids),
            Route.destination_city_id.in_(scr_city_ids),
        )
    )
    scr_trip_ids = select(Trip.id).where(Trip.route_id.in_(scr_route_ids))

    # Referencing bookings must go first: Booking cascades to seats/passengers/
    # ticket via ORM, but payments/refunds have no cascade.
    scr_bookings = list(db.scalars(select(Booking).where(Booking.trip_id.in_(scr_trip_ids))))
    for booking in scr_bookings:
        for payment in list(booking.payments):
            db.execute(delete(Refund).where(Refund.payment_id == payment.id))
            db.execute(delete(Payment).where(Payment.id == payment.id))
        db.delete(booking)
    db.commit()

    db.execute(delete(TripSeatInventory).where(TripSeatInventory.trip_id.in_(scr_trip_ids)))
    db.execute(delete(Trip).where(Trip.id.in_(scr_trip_ids)))
    db.execute(delete(Route).where(Route.id.in_(scr_route_ids)))
    db.execute(delete(City).where(City.id.in_(scr_city_ids)))
    db.commit()

    _prune_scratch_fleet(db)


def _prune_scratch_fleet(db: SessionLocal) -> None:
    """Remove "Scratch Bus" test vehicles (and their throwaway operator
    accounts) so the fleet pages only ever show real operators."""
    scr_bus_ids = select(Bus.id).where(
        or_(Bus.name.like("Scratch%"), Bus.registration_number.like("SCRT-%"))
    )
    scr_trip_ids = select(Trip.id).where(Trip.bus_id.in_(scr_bus_ids))

    scr_bookings = list(db.scalars(select(Booking).where(Booking.trip_id.in_(scr_trip_ids))))
    for booking in scr_bookings:
        for payment in list(booking.payments):
            db.execute(delete(Refund).where(Refund.payment_id == payment.id))
            db.execute(delete(Payment).where(Payment.id == payment.id))
        db.delete(booking)
    db.commit()

    db.execute(delete(TripSeatInventory).where(TripSeatInventory.trip_id.in_(scr_trip_ids)))
    db.execute(delete(Trip).where(Trip.id.in_(scr_trip_ids)))
    db.execute(delete(BusSeat).where(BusSeat.bus_id.in_(scr_bus_ids)))
    db.execute(delete(Bus).where(Bus.id.in_(scr_bus_ids)))
    db.commit()

    # Throwaway operator logins have no fleet and no personal bookings left.
    for user in list(db.scalars(select(User).where(User.email.like("op-%@test.com")))):
        has_bus = db.scalar(select(func.count(Bus.id)).where(Bus.operator_id == user.id)) or 0
        has_booking = db.scalar(select(func.count(Booking.id)).where(Booking.user_id == user.id)) or 0
        if has_bus == 0 and has_booking == 0:
            db.execute(delete(OperatorProfile).where(OperatorProfile.user_id == user.id))
            db.execute(delete(User).where(User.id == user.id))
    db.commit()


def seed(*, reset: bool = False) -> None:
    if settings.is_production:
        raise SystemExit("Refusing to seed a production database.")

    with SessionLocal() as db:
        if reset:
            logger.warning("Resetting all tables...")
            for table in reversed(Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()

        _prune_test_data(db)

        admin = db.scalar(select(User).where(User.email == "admin@example.com"))
        if admin is None:
            admin = User(
                email="admin@example.com",
                password_hash=hash_password("Admin@123"),
                full_name="System Administrator",
                role=UserRole.ADMIN.value,
                status=UserStatus.ACTIVE.value,
            )
            db.add(admin)
            db.flush()
            logger.info("Created admin account (admin@example.com / Admin@123)")

        city_by_name = {}
        for name, slug, region, popular in CITIES:
            city = db.scalar(select(City).where(City.name == name))
            if city is None:
                city = City(name=name, slug=slug, region=region, is_popular=popular, sort_order=len(city_by_name))
                db.add(city)
                db.flush()
            city_by_name[name] = city

        for origin, dest, dist, dur in ROUTE_SPECS:
            exists = db.scalar(
                select(Route).where(
                    Route.origin_city_id == city_by_name[origin].id,
                    Route.destination_city_id == city_by_name[dest].id,
                )
            )
            if exists is None:
                db.add(
                    Route(
                        origin_city_id=city_by_name[origin].id,
                        destination_city_id=city_by_name[dest].id,
                        distance_km=dist,
                        duration_minutes=dur,
                    )
                )
        db.commit()

        for company, lic, phone, verified, bus_idxs in OPERATORS:
            op_email = f"{company.lower().split()[0]}-op@example.com"
            op_user = db.scalar(select(User).where(User.email == op_email))
            if op_user is None:
                op_user = User(
                    email=op_email,
                    password_hash=hash_password("Operator@123"),
                    full_name=f"{company} Operations",
                    role=UserRole.BUS_OPERATOR.value,
                    status=UserStatus.ACTIVE.value,
                )
                db.add(op_user)
                db.flush()
                db.add(
                    OperatorProfile(
                        user_id=op_user.id,
                        company_name=company,
                        license_number=lic,
                        contact_phone=phone,
                        is_verified=verified,
                    )
                )
                db.commit()
            for idx in bus_idxs:
                reg, name, btype, layout, cap, amt, vip = BUS_SPECS[idx]
                if db.scalar(select(Bus).where(Bus.registration_number == reg)) is None:
                    bus = catalog_service.create_bus(
                        db,
                        BusCreate(
                            operator_id=op_user.id,
                            registration_number=reg,
                            name=name,
                            bus_type=BusType(btype),
                            layout=layout,
                            seat_capacity=cap,
                            amenities=amt,
                            vip_rows=vip,
                        ),
                        operator_id=op_user.id,
                    )
                    logger.info("Created bus %s (%s)", reg, name)

        now = now_utc()
        tz = settings.app_timezone
        from zoneinfo import ZoneInfo

        created = 0
        for bus_idx, (reg, *_rest) in enumerate(BUS_SPECS):
            bus = db.scalar(select(Bus).where(Bus.registration_number == reg))
            if bus is None:
                continue
            # pick routes for this bus round-robin
            route_index = bus_idx % len(ROUTE_SPECS)
            # Seed across a full route cycle so every route is covered by trips
            # (a 14-day horizon only reaches a fraction of the catalog).
            for day_offset in range(len(ROUTE_SPECS)):
                for hour in DEPARTURE_HOURS:
                    if (bus_idx + hour + day_offset) % 3 != 0:
                        continue
                    origin, dest, dist, dur = ROUTE_SPECS[(route_index + day_offset) % len(ROUTE_SPECS)]
                    route = db.scalar(
                        select(Route).where(
                            Route.origin_city_id == city_by_name[origin].id,
                            Route.destination_city_id == city_by_name[dest].id,
                        )
                    )
                    if route is None:
                        continue
                    local_dep = (now + timedelta(days=day_offset)).astimezone(ZoneInfo(tz)).replace(
                        hour=hour, minute=0, second=0, microsecond=0
                    )
                    departure = local_dep.astimezone(now.tzinfo)
                    arrival = departure + timedelta(minutes=dur)
                    if departure <= now:
                        continue
                    # Idempotent: re-running the seeder must not duplicate trips.
                    if db.scalar(
                        select(Trip.id).where(
                            Trip.route_id == route.id,
                            Trip.bus_id == bus.id,
                            Trip.departure_at == departure,
                        )
                    ) is not None:
                        continue
                    trip = Trip(
                        route_id=route.id,
                        bus_id=bus.id,
                        departure_at=departure,
                        arrival_at=arrival,
                        base_price=PRICE_BY_BUS[bus_idx],
                    )
                    db.add(trip)
                    db.flush()
                    seat_service.ensure_inventory_for_trip(db, trip)
                    created += 1
                    db.commit()

        logger.info(
            "Seed complete. cities=%d routes=%d trips=%d",
            len(CITIES),
            len(ROUTE_SPECS),
            created,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed development data")
    parser.add_argument("--reset", action="store_true", help="drop all data first")
    args = parser.parse_args()
    seed(reset=args.reset)


if __name__ == "__main__":
    main()