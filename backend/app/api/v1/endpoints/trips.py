from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.schemas.trip import SeatMapResponse, TripSearchParams, TripSummary
from app.services import trip_service

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("/search")
def search_trips(
    db: Session = Depends(get_db),
    origin_city_id: Optional[str] = None,
    destination_city_id: Optional[str] = None,
    departure_date: Optional[datetime] = None,
    passengers: int = Query(1, ge=1, le=10),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bus_type: Optional[str] = None,
    operator_id: Optional[str] = None,
    departure_window: Optional[str] = Query(default=None, pattern="^(morning|afternoon|evening|night)$"),
    sort: str = Query(default="departure", pattern="^(price|departure|duration)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    params = TripSearchParams(
        origin_city_id=origin_city_id,
        destination_city_id=destination_city_id,
        departure_date=departure_date,
        passengers=passengers,
        min_price=min_price,
        max_price=max_price,
        bus_type=bus_type,
        operator_id=operator_id,
        departure_window=departure_window,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    items, total = trip_service.search_trips(db, params)
    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/{trip_id}", response_model=TripSummary)
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = trip_service.get_trip(db, trip_id)
    return trip_service.trip_summary(db, trip)


@router.get("/{trip_id}/seats", response_model=SeatMapResponse)
def get_seats(trip_id: str, db: Session = Depends(get_db)):
    return trip_service.get_seat_map(db, trip_id)
