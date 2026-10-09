from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_db
from app.core.exceptions import NotFoundError
from app.models.catalog import Bus, City, Route
from app.schemas.catalog import CityOut, RouteOut
from app.models.user import OperatorProfile
from app.schemas.admin import OperatorOut

router = APIRouter(tags=["catalog"])


@router.get("/cities", response_model=List[CityOut])
def list_cities(
    db: Session = Depends(get_db),
    popular: Optional[bool] = Query(default=None),
    active_only: bool = Query(default=True),
):
    stmt = select(City)
    if active_only:
        stmt = stmt.where(City.is_active.is_(True))
    if popular is not None:
        stmt = stmt.where(City.is_popular.is_(popular))
    stmt = stmt.order_by(City.sort_order, City.name)
    return db.scalars(stmt).all()


@router.get("/routes", response_model=List[RouteOut])
def list_routes(
    db: Session = Depends(get_db),
    origin_city_id: Optional[str] = None,
    destination_city_id: Optional[str] = None,
    active_only: bool = Query(default=True),
):
    stmt = select(Route).options(selectinload(Route.origin_city), selectinload(Route.destination_city))
    if active_only:
        stmt = stmt.where(Route.is_active.is_(True))
    if origin_city_id:
        stmt = stmt.where(Route.origin_city_id == origin_city_id)
    if destination_city_id:
        stmt = stmt.where(Route.destination_city_id == destination_city_id)
    return db.scalars(stmt.order_by(Route.created_at)).all()


@router.get("/routes/{route_id}", response_model=RouteOut)
def get_route(route_id: str, db: Session = Depends(get_db)):
    route = db.get(Route, route_id)
    if route is None:
        raise NotFoundError("Route not found")
    return route


@router.get("/operators", response_model=List[OperatorOut])
def list_operators(db: Session = Depends(get_db)):
    profiles = db.scalars(select(OperatorProfile).order_by(OperatorProfile.company_name)).all()
    out = []
    for p in profiles:
        buses = db.scalar(
            select(Bus.id).where(Bus.operator_id == p.user_id, Bus.deleted_at.is_(None)).limit(1)
        )
        item = OperatorOut.model_validate(p)
        item.email = p.user.email if p.user else None
        item.full_name = p.user.full_name if p.user else None
        item.buses_count = 1 if buses else 0
        out.append(item)
    return out
