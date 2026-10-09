from __future__ import annotations

import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.db.base import Base
from app.db.session import engine
from app.middleware.context import RequestContextMiddleware
from app.tasks.reservation_expirer import ReservationExpirer
from app.utils.logging import logger


def _error_response(status_code: int, message: str, code: str, detail=None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"message": message, "code": code, "detail": detail}},
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.is_production and not settings.jwt_secret_ok:
        raise RuntimeError("SECRET_KEY must be set to a strong value in production")
    if settings.is_production and settings.payment_provider == "mock":
        raise RuntimeError("The mock payment provider cannot be used in production")

    # Convenience for local/dev/test runs. Production uses Alembic migrations.
    if settings.is_sqlite and not settings.is_production:
        import app.models  # noqa: F401  ensure models are registered

        Base.metadata.create_all(bind=engine)

    expirer = None
    if settings.environment != "test":
        expirer = ReservationExpirer(interval_seconds=60)
        expirer.start()

    logger.info("Starting %s v%s (%s)", settings.app_name, settings.app_version, settings.environment)
    try:
        yield
    finally:
        if expirer:
            expirer.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Premium car & bus ticket booking API. Search trips, reserve seats "
            "transactionally, pay through a provider adapter, and issue QR tickets."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    if settings.allowed_hosts and settings.allowed_hosts != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    app.add_middleware(RequestContextMiddleware)

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return _error_response(exc.status_code, exc.message, exc.code, exc.detail)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        return _error_response(422, "Validation failed", "validation_error", jsonable_encoder(exc.errors()))

    @app.exception_handler(IntegrityError)
    async def integrity_handler(request: Request, exc: IntegrityError):
        logger.warning("Integrity error: %s", exc.orig)
        return _error_response(409, "The request conflicts with existing data", "conflict")

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        logger.error("Unhandled error: %s\n%s", exc, traceback.format_exc())
        # Never leak stack traces to clients.
        return _error_response(500, "An unexpected error occurred", "internal_error")

    app.include_router(api_router)

    @app.get("/", tags=["system"])
    def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "api": "/api/v1",
        }

    return app


app = create_app()
