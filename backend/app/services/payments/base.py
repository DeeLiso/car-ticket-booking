from __future__ import annotations

import hmac
import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from hashlib import sha256
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.exceptions import PaymentError
from app.models.enums import PaymentMethod, PaymentStatus


@dataclass
class InitiationResult:
    provider_ref: Optional[str] = None
    redirect_url: Optional[str] = None
    instructions: Optional[str] = None
    mock_token: Optional[str] = None
    # EMVCo / MMQR payload string for QR-based wallets (rendered client-side).
    qr_payload: Optional[str] = None


@dataclass
class WebhookEvent:
    transaction_ref: str
    status: PaymentStatus
    provider_ref: Optional[str] = None
    amount: Optional[float] = None
    raw: Dict[str, Any] = field(default_factory=dict)


class PaymentProvider(ABC):
    """Provider integration interface.

    Concrete adapters implement ``initiate`` and ``parse_webhook``. Adapters for
    commercial providers (KBZPay, WavePay, CBPay, banks) read credentials from
    environment variables only. When credentials are absent the adapter must
    raise ``PaymentError`` rather than pretending a payment succeeded.
    """

    name: str = "base"
    method: PaymentMethod = PaymentMethod.MOCK
    requires_webhook_signature: bool = True

    @abstractmethod
    def initiate(self, *, transaction_ref: str, amount: float, currency: str, **context) -> InitiationResult:
        ...

    @abstractmethod
    def parse_webhook(self, body: bytes | dict, headers: Dict[str, str]) -> WebhookEvent:
        ...

    def verify_signature(self, body: bytes, headers: Dict[str, str]) -> bool:
        """Verify an HMAC-SHA256 signature over the raw webhook body.

        Providers that use a different scheme (RSA, certificate pinning) must
        override this. ``X-Webhook-Signature`` is expected to be the hex digest.
        """
        if not self.requires_webhook_signature:
            return True
        signature = headers.get("x-webhook-signature") or headers.get("X-Webhook-Signature")
        if not signature:
            return False
        expected = hmac.new(settings.webhook_secret.encode(), body, sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    def refund(self, *, transaction_ref: str, amount: float, provider_ref: Optional[str]) -> str:
        """Initiate a refund with the provider. Returns the provider refund ref."""
        raise PaymentError(f"{self.name} refunds are not implemented")

    def is_configured(self) -> bool:
        return True


def _as_bytes(body: bytes | dict | str) -> bytes:
    if isinstance(body, bytes):
        return body
    if isinstance(body, str):
        return body.encode()
    return json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
