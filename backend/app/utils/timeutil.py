from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


def app_tz() -> ZoneInfo:
    return ZoneInfo(settings.app_timezone)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime) -> datetime:
    """Coerce naive datetimes (e.g. from SQLite) to UTC-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def to_app_tz(dt: datetime) -> datetime:
    return ensure_aware(dt).astimezone(app_tz())


def day_bounds_utc(day: datetime) -> tuple[datetime, datetime]:
    """Given any datetime, return the [start, end) UTC bounds of that local day."""
    local = day if day.tzinfo else day.replace(tzinfo=app_tz())
    local = local.astimezone(app_tz())
    start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)
