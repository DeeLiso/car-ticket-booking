from __future__ import annotations

import secrets
import string
from typing import Optional

from sqlalchemy.orm import Session

from app.models.misc import AuditLog

REFERENCE_ALPHABET = string.ascii_uppercase + string.digits
# Ambiguous characters removed for readable references.
SAFE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_reference(prefix: str = "CTB", length: int = 6) -> str:
    body = "".join(secrets.choice(SAFE_ALPHABET) for _ in range(length))
    return f"{prefix}-{body}"


def generate_unique_reference(db: Session, model, column, prefix: str = "CTB", length: int = 6) -> str:
    for _ in range(10):
        ref = generate_reference(prefix, length)
        if not db.query(model).filter(column == ref).first():
            return ref
    return f"{prefix}-{secrets.token_hex(5).upper()}"


def record_audit(
    db: Session,
    *,
    action: str,
    actor_user_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    detail: Optional[dict] = None,
) -> AuditLog:
    """Append-only audit entry. Caller owns the commit."""
    entry = AuditLog(
        action=action,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        detail=detail,
    )
    db.add(entry)
    return entry
