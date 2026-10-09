from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_roles
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.enums import UserRole
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    MockConfirmRequest,
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentOut,
    WebhookResult,
)
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    payload: PaymentInitiateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return payment_service.initiate_payment(
        db, user=user, booking_id=payload.booking_id, method=payload.method
    )


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise NotFoundError("Payment not found")
    if user.role not in (UserRole.ADMIN.value, UserRole.BUS_OPERATOR.value) and payment.user_id != user.id:
        raise ForbiddenError("This payment does not belong to you")
    return payment


@router.post("/webhooks/{provider}", response_model=WebhookResult)
async def payment_webhook(provider: str, request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    headers = {k.lower(): v for k, v in request.headers.items()}
    return payment_service.handle_webhook(db, provider_name=provider, body=body, headers=headers)


@router.post("/mock/confirm", response_model=PaymentInitiateResponse)
def mock_confirm(
    payload: MockConfirmRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment, ticket, raw_token = payment_service.mock_confirm(
        db,
        user=user,
        transaction_ref=payload.transaction_ref,
        token=payload.confirm_token,
        succeed=payload.succeed,
    )
    return PaymentInitiateResponse(
        payment=PaymentOut.model_validate(payment),
        mock_confirm_token=None,
        instructions="Tickets are issued after confirmation; view them in your bookings.",
    )
