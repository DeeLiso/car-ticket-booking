from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db, require_admin
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.booking import Booking
from app.models.catalog import Bus, Route, SystemSetting
from app.models.enums import BookingStatus, PaymentStatus, RefundStatus, TripStatus, UserRole
from app.models.misc import AuditLog
from app.models.payment import Payment, Refund
from app.models.trip import Trip
from app.models.user import OperatorProfile, User
from app.schemas.admin import (
    AdminUserOut,
    AdminUserUpdate,
    AuditLogOut,
    DashboardResponse,
    OperatorCreate,
    OperatorOut,
    OperatorUpdate,
    ReportsResponse,
    SystemSettingOut,
    SystemSettingUpdate,
)
from app.schemas.catalog import BusCreate, BusOut, BusUpdate, RouteCreate, RouteOut, RouteUpdate
from app.schemas.payment import RefundOut
from app.schemas.trip import TripCreate, TripSummary, TripUpdate
from app.services import admin_service, auth_service, catalog_service, payment_service
from app.services.booking_service import to_booking_out
from app.services.trip_service import trip_summary
from app.utils.refs import record_audit
from app.utils.timeutil import day_bounds_utc, now_utc

router = APIRouter(prefix="/admin", tags=["admin"])

Admin = require_admin


def _log(db: Session, request: Request, user: User, action: str, entity_type: str, entity_id: str | None = None, detail: dict | None = None):
    record_audit(
        db,
        action=action,
        actor_user_id=user.id,
        actor_role=user.role,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=request.client.host if request.client else None,
        detail=detail,
    )


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db), user: User = Depends(Admin)):
    return admin_service.dashboard(db)


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    role: Optional[UserRole] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(User).order_by(User.created_at.desc())
    if role:
        stmt = stmt.where(User.role == role.value)
    if status:
        stmt = stmt.where(User.status == status)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(User.email).like(like) | func.lower(User.full_name).like(like)
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    users = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    items = []
    for u in users:
        out = AdminUserOut.model_validate(u)
        out.bookings_count = int(
            db.scalar(select(func.count(Booking.id)).where(Booking.user_id == u.id)) or 0
        )
        items.append(out)
    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.patch("/users/{user_id}", response_model=AdminUserOut)
def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    target = db.get(User, user_id)
    if target is None:
        raise NotFoundError("User not found")
    data = payload.model_dump(exclude_unset=True)
    if target.id == admin.id and (data.get("role") or data.get("status")):
        raise ValidationError("You cannot change your own role or status")
    for field, value in data.items():
        if field == "role" and value is not None:
            value = value.value
        if field == "status" and value is not None:
            value = value.value
        setattr(target, field, value)
    _log(db, request, admin, "user.update", "User", target.id, {"fields": list(data)})
    db.commit()
    db.refresh(target)
    out = AdminUserOut.model_validate(target)
    out.bookings_count = int(
        db.scalar(select(func.count(Booking.id)).where(Booking.user_id == target.id)) or 0
    )
    return out


@router.get("/operators", response_model=list[OperatorOut])
def list_operators(db: Session = Depends(get_db), user: User = Depends(Admin)):
    profiles = db.scalars(select(OperatorProfile).order_by(OperatorProfile.company_name)).all()
    out = []
    for p in profiles:
        item = OperatorOut.model_validate(p)
        item.email = p.user.email if p.user else None
        item.full_name = p.user.full_name if p.user else None
        item.buses_count = int(
            db.scalar(
                select(func.count(Bus.id)).where(Bus.operator_id == p.user_id, Bus.deleted_at.is_(None))
            )
            or 0
        )
        out.append(item)
    return out


@router.post("/operators", response_model=OperatorOut, status_code=201)
def create_operator(
    payload: OperatorCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    user = auth_service.create_operator(db, **payload.model_dump())
    _log(db, request, admin, "operator.create", "User", user.id, {"company": payload.company_name})
    db.commit()
    profile = db.scalar(select(OperatorProfile).where(OperatorProfile.user_id == user.id))
    item = OperatorOut.model_validate(profile)
    item.email = user.email
    item.full_name = user.full_name
    return item


@router.patch("/operators/{operator_id}", response_model=OperatorOut)
def update_operator(
    operator_id: str,
    payload: OperatorUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    profile = db.get(OperatorProfile, operator_id)
    if not profile:
        raise NotFoundError("Operator not found")
    updates = payload.model_dump(exclude_unset=True)
    if "full_name" in updates and updates["full_name"]:
        updates.pop("full_name")
        profile.user.full_name = payload.full_name
    for field in ("company_name", "license_number", "contact_phone"):
        if field in updates:
            setattr(profile, field, updates[field])
    if payload.is_verified is not None:
        profile.is_verified = payload.is_verified
    _log(
        db, request, admin, "operator.update", "OperatorProfile", profile.id,
        {"company": profile.company_name, "changes": list(updates.keys())},
    )
    db.commit()
    db.refresh(profile)
    item = OperatorOut.model_validate(profile)
    item.email = profile.user.email
    item.full_name = profile.user.full_name
    item.buses_count = int(
        db.scalar(
            select(func.count(Bus.id)).where(Bus.operator_id == profile.user_id, Bus.deleted_at.is_(None))
        )
        or 0
    )
    return item


@router.delete("/operators/{operator_id}", status_code=204)
def delete_operator(
    operator_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    profile = db.get(OperatorProfile, operator_id)
    if not profile:
        raise NotFoundError("Operator not found")
    bus_count = int(
        db.scalar(
            select(func.count(Bus.id)).where(Bus.operator_id == profile.user_id, Bus.deleted_at.is_(None))
        )
        or 0
    )
    if bus_count > 0:
        raise ConflictError(
            f"Cannot delete {profile.company_name}: the operator still owns {bus_count} bus(es). "
            "Remove their buses first."
        )
    audit = {"company": profile.company_name, "email": profile.user.email}
    db.delete(profile)
    db.delete(profile.user)
    _log(db, request, admin, "operator.delete", "User", profile.user_id, audit)
    db.commit()


# ---------------------------------------------------------------- buses
@router.get("/buses")
def list_buses(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    operator_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Bus).where(Bus.deleted_at.is_(None)).order_by(Bus.created_at.desc())
    if operator_id:
        stmt = stmt.where(Bus.operator_id == operator_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    buses = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    items = [BusOut.model_validate(b) for b in buses]
    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("/buses", response_model=BusOut, status_code=201)
def create_bus(
    payload: BusCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    bus = catalog_service.create_bus(db, payload)
    _log(db, request, admin, "bus.create", "Bus", bus.id, {"registration": bus.registration_number})
    db.commit()
    return bus


@router.patch("/buses/{bus_id}", response_model=BusOut)
def update_bus(
    bus_id: str,
    payload: BusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    bus = catalog_service.update_bus(db, bus_id, payload)
    _log(db, request, admin, "bus.update", "Bus", bus.id, payload.model_dump(exclude_unset=True))
    db.commit()
    return bus


@router.delete("/buses/{bus_id}")
def delete_bus(
    bus_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(Admin)
):
    catalog_service.delete_bus(db, bus_id)
    _log(db, request, admin, "bus.delete", "Bus", bus_id)
    db.commit()
    return {"detail": "Bus deleted"}


# ---------------------------------------------------------------- routes
@router.get("/routes", response_model=list[RouteOut])
def list_routes(db: Session = Depends(get_db), user: User = Depends(Admin)):
    return db.scalars(select(Route).order_by(Route.created_at.desc())).all()


@router.post("/routes", response_model=RouteOut, status_code=201)
def create_route(
    payload: RouteCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    route = catalog_service.create_route(db, payload)
    _log(db, request, admin, "route.create", "Route", route.id)
    db.commit()
    return route


@router.patch("/routes/{route_id}", response_model=RouteOut)
def update_route(
    route_id: str,
    payload: RouteUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    route = catalog_service.update_route(db, route_id, payload)
    _log(db, request, admin, "route.update", "Route", route.id)
    db.commit()
    return route


# ---------------------------------------------------------------- fleet map
@router.get("/fleet")
def fleet_map(db: Session = Depends(get_db), user: User = Depends(Admin)):
    """Every active bus with the route (origin -> destination) of its latest
    trip, so the admin map can draw the whole business fleet at once."""
    buses = db.scalars(
        select(Bus).where(Bus.deleted_at.is_(None)).order_by(Bus.created_at.desc())
    ).all()
    bus_ids = [b.id for b in buses]

    latest: dict[str, Trip] = {}
    if bus_ids:
        newest = (
            select(Trip.bus_id.label("bus_id"), func.max(Trip.departure_at).label("latest"))
            .where(Trip.bus_id.in_(bus_ids))
            .group_by(Trip.bus_id)
            .subquery()
        )
        trips = db.scalars(
            select(Trip)
            .options(
                selectinload(Trip.route).selectinload(Route.origin_city),
                selectinload(Trip.route).selectinload(Route.destination_city),
            )
            .join(newest, (Trip.bus_id == newest.c.bus_id) & (Trip.departure_at == newest.c.latest))
        ).all()
        latest = {t.bus_id: t for t in trips}

    companies = (
        dict(
            db.execute(
                select(OperatorProfile.user_id, OperatorProfile.company_name).where(
                    OperatorProfile.user_id.in_([b.operator_id for b in buses])
                )
            ).all()
        )
        if buses
        else {}
    )

    out = []
    for bus in buses:
        trip = latest.get(bus.id)
        route = trip.route if trip else None
        out.append(
            {
                "bus_id": bus.id,
                "bus_name": bus.name,
                "registration_number": bus.registration_number,
                "bus_type": bus.bus_type,
                "layout": bus.layout,
                "seat_capacity": bus.seat_capacity,
                "is_active": bus.is_active,
                "operator": companies.get(bus.operator_id),
                "origin": route.origin_city.name if route and route.origin_city else None,
                "destination": route.destination_city.name if route and route.destination_city else None,
                "latest_trip_at": trip.departure_at if trip else None,
            }
        )
    return out


# ---------------------------------------------------------------- trips
@router.get("/trips")
def list_trips(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    route_id: Optional[str] = None,
    status: Optional[TripStatus] = None,
    departure_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = (
        select(Trip)
        .options(selectinload(Trip.route), selectinload(Trip.bus))
        .order_by(Trip.departure_at.desc())
    )
    if route_id:
        stmt = stmt.where(Trip.route_id == route_id)
    if status:
        stmt = stmt.where(Trip.status == status.value)
    if departure_date:
        start, end = day_bounds_utc(departure_date)
        stmt = stmt.where(and_(Trip.departure_at >= start, Trip.departure_at < end))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    trips = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return {
        "items": [trip_summary(db, t).model_dump() for t in trips],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.post("/trips", response_model=TripSummary, status_code=201)
def create_trip(
    payload: TripCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    trip = catalog_service.create_trip(db, payload)
    _log(db, request, admin, "trip.create", "Trip", trip.id)
    db.commit()
    return trip_summary(db, trip)


@router.patch("/trips/{trip_id}", response_model=TripSummary)
def update_trip(
    trip_id: str,
    payload: TripUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    trip = catalog_service.update_trip(db, trip_id, payload)
    _log(db, request, admin, "trip.update", "Trip", trip.id, payload.model_dump(exclude_unset=True))
    db.commit()
    return trip_summary(db, trip)


# ---------------------------------------------------------------- bookings/payments/refunds
@router.get("/bookings/feed")
def bookings_feed(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    since: Optional[datetime] = None,
    limit: int = Query(30, ge=1, le=100),
):
    """Live feed of incoming customer bookings for the admin alarm page.

    Returns the most recent bookings plus the count created strictly after
    ``since`` so the client can raise an alert for genuinely new bookings.
    """
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.seats),
            selectinload(Booking.passengers),
            selectinload(Booking.trip),
            selectinload(Booking.ticket),
        )
        .order_by(Booking.created_at.desc())
        .limit(limit)
    )
    bookings = db.scalars(stmt).all()
    latest_created_at = db.scalar(select(func.max(Booking.created_at)))
    new_count = 0
    if since is not None:
        new_count = (
            db.scalar(select(func.count()).select_from(Booking).where(Booking.created_at > since))
            or 0
        )
    return {
        "items": [to_booking_out(db, b).model_dump(mode="json") for b in bookings],
        "new_count": new_count,
        "latest_created_at": latest_created_at.isoformat() if latest_created_at else None,
    }


@router.get("/bookings")
def list_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    status: Optional[BookingStatus] = None,
    trip_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = (
        select(Booking)
        .options(
            selectinload(Booking.seats),
            selectinload(Booking.passengers),
            selectinload(Booking.trip),
            selectinload(Booking.ticket),
        )
        .order_by(Booking.created_at.desc())
    )
    if status:
        stmt = stmt.where(Booking.status == status.value)
    if trip_id:
        stmt = stmt.where(Booking.trip_id == trip_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    bookings = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return {
        "items": [to_booking_out(db, b).model_dump(mode="json") for b in bookings],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/payments")
def list_payments(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    status: Optional[PaymentStatus] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    stmt = select(Payment).order_by(Payment.created_at.desc())
    if status:
        stmt = stmt.where(Payment.status == status.value)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    payments = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    from app.schemas.payment import PaymentOut

    return {
        "items": [PaymentOut.model_validate(p).model_dump(mode="json") for p in payments],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/refunds", response_model=list[RefundOut])
def list_refunds(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    status: Optional[RefundStatus] = None,
):
    stmt = select(Refund).options(selectinload(Refund.payment)).order_by(Refund.created_at.desc())
    if status:
        stmt = stmt.where(Refund.status == status.value)
    return db.scalars(stmt).all()


@router.post("/refunds/{refund_id}/approve", response_model=RefundOut)
def approve_refund(
    refund_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(Admin)
):
    refund = payment_service.approve_refund(db, refund_id=refund_id, admin=admin)
    _log(db, request, admin, "refund.approve", "Refund", refund.id)
    db.commit()
    return refund


@router.post("/refunds/{refund_id}/reject", response_model=RefundOut)
def reject_refund(
    refund_id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
    note: Optional[str] = None,
):
    refund = payment_service.reject_refund(db, refund_id=refund_id, admin=admin, note=note)
    _log(db, request, admin, "refund.reject", "Refund", refund.id)
    db.commit()
    return refund


@router.post("/refunds/{refund_id}/process", response_model=RefundOut)
def process_refund(
    refund_id: str, request: Request, db: Session = Depends(get_db), admin: User = Depends(Admin)
):
    refund = payment_service.process_refund(db, refund_id=refund_id, admin=admin)
    _log(db, request, admin, "refund.process", "Refund", refund.id)
    db.commit()
    return refund


@router.get("/reports", response_model=ReportsResponse)
def reports(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    days: int = Query(30, ge=1, le=365),
):
    end = now_utc()
    start = end - timedelta(days=days)
    return admin_service.reports(db, start=start, end=end)


@router.get("/settings", response_model=list[SystemSettingOut])
def list_settings(db: Session = Depends(get_db), user: User = Depends(Admin)):
    return db.scalars(select(SystemSetting).order_by(SystemSetting.key)).all()


@router.put("/settings/{key}", response_model=SystemSettingOut)
def upsert_setting(
    key: str,
    payload: SystemSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(Admin),
):
    setting = db.scalar(select(SystemSetting).where(SystemSetting.key == key))
    if setting is None:
        setting = SystemSetting(key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value
        setting.updated_by = admin.id
    _log(db, request, admin, "setting.update", "SystemSetting", key)
    db.commit()
    db.refresh(setting)
    return setting


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(
    db: Session = Depends(get_db),
    user: User = Depends(Admin),
    limit: int = Query(100, ge=1, le=500),
):
    return db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)).all()
