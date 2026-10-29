from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import get_optional_user
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.db.session import get_db
from app.models.misc import CookieConsent
from app.models.user import User
from app.schemas.cookie import (
    ConsentCategories,
    ConsentIn,
    CookieCategoryOut,
    CookieConsentOut,
    CookiePolicyOut,
)

router = APIRouter(prefix="/cookies", tags=["cookies"])

# Canonical category descriptions. The order here is the order the UI renders.
_COOKIE_CATEGORIES = [
    CookieCategoryOut(
        key="necessary",
        name="Strictly Necessary Cookies",
        description=(
            "Required for the site to work — keeping you signed in, holding your seat, "
            "and securing checkout. These cannot be switched off."
        ),
        required=True,
        enabled_by_default=True,
    ),
    CookieCategoryOut(
        key="functional",
        name="Functional Cookies",
        description=(
            "Remember your preferences and choices, such as your selected city and "
            "booking details, to make the site easier to use."
        ),
        required=False,
        enabled_by_default=False,
    ),
    CookieCategoryOut(
        key="analytics",
        name="Analytics Cookies",
        description=(
            "Help us understand how the site is used so we can improve routes, search "
            "and the booking experience."
        ),
        required=False,
        enabled_by_default=False,
    ),
    CookieCategoryOut(
        key="marketing",
        name="Marketing Cookies",
        description=(
            "Used to show you relevant offers and travel deals. We do not load these "
            "until you allow them."
        ),
        required=False,
        enabled_by_default=False,
    ),
]

_VALID_KEYS = {c.key for c in _COOKIE_CATEGORIES}


def _optional_keys() -> list[str]:
    return [c.key for c in _COOKIE_CATEGORIES if not c.required]


@router.get("/policy", response_model=CookiePolicyOut)
def get_cookie_policy() -> CookiePolicyOut:
    """Return the current cookie policy metadata (version + categories)."""
    return CookiePolicyOut(
        version=settings.cookie_policy_version,
        effective_date=settings.cookie_policy_effective_date,
        updated_date=settings.cookie_policy_updated_date,
        optional_categories=_optional_keys(),
        categories=_COOKIE_CATEGORIES,
    )


@router.get("/consent/{visitor_id}", response_model=CookieConsentOut)
def get_consent(visitor_id: str, db=Depends(get_db)) -> CookieConsentOut:
    """Look up a visitor's saved acknowledgement and consent, if any."""
    record = db.scalar(select(CookieConsent).where(CookieConsent.visitor_id == visitor_id))
    if record is None:
        raise NotFoundError("No consent record for this visitor")
    return CookieConsentOut.model_validate(record)


def _normalize_categories(status: str, categories: Optional[ConsentCategories]) -> dict:
    """Validate the category payload against the consent status.

    Strictly necessary is always granted, so it is normalised to True.
    """
    if status == "ACCEPT_ALL":
        return {"necessary": True, "functional": True, "analytics": True, "marketing": True}
    if status == "REJECT_ALL":
        return {"necessary": True, "functional": False, "analytics": False, "marketing": False}
    if categories is None:
        raise ValidationError("categories are required when consent_status is CUSTOM")
    return {
        "necessary": True,
        "functional": bool(categories.functional),
        "analytics": bool(categories.analytics),
        "marketing": bool(categories.marketing),
    }


@router.post("/consent", response_model=CookieConsentOut)
def save_consent(
    payload: ConsentIn,
    request: Request,
    db=Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
) -> CookieConsentOut:
    """Upsert a visitor's acknowledgement and/or consent.

    Acknowledgement and consent are stored separately so either can be updated
    without discarding the other.
    """
    if payload.policy_version != settings.cookie_policy_version:
        raise ConflictError(
            "The cookie policy has been updated. Please refresh and review the latest version."
        )
    if not payload.acknowledge and payload.consent_status is None:
        raise ValidationError("Nothing to save — provide acknowledge and/or consent_status")
    if payload.consent_status is not None:
        if payload.categories is None and payload.consent_status not in ("ACCEPT_ALL", "REJECT_ALL"):
            raise ValidationError("categories are required for a custom preference")
        if payload.categories is not None:
            provided = payload.categories.model_dump().keys()
            unknown = set(provided) - _VALID_KEYS
            if unknown:
                raise ValidationError(f"Unknown cookie categories: {', '.join(sorted(unknown))}")

    now = utcnow()
    record = db.scalar(select(CookieConsent).where(CookieConsent.visitor_id == payload.visitor_id))
    if record is None:
        record = CookieConsent(
            visitor_id=payload.visitor_id,
            policy_version=payload.policy_version,
        )
        db.add(record)

    if user is not None:
        record.user_id = user.id
    record.policy_version = payload.policy_version

    if payload.acknowledge:
        record.acknowledged_version = payload.policy_version
        record.acknowledged_at = now

    if payload.consent_status is not None:
        record.consent_status = payload.consent_status
        record.consent_categories = _normalize_categories(payload.consent_status, payload.categories)
        record.consent_at = now
        record.consent_policy_version = payload.policy_version

    # Best-effort evidence; never treated as authorship proof on its own.
    if payload.source:
        record.source = payload.source
    client_host = request.client.host if request.client else None
    if client_host:
        record.ip_address = client_host[:64]
    user_agent = request.headers.get("user-agent")
    if user_agent:
        record.user_agent = user_agent[:255]

    db.commit()
    db.refresh(record)
    return CookieConsentOut.model_validate(record)
