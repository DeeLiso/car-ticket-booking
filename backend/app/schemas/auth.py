from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import UserRole

PASSWORD_MIN = 8
_STRONG = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).+$")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN, max_length=128)
    full_name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=32)
    role: UserRole = UserRole.PASSENGER

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _STRONG.search(v):
            raise ValueError("Password must contain at least one letter and one number")
        return v

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Full name is too short")
        return v

    @field_validator("role")
    @classmethod
    def public_role(cls, v: UserRole) -> UserRole:
        # Self-registration never grants elevated roles; admins provision operators.
        if v in (UserRole.ADMIN, UserRole.BUS_OPERATOR):
            raise ValueError("This role cannot be self-assigned")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=PASSWORD_MIN, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _STRONG.search(v):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20)
    new_password: str = Field(min_length=PASSWORD_MIN, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not _STRONG.search(v):
            raise ValueError("Password must contain at least one letter and one number")
        return v
