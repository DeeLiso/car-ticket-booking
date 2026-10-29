from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPk


class Notification(Base, UUIDPk, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_read", "user_id", "read_at"),)

    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(24), nullable=False, default="SYSTEM")
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    link: Mapped[Optional[str]] = mapped_column(String(255))
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class CookieConsent(Base, UUIDPk, TimestampMixin):
    """Server-side record of a visitor's cookie policy acknowledgement and consent.

    Acknowledgement (they have seen the current policy version) is stored
    separately from consent (which optional categories they allow) so the two
    can evolve independently.
    """

    __tablename__ = "cookie_consents"
    __table_args__ = (Index("ix_cookie_consents_visitor", "visitor_id"),)

    visitor_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL")
    )
    # Latest policy version the record relates to.
    policy_version: Mapped[str] = mapped_column(String(16), nullable=False)
    # Acknowledgement — the visitor has seen this policy version.
    acknowledged_version: Mapped[Optional[str]] = mapped_column(String(16))
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # Consent — which optional categories the visitor allows.
    consent_status: Mapped[Optional[str]] = mapped_column(String(16))
    consent_categories: Mapped[Optional[dict]] = mapped_column(JSON)
    consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    consent_policy_version: Mapped[Optional[str]] = mapped_column(String(16))
    # Light-touch evidence for auditing (best-effort, never used as proof alone).
    source: Mapped[Optional[str]] = mapped_column(String(32))
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
    user_agent: Mapped[Optional[str]] = mapped_column(String(255))


class AuditLog(Base, UUIDPk, TimestampMixin):
    """Immutable audit trail for sensitive administrative actions."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_actor_created", "actor_user_id", "created_at"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
    )

    actor_user_id: Mapped[Optional[str]] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    actor_role: Mapped[Optional[str]] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(48))
    entity_id: Mapped[Optional[str]] = mapped_column(String(64))
    ip_address: Mapped[Optional[str]] = mapped_column(String(64))
    detail: Mapped[Optional[dict]] = mapped_column(JSON)
