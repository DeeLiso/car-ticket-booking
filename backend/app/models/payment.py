from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPk
from app.models.enums import PaymentStatus, RefundStatus

if TYPE_CHECKING:
    from app.models.booking import Booking


class Payment(Base, UUIDPk, TimestampMixin):
    """Amounts are always computed by the backend; the client never supplies them."""

    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="payment_amount_non_negative"),
        Index("ix_payments_booking_status", "booking_id", "status"),
        Index("ix_payments_status_created", "status", "created_at"),
    )

    booking_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    method: Mapped[str] = mapped_column(String(24), nullable=False)
    provider: Mapped[str] = mapped_column(String(24), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="MMK")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PaymentStatus.PENDING.value, index=True
    )
    transaction_ref: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    provider_ref: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255))
    initiated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    provider_payload: Mapped[Optional[dict]] = mapped_column(JSON)

    booking: Mapped["Booking"] = relationship(back_populates="payments")
    refunds: Mapped[list["Refund"]] = relationship(back_populates="payment")


class Refund(Base, UUIDPk, TimestampMixin):
    __tablename__ = "refunds"
    __table_args__ = (
        CheckConstraint("amount > 0", name="refund_amount_positive"),
        Index("ix_refunds_booking", "booking_id"),
    )

    payment_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("payments.id", ondelete="RESTRICT"), nullable=False
    )
    booking_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("bookings.id", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="MMK")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=RefundStatus.REQUESTED.value)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    reference: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    requested_by: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("users.id", ondelete="SET NULL"))
    processed_by: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("users.id", ondelete="SET NULL"))
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    payment: Mapped["Payment"] = relationship(back_populates="refunds")
