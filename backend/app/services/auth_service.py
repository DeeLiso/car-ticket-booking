from __future__ import annotations

from datetime import timedelta
from typing import Optional, Tuple

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.enums import UserRole, UserStatus
from app.models.user import OperatorProfile, PassengerProfile, RefreshToken, User
from app.schemas.auth import RegisterRequest, TokenPair, UserOut
from app.utils.timeutil import ensure_aware, now_utc


def _issue_tokens(db: Session, user: User, *, user_agent: Optional[str], ip: Optional[str]) -> TokenPair:
    access = create_access_token(user.id, user.role)
    refresh = create_refresh_token(user.id, user.role)
    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            jti=payload["jti"],
            family=payload["jti"],
            expires_at=_from_ts(payload["exp"]),
            user_agent=(user_agent or "")[:255] or None,
            ip_address=(ip or "")[:64] or None,
        )
    )
    db.commit()
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


def _from_ts(ts) -> "object":
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ts, tz=timezone.utc)


def register(
    db: Session, payload: RegisterRequest, *, user_agent: str | None = None, ip: str | None = None
) -> TokenPair:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise ConflictError("An account with this email already exists")

    user = User(
        email=email,
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.PASSENGER.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()
    db.add(PassengerProfile(user_id=user.id))
    db.commit()
    db.refresh(user)
    return _issue_tokens(db, user, user_agent=user_agent, ip=ip)


def login(
    db: Session, email: str, password: str, *, user_agent: str | None = None, ip: str | None = None
) -> TokenPair:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.password_hash):
        # Constant-ish error to avoid user enumeration.
        raise UnauthorizedError("Invalid email or password")
    if not user.is_active:
        raise UnauthorizedError("This account is not active")
    user.last_login_at = now_utc()
    db.flush()
    return _issue_tokens(db, user, user_agent=user_agent, ip=ip)


def refresh(db: Session, refresh_token: str, *, user_agent: str | None = None, ip: str | None = None) -> TokenPair:
    try:
        payload = decode_token(refresh_token)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Refresh token expired")
    except jwt.PyJWTError:
        raise UnauthorizedError("Invalid refresh token")

    if payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid token type")

    stored = db.scalar(select(RefreshToken).where(RefreshToken.jti == payload["jti"]))
    if stored is None or stored.revoked_at is not None:
        # Token reuse detected: revoke the whole family.
        if stored is not None:
            db.query(RefreshToken).filter(RefreshToken.family == stored.family).update(
                {"revoked_at": now_utc()}
            )
            db.commit()
        raise UnauthorizedError("Refresh token is no longer valid")

    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise UnauthorizedError("User account is not active")

    tokens = _issue_tokens(db, user, user_agent=user_agent, ip=ip)
    # Rotate: revoke the old token and link to its successor.
    new_payload = decode_token(tokens.refresh_token)
    stored.revoked_at = now_utc()
    stored.replaced_by_jti = new_payload["jti"]
    db.commit()
    return tokens


def logout(db: Session, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except jwt.PyJWTError:
        return
    db.query(RefreshToken).filter(RefreshToken.jti == payload.get("jti")).update(
        {"revoked_at": now_utc()}
    )
    db.commit()


def change_password(db: Session, user: User, current: str, new: str) -> None:
    if not verify_password(current, user.password_hash):
        raise UnauthorizedError("Current password is incorrect")
    user.password_hash = hash_password(new)
    # Invalidate all refresh tokens after a password change.
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": now_utc()})
    db.commit()


def create_operator(db: Session, *, email, password, full_name, company_name, license_number, contact_phone, is_verified) -> User:
    if db.scalar(select(User).where(User.email == email.lower())):
        raise ConflictError("An account with this email already exists")
    user = User(
        email=email.lower(),
        full_name=full_name,
        password_hash=hash_password(password),
        role=UserRole.BUS_OPERATOR.value,
        status=UserStatus.ACTIVE.value,
    )
    db.add(user)
    db.flush()
    db.add(
        OperatorProfile(
            user_id=user.id,
            company_name=company_name,
            license_number=license_number,
            contact_phone=contact_phone,
            is_verified=is_verified,
        )
    )
    db.commit()
    db.refresh(user)
    return user


def get_user_or_404(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found")
    return user
