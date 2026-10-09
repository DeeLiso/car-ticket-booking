from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingSeat
from app.models.catalog import Bus, City, Route
from app.models.enums import BookingStatus, PaymentMethod, PaymentStatus, RefundStatus, TripStatus, UserRole
from app.models.payment import Payment, Refund
from app.models.trip import Trip, TripSeatInventory
from app.models.user import OperatorProfile, User
from app.schemas.admin import (
    DashboardCharts,
    DashboardResponse,
    DashboardStats,
    NamedValue,
    ReportKPI,
    ReportsResponse,
    TimeSeriesPoint,
)
from app.utils.timeutil import app_tz, ensure_aware, now_utc, to_app_tz


def _count(db: Session, stmt) -> int:
    return int(db.scalar(stmt) or 0)


def _sum(db: Session, stmt) -> float:
    return round(float(db.scalar(stmt) or 0), 2)


def _is_postgres(db: Session) -> bool:
    return db.bind.dialect.name == "postgresql"


def _day_expr(db: Session, column):
    """Return a day-level expression that works on both PostgreSQL and SQLite."""
    if _is_postgres(db):
        return cast(column, Date)
    return func.date(column)


def dashboard(db: Session) -> DashboardResponse:
    total_passengers = _count(db, select(func.count(User.id)).where(User.role == UserRole.PASSENGER.value))
    total_operators = _count(db, select(func.count(OperatorProfile.id)))
    total_buses = _count(db, select(func.count(Bus.id)).where(Bus.deleted_at.is_(None)))
    total_routes = _count(db, select(func.count(Route.id)))
    total_trips = _count(db, select(func.count(Trip.id)))
    total_bookings = _count(db, select(func.count(Booking.id)))
    confirmed = _count(
        db, select(func.count(Booking.id)).where(Booking.status == BookingStatus.CONFIRMED.value)
    )
    pending_payments = _count(
        db,
        select(func.count(Payment.id)).where(
            Payment.status.in_([PaymentStatus.PENDING.value, PaymentStatus.PROCESSING.value])
        ),
    )
    cancelled = _count(
        db,
        select(func.count(Booking.id)).where(
            Booking.status.in_([BookingStatus.CANCELLED.value, BookingStatus.EXPIRED.value])
        ),
    )
    gross = _sum(
        db,
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.status == PaymentStatus.SUCCEEDED.value
        ),
    )
    refunded = _sum(
        db,
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.status == RefundStatus.PROCESSED.value
        ),
    )
    seats_sold = _count(
        db,
        select(func.count(BookingSeat.id)).join(Booking, Booking.id == BookingSeat.booking_id).where(
            Booking.status == BookingStatus.CONFIRMED.value
        ),
    )
    total_inventory = _count(db, select(func.count(TripSeatInventory.id)))
    sold_inventory = _count(
        db,
        select(func.count(TripSeatInventory.id)).where(
            TripSeatInventory.status == "SOLD"
        ),
    )
    occupancy = round((sold_inventory / total_inventory * 100) if total_inventory else 0.0, 1)

    stats = DashboardStats(
        total_passengers=total_passengers,
        total_operators=total_operators,
        total_buses=total_buses,
        total_routes=total_routes,
        total_trips=total_trips,
        total_bookings=total_bookings,
        confirmed_bookings=confirmed,
        pending_payments=pending_payments,
        cancelled_bookings=cancelled,
        total_revenue=gross,
        refunded_amount=refunded,
        net_revenue=round(gross - refunded, 2),
        seats_sold=seats_sold,
        occupancy_rate=occupancy,
    )

    since = now_utc() - timedelta(days=13)

    booking_rows = db.execute(
        select(_day_expr(db, Booking.created_at), func.count(Booking.id))
        .where(Booking.created_at >= since)
        .group_by(_day_expr(db, Booking.created_at))
    ).all()
    booking_trend = _fill_days({_as_date(k): int(v) for k, v in booking_rows}, since)

    revenue_rows = db.execute(
        select(_day_expr(db, Payment.created_at), func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.created_at >= since, Payment.status == PaymentStatus.SUCCEEDED.value)
        .group_by(_day_expr(db, Payment.created_at))
    ).all()
    revenue_trend = _fill_days({_as_date(k): float(v) for k, v in revenue_rows}, since)

    popular_rows = db.execute(
        select(City.name, func.count(Booking.id))
        .join(Route, Route.destination_city_id == City.id)
        .join(Trip, Trip.route_id == Route.id)
        .join(Booking, Booking.trip_id == Trip.id)
        .where(Booking.status == BookingStatus.CONFIRMED.value)
        .group_by(City.name)
        .order_by(func.count(Booking.id).desc())
        .limit(6)
    ).all()
    popular_routes = [NamedValue(name=name, value=float(count)) for name, count in popular_rows]

    payment_rows = db.execute(
        select(Payment.status, func.count(Payment.id)).group_by(Payment.status)
    ).all()
    payment_dist = [NamedValue(name=status, value=float(count)) for status, count in payment_rows]

    bus_rows = db.execute(
        select(Bus.bus_type, func.count(Bus.id)).group_by(Bus.bus_type)
    ).all()
    bus_dist = [NamedValue(name=bus_type, value=float(count)) for bus_type, count in bus_rows]

    occupancy_rows = db.execute(
        select(
            Trip.id,
            func.count(TripSeatInventory.id),
            func.sum(case((TripSeatInventory.status == "SOLD", 1), else_=0)),
        )
        .join(TripSeatInventory, TripSeatInventory.trip_id == Trip.id)
        .group_by(Trip.id)
        .limit(50)
    ).all()
    occupancy_by_trip = []
    for trip_id, tot, sold in occupancy_rows:
        tot = int(tot or 0)
        sold = int(sold or 0)
        if tot:
            occupancy_by_trip.append(
                NamedValue(name=f"Trip {trip_id[:6]}", value=round(sold / tot * 100, 1))
            )
    occupancy_by_trip = sorted(occupancy_by_trip, key=lambda n: n.value, reverse=True)[:8]

    charts = DashboardCharts(
        booking_trend=booking_trend,
        revenue_trend=revenue_trend,
        popular_routes=popular_routes,
        payment_status_distribution=payment_dist,
        bus_type_distribution=bus_dist,
        occupancy_by_trip=occupancy_by_trip,
    )
    return DashboardResponse(stats=stats, charts=charts)


def _as_date(value) -> date:
    if isinstance(value, datetime):
        return to_app_tz(value).date()
    if isinstance(value, date):
        return value
    return datetime.strptime(str(value), "%Y-%m-%d").date()


def _fill_days(bucket: dict[date, float], since: datetime) -> list[TimeSeriesPoint]:
    start = to_app_tz(since).date()
    out = []
    for i in range(14):
        d = start + timedelta(days=i)
        out.append(TimeSeriesPoint(label=d.strftime("%d %b"), value=float(bucket.get(d, 0))))
    return out


def reports(db: Session, *, start: datetime, end: datetime) -> ReportsResponse:
    days = max(1, (end.date() - start.date()).days + 1)
    prev_start = start - timedelta(days=days)
    prev_end = start

    def bookings_between(a: datetime, b: datetime) -> int:
        return _count(
            db,
            select(func.count(Booking.id)).where(Booking.created_at >= a, Booking.created_at < b),
        )

    def revenue_between(a: datetime, b: datetime) -> float:
        return _sum(
            db,
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.created_at >= a,
                Payment.created_at < b,
                Payment.status == PaymentStatus.SUCCEEDED.value,
            ),
        )

    refunds = _sum(
        db,
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.created_at >= start,
            Refund.created_at < end,
            Refund.status == RefundStatus.PROCESSED.value,
        ),
    )
    new_users = _count(
        db,
        select(func.count(User.id)).where(
            User.created_at >= start, User.created_at < end, User.role == UserRole.PASSENGER.value
        ),
    )

    kpis = [
        ReportKPI(label="Bookings", value=bookings_between(start, end), previous=bookings_between(prev_start, prev_end)),
        ReportKPI(label="Revenue", value=revenue_between(start, end), previous=revenue_between(prev_start, prev_end)),
        ReportKPI(label="Refunds", value=refunds),
        ReportKPI(label="New passengers", value=new_users),
    ]

    booking_rows = db.execute(
        select(_day_expr(db, Booking.created_at), func.count(Booking.id))
        .where(Booking.created_at >= start, Booking.created_at < end)
        .group_by(_day_expr(db, Booking.created_at))
    ).all()
    revenue_rows = db.execute(
        select(_day_expr(db, Payment.created_at), func.coalesce(func.sum(Payment.amount), 0))
        .where(
            Payment.created_at >= start,
            Payment.created_at < end,
            Payment.status == PaymentStatus.SUCCEEDED.value,
        )
        .group_by(_day_expr(db, Payment.created_at))
    ).all()

    def series(rows, days_count):
        bucket = {_as_date(k): float(v) for k, v in rows}
        out = []
        base = to_app_tz(start).date()
        for i in range(days_count):
            d = base + timedelta(days=i)
            out.append(TimeSeriesPoint(label=d.strftime("%d %b"), value=bucket.get(d, 0)))
        return out

    method_rows = db.execute(
        select(Payment.method, func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.status == PaymentStatus.SUCCEEDED.value)
        .group_by(Payment.method)
    ).all()

    top_route_rows = db.execute(
        select(City.name, func.count(Booking.id))
        .join(Route, Route.destination_city_id == City.id)
        .join(Trip, Trip.route_id == Route.id)
        .join(Booking, Booking.trip_id == Trip.id)
        .where(Booking.created_at >= start, Booking.created_at < end)
        .group_by(City.name)
        .order_by(func.count(Booking.id).desc())
        .limit(8)
    ).all()

    top_operator_rows = db.execute(
        select(OperatorProfile.company_name, func.coalesce(func.sum(Payment.amount), 0))
        .join(Bus, Bus.operator_id == OperatorProfile.user_id)
        .join(Trip, Trip.bus_id == Bus.id)
        .join(Booking, Booking.trip_id == Trip.id)
        .join(Payment, Payment.booking_id == Booking.id)
        .where(
            Payment.status == PaymentStatus.SUCCEEDED.value,
            Payment.created_at >= start,
            Payment.created_at < end,
        )
        .group_by(OperatorProfile.company_name)
        .order_by(func.coalesce(func.sum(Payment.amount), 0).desc())
        .limit(8)
    ).all()

    return ReportsResponse(
        range_start=start,
        range_end=end,
        kpis=kpis,
        booking_trend=series(booking_rows, days),
        revenue_trend=series(revenue_rows, days),
        revenue_by_method=[NamedValue(name=m, value=float(v)) for m, v in method_rows],
        top_routes=[NamedValue(name=n, value=float(c)) for n, c in top_route_rows],
        top_operators=[NamedValue(name=n, value=float(v)) for n, v in top_operator_rows],
    )
