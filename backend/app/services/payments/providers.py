from __future__ import annotations

import hashlib
import hmac
import json
from typing import Dict, Optional

from app.core.config import settings
from app.core.exceptions import PaymentError
from app.models.enums import PaymentMethod, PaymentStatus
from app.services.payments.base import InitiationResult, PaymentProvider, WebhookEvent, _as_bytes
from app.services.payments.mmpay_client import MMPayClient


class MockPaymentProvider(PaymentProvider):
    """DEVELOPMENT ONLY. Simulates a hosted checkout.

    This adapter must never be enabled in production (``PAYMENT_MOCK_ENABLED``
    is validated against ``ENVIRONMENT``). It issues a signed, short-lived token
    that the frontend uses to simulate the provider's redirect callback.
    """

    name = "mock"
    method = PaymentMethod.MOCK
    requires_webhook_signature = True

    def is_configured(self) -> bool:
        return settings.payment_mock_enabled and not settings.is_production

    def initiate(self, *, transaction_ref: str, amount: float, currency: str, **context) -> InitiationResult:
        if not self.is_configured():
            raise PaymentError("Mock payment provider is disabled")
        token = self._sign(transaction_ref)
        return InitiationResult(
            provider_ref=f"mock_{transaction_ref}",
            instructions=(
                f"Development mock payment of {amount} {currency}. "
                "Confirm via POST /api/v1/payments/mock/confirm to simulate success."
            ),
            mock_token=token,
        )

    def parse_webhook(self, body, headers: Dict[str, str]) -> WebhookEvent:
        if not self.verify_signature(_as_bytes(body), headers):
            raise PaymentError("Invalid mock webhook signature")
        data = json.loads(body) if isinstance(body, (str, bytes)) else body
        return WebhookEvent(
            transaction_ref=data["transaction_ref"],
            status=PaymentStatus(data.get("status", "SUCCEEDED")),
            provider_ref=data.get("provider_ref"),
            amount=float(data["amount"]) if data.get("amount") is not None else None,
            raw=data,
        )

    def verify_webhook_token(self, transaction_ref: str, token: str) -> bool:
        return hmac.compare_digest(self._sign(transaction_ref), token)

    @staticmethod
    def _sign(transaction_ref: str) -> str:
        return hmac.new(
            settings.webhook_secret.encode(), f"mock:{transaction_ref}".encode(), hashlib.sha256
        ).hexdigest()


class _HostedRedirectProvider(PaymentProvider):
    """Base for commercial providers reached through a hosted redirect flow.

    To integrate a real provider:
      1. Set the provider's merchant id / secret in the environment.
      2. Implement ``initiate`` to POST to the provider's "create payment" API
         and return the hosted checkout ``redirect_url``.
      3. Implement ``parse_webhook`` to map the provider's callback payload onto
         a :class:`WebhookEvent`, verifying the provider signature.
    """

    def __init__(self, merchant_id: str, secret_key: str) -> None:
        self._merchant_id = merchant_id
        self._secret_key = secret_key

    def is_configured(self) -> bool:
        return bool(self._merchant_id and self._secret_key)

    def _require_config(self) -> None:
        if not self.is_configured():
            raise PaymentError(
                f"{self.name} is not configured. Set its merchant id and secret key "
                "environment variables and implement the provider adapter."
            )

    def initiate(self, *, transaction_ref: str, amount: float, currency: str, **context) -> InitiationResult:
        self._require_config()
        raise PaymentError(
            f"{self.name} create-payment API is not wired up yet. "
            "See backend/app/services/payments/providers.py for the integration contract."
        )

    def parse_webhook(self, body, headers: Dict[str, str]) -> WebhookEvent:
        self._require_config()
        if not self.verify_signature(_as_bytes(body), headers):
            raise PaymentError(f"Invalid {self.name} webhook signature")
        data = json.loads(body) if isinstance(body, (str, bytes)) else body
        return WebhookEvent(
            transaction_ref=data.get("transaction_ref") or data.get("merchantReference"),
            status=PaymentStatus(data.get("status", "SUCCEEDED")),
            provider_ref=data.get("provider_ref") or data.get("transactionId"),
            amount=float(data["amount"]) if data.get("amount") is not None else None,
            raw=data,
        )


class KBZPayProvider(_HostedRedirectProvider):
    name = "kbzpay"
    method = PaymentMethod.KBZPAY

    def __init__(self) -> None:
        super().__init__(settings.kbzpay_merchant_id, settings.kbzpay_secret_key)


class WavePayProvider(_HostedRedirectProvider):
    name = "wavepay"
    method = PaymentMethod.WAVEPAY

    def __init__(self) -> None:
        super().__init__(settings.wavepay_merchant_id, settings.wavepay_secret_key)


class CBPayProvider(_HostedRedirectProvider):
    name = "cbpay"
    method = PaymentMethod.CBPAY

    def __init__(self) -> None:
        super().__init__(settings.cbpay_merchant_id, settings.cbpay_secret_key)


class MMPayProvider(PaymentProvider):
    """MyanMyanPay (MMPay) MMQR aggregator.

    Server-side flow: ``/payments/handshake`` to obtain a per-order botken, then
    ``/payments/create`` which returns an EMVCo QR string the passenger scans
    with any MMQR-enabled wallet (KBZPay, WaveMoney, CB Pay, ...). Settlement is
    confirmed asynchronously via the ``mmpay`` webhook.
    """

    name = "mmpay"
    method = PaymentMethod.MMPAY
    requires_webhook_signature = True

    _STATUS_MAP = {
        "PENDING": PaymentStatus.PROCESSING,
        "SUCCESS": PaymentStatus.SUCCEEDED,
        "FAILED": PaymentStatus.FAILED,
        "REFUNDED": PaymentStatus.REFUNDED,
        "EXPIRED": PaymentStatus.CANCELLED,
        "CANCELLED": PaymentStatus.CANCELLED,
    }

    def is_configured(self) -> bool:
        return bool(settings.mmpay_publishable_key and settings.mmpay_secret_key)

    def _client(self) -> MMPayClient:
        self._require_config()
        return MMPayClient(
            app_id=settings.mmpay_app_id,
            publishable_key=settings.mmpay_publishable_key,
            secret_key=settings.mmpay_secret_key,
            base_url=settings.mmpay_base_url,
        )

    def _require_config(self) -> None:
        if not self.is_configured():
            raise PaymentError(
                "MyanMyanPay is not configured. Set MMPAY_APP_ID, "
                "MMPAY_PUBLISHABLE_KEY and MMPAY_SECRET_KEY."
            )

    def initiate(self, *, transaction_ref: str, amount: float, currency: str, **context) -> InitiationResult:
        client = self._client()
        data = client.create(
            order_id=transaction_ref,
            amount=amount,
            callback_url=settings.mmpay_callback_url or None,
            custom_message=context.get("booking_reference"),
        )
        qr = (
            data.get("qr")
            or data.get("qrPayload")
            or data.get("emvqr")
            or data.get("qrCode")
        )
        provider_ref = (
            data.get("transactionRefId")
            or data.get("vendorQrRefId")
            or data.get("transaction_ref_id")
        )
        mode = "sandbox" if client.is_sandbox else "live"
        return InitiationResult(
            provider_ref=provider_ref,
            qr_payload=qr,
            instructions=(
                f"Scan the QR code with any MMQR app (KBZPay, WaveMoney, CB Pay) "
                f"to pay {amount:,.0f} {currency}. Your booking is confirmed once "
                f"MyanMyanPay reports the payment. ({mode})"
            ),
        )

    def parse_webhook(self, body, headers: Dict[str, str]) -> WebhookEvent:
        self._require_config()
        if not self.verify_signature(_as_bytes(body), headers):
            raise PaymentError("Invalid MyanMyanPay webhook signature")
        data = json.loads(body) if isinstance(body, (str, bytes)) else body
        raw_status = str(data.get("status") or "PENDING").upper()
        status = self._STATUS_MAP.get(raw_status, PaymentStatus.PROCESSING)
        return WebhookEvent(
            transaction_ref=data.get("orderId") or data.get("order_id") or data.get("transaction_ref"),
            status=status,
            provider_ref=data.get("transactionRefId") or data.get("vendorQrRefId"),
            amount=float(data["amount"]) if data.get("amount") is not None else None,
            raw=data,
        )

    def verify_signature(self, body: bytes, headers: Dict[str, str]) -> bool:
        signature = headers.get("x-mmpay-signature") or headers.get("X-Mmpay-Signature")
        nonce = headers.get("x-mmpay-nonce") or headers.get("X-Mmpay-Nonce")
        if not signature or not nonce:
            return False
        client = self._client()
        return client.verify_callback(body=body, nonce=nonce, signature=signature)


class BankTransferProvider(PaymentProvider):
    name = "bank_transfer"
    method = PaymentMethod.BANK_TRANSFER
    requires_webhook_signature = False

    def is_configured(self) -> bool:
        return bool(settings.bank_transfer_account)

    def initiate(self, *, transaction_ref: str, amount: float, currency: str, **context) -> InitiationResult:
        if not self.is_configured():
            raise PaymentError("Bank transfer account is not configured")
        return InitiationResult(
            provider_ref=None,
            instructions=(
                f"Transfer {amount} {currency} to account {settings.bank_transfer_account} "
                f"using reference {transaction_ref}. Your booking is confirmed after an "
                "administrator verifies the transfer."
            ),
        )

    def parse_webhook(self, body, headers: Dict[str, str]) -> WebhookEvent:
        raise PaymentError("Bank transfers are verified manually by an administrator")
