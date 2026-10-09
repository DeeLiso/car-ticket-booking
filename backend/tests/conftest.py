# Important: environment must be configured before any app import.
import os
import tempfile
from datetime import timedelta

_TEST_DIR = tempfile.mkdtemp(prefix="ctb_test_")
_TEST_DB = os.path.join(_TEST_DIR, "test.db").replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB}"
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef"
os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"
os.environ["PAYMENT_MOCK_ENABLED"] = "true"
os.environ["PAYMENT_PROVIDER"] = "mock"
os.environ["CANCELLATION_CUTOFF_HOURS"] = "2"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.catalog import Bus, City, Route  # noqa: E402
from app.models.enums import UserRole, UserStatus  # noqa: E402
from app.models.trip import Trip  # noqa: E402
from app.models.user import OperatorProfile, User  # noqa: E402
from app.schemas.catalog import BusCreate, RouteCreate  # noqa: E402
from app.schemas.trip import TripCreate  # noqa: E402
from app.services import catalog_service  # noqa: E402
from app.utils.timeutil import now_utc  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


@pytest.fixture()
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture()
def client():
    app = create_app()
    with TestClient(app) as c:
        yield c


def _create_user(
    db,
    *,
    email="passenger@test.com",
    password="Passw0rd123",
    full_name="Test Passenger",
    role=UserRole.PASSENGER,
    company_name="Test Operator",
):
    user = User(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role=role.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()
    if role == UserRole.BUS_OPERATOR:
        db.add(OperatorProfile(user_id=user.id, company_name=company_name))
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="session", autouse=True)
def seed_users(_setup_database):
    """One admin / operator / passenger for the whole test session."""
    session = SessionLocal()
    try:
        admin = session.scalar(select(User).where(User.email == "admin@test.com"))
        if admin is None:
            admin = _create_user(session, email="admin@test.com", full_name="Admin", role=UserRole.ADMIN)
        operator = session.scalar(select(User).where(User.email == "operator@test.com"))
        if operator is None:
            operator = _create_user(
                session,
                email="operator@test.com",
                full_name="Operator",
                role=UserRole.BUS_OPERATOR,
                company_name="Test Operator Co",
            )
        passenger = session.scalar(select(User).where(User.email == "passenger@test.com"))
        if passenger is None:
            passenger = _create_user(session)
        return {"admin": admin, "operator": operator, "passenger": passenger}
    finally:
        session.close()


@pytest.fixture()
def admin(seed_users):
    return seed_users["admin"]


@pytest.fixture()
def operator(seed_users):
    return seed_users["operator"]


@pytest.fixture()
def passenger(seed_users):
    return seed_users["passenger"]


@pytest.fixture()
def cities(db):
    names = [
        ("Yangon", "yangon"),
        ("Mandalay", "mandalay"),
        ("Naypyidaw", "naypyidaw"),
        ("Bagan", "bagan"),
    ]
    out = {}
    for name, slug in names:
        city = db.scalar(select(City).where(City.name == name))
        if city is None:
            city = City(name=name, slug=slug, is_popular=False)
            db.add(city)
            db.flush()
            db.commit()
        out[name] = city
    return out


@pytest.fixture()
def route(db, cities):
    from app.core.exceptions import ConflictError

    existing = db.scalar(
        select(Route).where(
            Route.origin_city_id == cities["Yangon"].id,
            Route.destination_city_id == cities["Mandalay"].id,
        )
    )
    if existing:
        return existing
    try:
        return catalog_service.create_route(
            db,
            RouteCreate(
                origin_city_id=cities["Yangon"].id,
                destination_city_id=cities["Mandalay"].id,
                distance_km=620,
                duration_minutes=540,
            ),
        )
    except ConflictError:
        return db.scalar(
            select(Route).where(
                Route.origin_city_id == cities["Yangon"].id,
                Route.destination_city_id == cities["Mandalay"].id,
            )
        )


@pytest.fixture()
def bus(db, operator):
    existing = db.scalar(select(Bus).where(Bus.registration_number == "TEST/BUS/001"))
    if existing:
        return existing
    return catalog_service.create_bus(
        db,
        BusCreate(
            operator_id=operator.id,
            registration_number="TEST/BUS/001",
            name="Test Bus 01",
            bus_type="AC_SEATER",
            layout="2+2",
            seat_capacity=20,
            amenities=["AC", "WiFi"],
        ),
        operator_id=operator.id,
    )


@pytest.fixture()
def trip(db, route, operator):
    import uuid

    reg = f"TEST/BUS/{uuid.uuid4().hex[:8]}"
    from app.schemas.catalog import BusCreate

    tbus = catalog_service.create_bus(
        db,
        BusCreate(
            operator_id=operator.id,
            registration_number=reg,
            name="Test Bus",
            bus_type="AC_SEATER",
            layout="2+2",
            seat_capacity=20,
            amenities=["AC"],
        ),
        operator_id=operator.id,
    )
    departure = now_utc().replace(microsecond=0) + timedelta(days=1, hours=1)
    arrival = departure + timedelta(hours=9)
    trip = catalog_service.create_trip(
        db,
        TripCreate(route_id=route.id, bus_id=tbus.id, departure_at=departure, arrival_at=arrival, base_price=30000),
    )
    return trip


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_row(client, email="u@test.com", password="Passw0rd123", name="Someone"):
    return client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": name},
    )


def login(client, email, password="Passw0rd123"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def seat_ids(db, trip_id, n=3):
    from app.models.trip import TripSeatInventory
    from app.models.enums import InventoryStatus

    return [
        r.seat_id
        for r in db.scalars(
            select(TripSeatInventory)
            .where(
                TripSeatInventory.trip_id == trip_id,
                TripSeatInventory.status == InventoryStatus.AVAILABLE.value,
            )
            .limit(n)
        ).all()
    ]