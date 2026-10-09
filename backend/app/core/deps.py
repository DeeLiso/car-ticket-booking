from __future__ import annotations

from typing import Callable, Optional

import jwt
from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole, UserStatus
from app.models.user import User
from app.schemas.common import PaginationParams

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Missing bearer token")
    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Access token expired")
    except jwt.PyJWTError:
        raise UnauthorizedError("Invalid access token")

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise UnauthorizedError("User account is not active")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    user = db.get(User, payload.get("sub"))
    return user if user and user.is_active else None


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    allowed = {r.value for r in roles}

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise ForbiddenError("Insufficient role for this resource")
        return user

    return _guard


def get_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN.value:
        raise ForbiddenError("Administrator access required")
    return user


def require_operator_or_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.ADMIN.value, UserRole.BUS_OPERATOR.value):
        raise ForbiddenError("Operator or administrator access required")
    return user


def active_user(user: User = Depends(get_current_user)) -> User:
    if user.status != UserStatus.ACTIVE.value:
        raise ForbiddenError("Account is not active")
    return user
