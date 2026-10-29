from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class CookieCategoryOut(BaseModel):
    """A description of one cookie category the visitor can review."""

    key: str
    name: str
    description: str
    required: bool
    enabled_by_default: bool


class CookiePolicyOut(BaseModel):
    version: str
    effective_date: str
    updated_date: str
    optional_categories: List[str]
    categories: List[CookieCategoryOut]


class ConsentCategories(BaseModel):
    """Optional categories. Strictly necessary is always granted and implied."""

    functional: bool = False
    analytics: bool = False
    marketing: bool = False


class ConsentIn(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=64)
    policy_version: str = Field(min_length=1, max_length=16)
    # Acknowledge that the visitor has seen this policy version.
    acknowledge: bool = False
    # Record a consent decision for the optional categories.
    consent_status: Optional[Literal["ACCEPT_ALL", "REJECT_ALL", "CUSTOM"]] = None
    categories: Optional[ConsentCategories] = None
    source: Optional[str] = Field(default=None, max_length=32)


class CookieConsentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    visitor_id: str
    policy_version: str
    acknowledged_version: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    consent_status: Optional[str] = None
    consent_categories: Optional[dict] = None
    consent_at: Optional[datetime] = None
    consent_policy_version: Optional[str] = None
