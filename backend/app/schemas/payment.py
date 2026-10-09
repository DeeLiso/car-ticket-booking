from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PaymentMethod, PaymentStatus, RefundStatus


class PaymentInitiateRequest(BaseModel):
    booking_id: str
    method: PaymentMethod

    @property
    def is_mock(self) -> bool:
        return self.method == PaymentMethod.MOCK


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    booking_id: str
    method: PaymentMethod
    provider: str
    amount: float
    currency: str
    status: PaymentStatus
    transaction_ref: str
    provider_ref: Optional[str] = None
    failure_reason: Optional[str] = None
    initiated_at: datetime
    paid_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None


class PaymentInitiateResponse(BaseModel):
    payment: PaymentOut
    redirect_url: Optional[str] = None
    instructions: Optional[str] = None
    # Only present for the development-only mock adapter.
    mock_confirm_token: Optional[str] = None


class MockConfirmRequest(BaseModel):
    transaction_ref: str
    confirm_token: str
    succeed: bool = True


class WebhookResult(BaseModel):
    received: bool = True
    processed: bool = False
    duplicate: bool = False
    message: str = "ok"
    payment_id: Optional[str] = None


class RefundOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    payment_id: str
    booking_id: str
    amount: float
    currency: str
    status: RefundStatus
    reason: Optional[str] = None
    reference: str
    created_at: datetime
    processed_at: Optional[datetime] = None


class RefundRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=255)


class RefundDecision(BaseModel):
    approve: bool
    note: Optional[str] = Field(default=None, max_length=255)
