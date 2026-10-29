from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models.enums import NotificationType
from app.models.misc import Notification


def notify(
    db: Session,
    *,
    user_id: str,
    type: NotificationType,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
) -> Notification:
    """Queue a user notification. The caller owns the commit."""
    notif = Notification(
        user_id=user_id,
        type=type.value,
        title=title,
        body=body,
        link=link,
    )
    db.add(notif)
    return notif
