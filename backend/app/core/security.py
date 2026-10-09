"""Password hashing and JWT helpers.

pwdlib (argon2) is used for password hashing - passlib is unmaintained and
broken on Python 3.13.  Tokens are HMAC signed JWTs; refresh tokens carry a
rotating ``jti`` so they can be revoked server side.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _password_hash.verify(password, hashed)
    except Exception:
        return False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: str, role: str, extra: Dict[str, Any] | None = None) -> str:
    now = _now()
    payload = {
        "sub": subject,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "jti": uuid.uuid4().hex,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str, role: str) -> str:
    now = _now()
    payload = {
        "sub": subject,
        "role": role,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a token. Raises ``jwt.PyJWTError`` on failure."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def new_ticket_token(booking_ref: str) -> str:
    """Unpredictable, non-personal token embedded in the QR code.

    Kept for callers that want a random opaque token; the signed-reference
    helpers below are the default for tickets because they can be regenerated
    deterministically for the ticket owner.
    """
    return secrets.token_urlsafe(32)


def hash_ticket_token(token: str) -> str:
    """Hash stored at rest so a leaked DB does not yield usable QR payloads."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_ticket_reference(ticket_id: str) -> str:
    """Build a signed, deterministic ticket reference for the QR code.

    The payload contains no passenger PII - only an opaque ticket id plus an
    HMAC signature. Because it is deterministic it can be regenerated whenever
    the ticket is rendered, while remaining unforgeable without the secret key.
    """
    body = base64.urlsafe_b64encode(ticket_id.encode("utf-8")).decode("ascii").rstrip("=")
    signature = hmac.new(
        settings.secret_key.encode("utf-8"), f"ticket:{ticket_id}".encode("utf-8"), hashlib.sha256
    ).hexdigest()[:32]
    return f"{body}.{signature}"


def verify_ticket_reference(token: str) -> str | None:
    """Verify a signed ticket reference. Returns the ticket id or ``None``."""
    if not token or "." not in token:
        return None
    body, _, signature = token.rpartition(".")
    try:
        padding = "=" * (-len(body) % 4)
        ticket_id = base64.urlsafe_b64decode(body + padding).decode("utf-8")
    except Exception:
        return None
    expected = hmac.new(
        settings.secret_key.encode("utf-8"), f"ticket:{ticket_id}".encode("utf-8"), hashlib.sha256
    ).hexdigest()[:32]
    return ticket_id if hmac.compare_digest(expected, signature) else None


def random_numeric_pin(length: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))
