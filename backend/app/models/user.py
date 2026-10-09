from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk
from app.models.enums import UserRole, UserStatus

if TYPE_CHECKING:
    from app.models.booking import Booking


class User(Base, UUIDPk, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32), index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.PASSENGER.value, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=UserStatus.ACTIVE.value)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    passenger_profile: Mapped[Optional["PassengerProfile"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    operator_profile: Mapped[Optional["OperatorProfile"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")

    @property
    def is_active(self) -> bool:
        return self.status == UserStatus.ACTIVE.value and self.deleted_at is None


class PassengerProfile(Base, UUIDPk, TimestampMixin):
    __tablename__ = "passenger_profiles"

    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    id_number: Mapped[Optional[str]] = mapped_column(String(64))
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    address: Mapped[Optional[str]] = mapped_column(String(255))
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(32))

    user: Mapped["User"] = relationship(back_populates="passenger_profile")


class OperatorProfile(Base, UUIDPk, TimestampMixin):
    __tablename__ = "operator_profiles"

    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    company_name: Mapped[str] = mapped_column(String(120), nullable=False)
    license_number: Mapped[Optional[str]] = mapped_column(String(64))
    contact_phone: Mapped[Optional[str]] = mapped_column(String(32))
    website: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_verified: Mapped[bool] = mapped_column(default=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(255))

    user: Mapped["User"] = relationship(back_populates="operator_profile")


class RefreshToken(Base, UUIDPk, TimestampMixin):
    """Rotating refresh tokens. A rotated token is revoked and linked to its successor."""

    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_tokens_user_id", "user_id"),)

    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    jti: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    family: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    replaced_by_jti: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent: Mapped[Optional[str]] = mapped_column(String(255))
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
