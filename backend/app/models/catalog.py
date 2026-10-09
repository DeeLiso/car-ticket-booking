from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk

if TYPE_CHECKING:
    from app.models.trip import Trip


class City(Base, UUIDPk, TimestampMixin):
    """Editable city catalogue - popular destinations shown on the homepage."""

    __tablename__ = "cities"

    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    region: Mapped[Optional[str]] = mapped_column(String(80))
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="Myanmar")
    is_popular: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Route(Base, UUIDPk, TimestampMixin):
    __tablename__ = "routes"
    __table_args__ = (
        UniqueConstraint("origin_city_id", "destination_city_id", name="uq_routes_origin_destination"),
        CheckConstraint("duration_minutes > 0", name="duration_positive"),
        CheckConstraint("distance_km IS NULL OR distance_km > 0", name="distance_positive"),
        Index("ix_routes_origin_destination", "origin_city_id", "destination_city_id"),
    )

    origin_city_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
    )
    destination_city_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
    )
    distance_km: Mapped[Optional[float]] = mapped_column(Float)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    origin_city: Mapped["City"] = relationship(foreign_keys=[origin_city_id])
    destination_city: Mapped["City"] = relationship(foreign_keys=[destination_city_id])


class Bus(Base, UUIDPk, TimestampMixin):
    __tablename__ = "buses"
    __table_args__ = (
        CheckConstraint("seat_capacity > 0 AND seat_capacity <= 100", name="capacity_range"),
        Index("ix_buses_operator_id_active", "operator_id", "is_active"),
    )

    operator_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    registration_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    bus_type: Mapped[str] = mapped_column(String(32), nullable=False)
    layout: Mapped[str] = mapped_column(String(8), nullable=False, default="2+2")
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    amenities: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    seats: Mapped[list["BusSeat"]] = relationship(
        back_populates="bus", cascade="all, delete-orphan", order_by="BusSeat.row_index, BusSeat.col_index"
    )


class BusSeat(Base, UUIDPk, TimestampMixin):
    """A physical seat of a bus layout. Seats belong to a bus, not to a trip."""

    __tablename__ = "bus_seats"
    __table_args__ = (
        UniqueConstraint("bus_id", "seat_number", name="uq_bus_seats_bus_seat_number"),
        UniqueConstraint("bus_id", "row_index", "col_index", name="uq_bus_seats_position"),
    )

    bus_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seat_number: Mapped[str] = mapped_column(String(8), nullable=False)
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)
    col_index: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="ORDINARY")
    price_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    is_accessible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    bus: Mapped["Bus"] = relationship(back_populates="seats")


class SystemSetting(Base, UUIDPk, TimestampMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    value: Mapped[object] = mapped_column(JSON, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    updated_by: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("users.id", ondelete="SET NULL"))
