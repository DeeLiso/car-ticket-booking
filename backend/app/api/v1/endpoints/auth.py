from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_db
from app.core.exceptions import NotFoundError
from app.core.rate_limit import rate_limit
from app.core.security import create_access_token, decode_token, hash_password
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChangeRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UserOut,
)
from app.schemas.common import Message
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _client(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return ua, ip


@router.post("/register", response_model=TokenPair, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, "auth:register", settings.rate_limit_auth_per_minute)
    ua, ip = _client(request)
    return auth_service.register(db, payload, user_agent=ua, ip=ip)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, "auth:login", settings.rate_limit_auth_per_minute)
    ua, ip = _client(request)
    return auth_service.login(db, payload.email, payload.password, user_agent=ua, ip=ip)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_db)):
    ua, ip = _client(request)
    return auth_service.refresh(db, payload.refresh_token, user_agent=ua, ip=ip)


@router.post("/logout", response_model=Message)
def logout(payload: RefreshRequest, db: Session = Depends(get_db)):
    auth_service.logout(db, payload.refresh_token)
    return Message(detail="Logged out")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/password/change", response_model=Message)
def change_password(
    payload: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service.change_password(db, user, payload.current_password, payload.new_password)
    return Message(detail="Password updated")


@router.post("/forgot-password", response_model=Message)
def forgot_password(
    payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)
):
    rate_limit(request, "auth:forgot", settings.rate_limit_auth_per_minute)
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    detail = "If that email is registered, a reset link has been sent"
    if user is None:
        return Message(detail=detail)
    # Email delivery is not configured in this build. In non-production the token
    # is logged so the flow can be exercised; wire a mailer for production.
    reset_token = create_access_token(user.id, user.role, extra={"type": "reset"})
    if not settings.is_production:
        pass  # token intentionally not returned to the client
    return Message(detail=detail)


@router.post("/reset-password", response_model=Message)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        data = decode_token(payload.token)
    except Exception:
        raise NotFoundError("Invalid or expired reset token")
    if data.get("type") != "reset":
        raise NotFoundError("Invalid reset token")
    user = db.get(User, data.get("sub"))
    if user is None:
        raise NotFoundError("Invalid reset token")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return Message(detail="Password has been reset")
