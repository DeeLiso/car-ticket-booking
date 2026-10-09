from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    auth,
    bookings,
    cities,
    health,
    operator,
    payments,
    profile,
    tickets,
    trips,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(cities.router)
api_router.include_router(trips.router)
api_router.include_router(bookings.router)
api_router.include_router(payments.router)
api_router.include_router(tickets.router)
api_router.include_router(profile.router)
api_router.include_router(operator.router)
api_router.include_router(admin.router)
