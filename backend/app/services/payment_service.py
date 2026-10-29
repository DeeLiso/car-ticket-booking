from __future__ import annotations

from datetime import timezone
from typing import Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    PaymentError,
    PreconditionFailed,
)
from app.models.booking import Booking
from app.models.enums import (
    BookingStatus,
    PaymentMethod,
    PaymentStatus,
    RefundStatus,
    TicketStatus,
)
from app.models.payment import Payment, Refund
from app.models.user import User
from app.schemas.payment import PaymentInitiateResponse, PaymentOut, WebhookResult
from app.services import booking_service, ticket_service
from app.services.payments.base import InitiationResult, PaymentProvider
from app.services.payments.providers import (
    BankTransferProvider,
    CBPayProvider,
    KBZPayProvider,
    MMPayProvider,
    MockPaymentProvider,
    WavePayProvider,
)
from app.utils.refs import generate_unique_reference
from app.utils.timeutil import ensure_aware, now_utc

_PROVIDER_CLASSES = {
    PaymentMethod.MOCK: MockPaymentProvider,
    PaymentMethod.KBZPAY: KBZPayProvider,
    PaymentMethod.WAVEPAY: WavePayProvider,
    PaymentMethod.CBPAY: CBPayProvider,
    PaymentMethod.MMPAY: MMPayProvider,
    PaymentMethod.BANK_TRANSFER: BankTransferProvider,
}


def get_provider(method: PaymentMethod) -> PaymentProvider:
    cls = _PROVIDER_CLASSES.get(method)
    if cls is None:
        raise PaymentError(f"Unsupported payment method: {method}")
    provider = cls()
    if not provider.is_configured():
        raise PaymentError(
            f"{provider.name} is not configured. Add its credentials to the environment "
            "or choose another method."
        )
    return provider


def get_provider_by_name(name: str) -> PaymentProvider:
    for method, cls in _PROVIDER_CLASSES.items():
        if cls.name == name.lower():
            return cls()
    raise NotFoundError(f"Unknown payment provider: {name}")


def initiate_payment(
    db: Session, *, user: User, booking_id: str, method: PaymentMethod
) -> PaymentInitiateResponse:
    booking = booking_service.get_booking_for_user(db, booking_id, user)
    if booking.status == BookingStatus.CONFIRMED.value:
        raise ConflictError("Booking is already paid and confirmed")
    if booking.status != BookingStatus.PENDING.value:
        raise ConflictError(f"Booking in status {booking.status} cannot be paid")
    if booking.expires_at is not None and ensure_aware(booking.expires_at) < now_utc():
        raise PreconditionFailed("Booking reservation has expired")

    provider = get_provider(method)

    # Reuse a pending payment for the same booking+method instead of spamming rows.
    payment = db.scalar(
        select(Payment).where(
            Payment.booking_id == booking.id,
            Payment.method == method.value,
            Payment.status.in_([PaymentStatus.PENDING.value, PaymentStatus.PROCESSING.value]),
        )
    )
    if payment is None:
        payment = Payment(
            booking_id=booking.id,
            user_id=user.id,
            method=method.value,
            provider=provider.name,
            amount=float(booking.total_amount),  # server-calculated
            currency=booking.currency,
            status=PaymentStatus.PENDING.value,
            transaction_ref=generate_unique_reference(db, Payment, Payment.transaction_ref, "PAY", 10),
            initiated_at=now_utc(),
        )
        db.add(payment)
        db.flush()

    result: InitiationResult = provider.initiate(
        transaction_ref=payment.transaction_ref,
        amount=float(payment.amount),
        currency=payment.currency,
        booking_reference=booking.reference,
        return_url=f"/bookings/{booking.id}",
    )
    payment.provider_ref = result.provider_ref
    payment.status = PaymentStatus.PROCESSING.value
    payment.provider_payload = {
        "instructions": result.instructions,
        "redirect_url": result.redirect_url,
        "qr_payload": result.qr_payload,
    }
    db.commit()
    db.refresh(payment)

    return PaymentInitiateResponse(
        payment=PaymentOut.model_validate(payment),
        redirect_url=result.redirect_url,
        instructions=result.instructions,
        qr_payload=result.qr_payload,
        mock_confirm_token=result.mock_token,
    )


def _finalize_success(
    db: Session,
    payment: Payment,
    *,
    provider_ref: Optional[str],
    raw: Optional[dict],
) -> Tuple[Payment, object, Optional[str]]:
    """Mark a payment succeeded and confirm the booking. Idempotent."""
    if payment.status == PaymentStatus.SUCCEEDED.value:
        booking = db.get(Booking, payment.booking_id)
        ticket = booking.ticket if booking else None
        return payment, ticket, None

    payment.status = PaymentStatus.SUCCEEDED.value
    payment.paid_at = now_utc()
    payment.verified_at = now_utc()
    if provider_ref:
        payment.provider_ref = provider_ref
    if raw is not None:
        payment.provider_payload = {**(payment.provider_payload or {}), "webhook": raw}

    booking = db.get(Booking, payment.booking_id)
    if booking is None:
        raise NotFoundError("Booking for payment not found")

    booking_service.confirm_after_payment(db, booking, commit=False)
    ticket, raw_token = ticket_service.issue_ticket(db, booking)
    db.commit()
    db.refresh(payment)
    return payment, ticket, raw_token


def verify_and_complete(
    db: Session,
    payment: Payment,
    *,
    provider_ref: Optional[str] = None,
    reported_amount: Optional[float] = None,
    raw: Optional[dict] = None,
) -> Tuple[Payment, object, Optional[str]]:
    # Never trust an amount reported by the client / provider over our own record.
    if reported_amount is not None and abs(float(reported_amount) - float(payment.amount)) > 0.01:
        payment.status = PaymentStatus.FAILED.value
        payment.failure_reason = "Amount mismatch during verification"
        db.commit()
        raise PaymentError("Payment amount does not match the booking total")

    return _finalize_success(db, payment, provider_ref=provider_ref, raw=raw)


def handle_webhook(
    db: Session, *, provider_name: str, body: bytes, headers: Dict[str, str]
) -> WebhookResult:
    provider = get_provider_by_name(provider_name)
    if not provider.is_configured():
        raise PaymentError(f"{provider.name} is not configured")

    event = provider.parse_webhook(body, headers)

    payment = db.scalar(select(Payment).where(Payment.transaction_ref == event.transaction_ref))
    if payment is None:
        # Unknown reference: acknowledge to avoid infinite provider retries, but do not process.
        return WebhookResult(processed=False, message="Unknown transaction reference")

    # Idempotency: a repeated webhook for an already-settled payment is a no-op.
    if payment.status in (
        PaymentStatus.SUCCEEDED.value,
        PaymentStatus.REFUNDED.value,
    ):
        return WebhookResult(processed=False, duplicate=True, message="Already processed", payment_id=payment.id)

    if event.status == PaymentStatus.SUCCEEDED:
        verify_and_complete(
            db,
            payment,
            provider_ref=event.provider_ref,
            reported_amount=event.amount,
            raw=event.raw,
        )
        return WebhookResult(processed=True, message="Payment confirmed", payment_id=payment.id)

    if event.status in (PaymentStatus.FAILED, PaymentStatus.CANCELLED):
        payment.status = event.status.value
        payment.failure_reason = "Reported by provider webhook"
        payment.provider_payload = {**(payment.provider_payload or {}), "webhook": event.raw}
        db.commit()
        return WebhookResult(processed=True, message=f"Payment {event.status.value.lower()}", payment_id=payment.id)

    payment.status = PaymentStatus.PROCESSING.value
    db.commit()
    return WebhookResult(processed=False, message="Payment still processing", payment_id=payment.id)


def mock_confirm(
    db: Session, *, user: User, transaction_ref: str, token: str, succeed: bool
) -> Tuple[Payment, object, Optional[str]]:
    if settings.is_production or not settings.payment_mock_enabled:
        raise PaymentError("Mock payments are disabled")
    payment = db.scalar(select(Payment).where(Payment.transaction_ref == transaction_ref))
    if payment is None:
        raise NotFoundError("Payment not found")
    if payment.user_id != user.id and user.role != "ADMIN":
        raise PaymentError("This payment does not belong to you")

    provider = MockPaymentProvider()
    if not provider.verify_webhook_token(transaction_ref, token):
        raise PaymentError("Invalid mock confirmation token")

    if not succeed:
        payment.status = PaymentStatus.FAILED.value
        payment.failure_reason = "Mock payment declined by user"
        db.commit()
        return payment, None, None

    return verify_and_complete(db, payment, provider_ref=payment.provider_ref, raw={"mock": True})


def approve_refund(db: Session, *, refund_id: str, admin: User) -> Refund:
    refund = db.get(Refund, refund_id)
    if refund is None:
        raise NotFoundError("Refund not found")
    if refund.status != RefundStatus.REQUESTED.value:
        raise ConflictError(f"Refund in status {refund.status} cannot be approved")
    refund.status = RefundStatus.APPROVED.value
    db.commit()
    db.refresh(refund)
    return refund


def reject_refund(db: Session, *, refund_id: str, admin: User, note: Optional[str] = None) -> Refund:
    refund = db.get(Refund, refund_id)
    if refund is None:
        raise NotFoundError("Refund not found")
    if refund.status not in (RefundStatus.REQUESTED.value, RefundStatus.APPROVED.value):
        raise ConflictError(f"Refund in status {refund.status} cannot be rejected")
    refund.status = RefundStatus.REJECTED.value
    if note:
        refund.reason = f"{refund.reason or ''}\nRejected: {note}".strip()
    db.commit()
    db.refresh(refund)
    return refund


def process_refund(db: Session, *, refund_id: str, admin: User) -> Refund:
    """Execute the refund with the provider and settle booking/payment states."""
    refund = db.get(Refund, refund_id)
    if refund is None:
        raise NotFoundError("Refund not found")
    if refund.status not in (RefundStatus.APPROVED.value, RefundStatus.REQUESTED.value):
        raise ConflictError(f"Refund in status {refund.status} cannot be processed")

    payment = refund.payment
    provider = get_provider(PaymentMethod(payment.method))

    provider_ref = None
    try:
        provider_ref = provider.refund(
            transaction_ref=payment.transaction_ref,
            amount=float(refund.amount),
            provider_ref=payment.provider_ref,
        )
    except PaymentError:
        # Manual/bank refunds and unconfigured providers are settled by the admin
        # recording the transfer reference offline; the state is authoritative.
        if PaymentMethod(payment.method) not in (
            PaymentMethod.BANK_TRANSFER,
            PaymentMethod.MOCK,
            PaymentMethod.MMPAY,
        ):
            raise

    refund.status = RefundStatus.PROCESSED.value
    refund.processed_at = now_utc()
    refund.processed_by = admin.id
    if provider_ref:
        refund.reference = provider_ref

    from sqlalchemy import func

    total_refunded = db.scalar(
        select(func.coalesce(func.sum(Refund.amount), 0)).where(
            Refund.payment_id == payment.id, Refund.status == RefundStatus.PROCESSED.value
        )
    ) or 0
    if float(total_refunded) >= float(payment.amount) - 0.01:
        payment.status = PaymentStatus.REFUNDED.value
        booking = db.get(Booking, refund.booking_id)
        if booking is not None:
            booking.status = BookingStatus.REFUNDED.value
            if booking.ticket is not None:
                booking.ticket.status = TicketStatus.REFUNDED.value
    else:
        payment.status = PaymentStatus.REFUND_PENDING.value

    db.commit()
    db.refresh(refund)
    return refund
