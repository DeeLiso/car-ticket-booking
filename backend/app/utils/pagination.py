from __future__ import annotations

import math

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.schemas.common import Page


def paginate(db: Session, stmt, page: int, page_size: int, schema, *, unique: bool = False):
    """Execute a SELECT and return a ``Page`` of serialized rows.

    The count query wraps the original statement so filters are preserved.
    """
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    if unique:
        stmt = stmt.distinct()
    rows = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    pages = max(1, math.ceil(total / page_size)) if total else 1
    items = [schema.model_validate(r) for r in rows] if schema else rows
    return Page(items=items, total=total, page=page, page_size=page_size, pages=pages)
