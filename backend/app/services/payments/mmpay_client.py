from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.exceptions import PaymentError


class MMPayClient:
    """Thin server-side client for the MyanMyanPay (MMPay) REST API.

    Mirrors the official MMPay SDKs: every request body is serialised as compact
    JSON (no spaces) and signed with ``HMAC-SHA256(secretKey, "<nonce>.<body>")``
    sent as ``X-Mmpay-Signature`` alongside the millisecond ``X-Mmpay-Nonce``.

    Sandbox mode is auto-detected from the credentials: keys containing
    ``_test_`` route to the ``/payments/sandbox-*`` endpoints.
    """

    def __init__(
        self,
        *,
        app_id: str,
        publishable_key: str,
        secret_key: str,
        base_url: str,
        timeout: float = 20.0,
    ) -> None:
        if not publishable_key or not secret_key:
            raise PaymentError("MyanMyanPay is not configured (missing keys)")
        self._app_id = app_id
        self._publishable_key = publishable_key
        self._secret_key = secret_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._btoken: Optional[str] = None
        self._is_sandbox = "_test_" in publishable_key or "_test_" in secret_key

    # ------------------------------------------------------------------ helpers
    @property
    def is_sandbox(self) -> bool:
        return self._is_sandbox

    @staticmethod
    def _now_nonce() -> str:
        return str(int(time.time() * 1000))

    @staticmethod
    def _stringify(payload: Any) -> str:
        return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)

    def _sign(self, body_string: str, nonce: str) -> str:
        return hmac.new(
            self._secret_key.encode("utf-8"),
            f"{nonce}.{body_string}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _path(self, prod: str, sandbox: str) -> str:
        return f"{self._base_url}{sandbox if self._is_sandbox else prod}"

    def _post(self, url: str, body_string: str, headers: Dict[str, str]) -> Dict[str, Any]:
        try:
            response = httpx.post(
                url,
                content=body_string.encode("utf-8"),
                headers=headers,
                timeout=self._timeout,
            )
        except httpx.HTTPError as exc:  # network / timeout
            raise PaymentError(f"MyanMyanPay request failed: {exc}") from exc
        if response.status_code >= 400:
            raise PaymentError(
                f"MyanMyanPay API error {response.status_code}: {response.text[:300]}"
            )
        try:
            return response.json()
        except ValueError as exc:
            raise PaymentError("MyanMyanPay returned a non-JSON response") from exc

    # --------------------------------------------------------------- operations
    def handshake(self, *, order_id: str, nonce: Optional[str] = None) -> str:
        """Exchange a per-order token (``X-Mmpay-Btoken``) before create/get/cancel."""
        payload = {"orderId": str(order_id), "nonce": nonce or self._now_nonce()}
        body_string = self._stringify(payload)
        signature = self._sign(body_string, payload["nonce"])
        headers = {
            "Authorization": f"Bearer {self._publishable_key}",
            "X-Mmpay-Nonce": payload["nonce"],
            "X-Mmpay-Signature": signature,
            "Content-Type": "application/json",
        }
        data = self._post(
            self._path("/payments/handshake", "/payments/sandbox-handshake"),
            body_string,
            headers,
        )
        token = data.get("token") if isinstance(data, dict) else None
        if not token:
            raise PaymentError("MyanMyanPay handshake did not return a token")
        self._btoken = token
        return token

    def create(
        self,
        *,
        order_id: str,
        amount: float,
        items: Optional[List[Dict[str, Any]]] = None,
        callback_url: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a payment and return the MMPay response (contains the MMQR payload)."""
        nonce = self._now_nonce()
        payload: Dict[str, Any] = {
            "appId": self._app_id,
            "nonce": nonce,
            "amount": amount,
            "orderId": str(order_id),
        }
        if items is not None:
            payload["items"] = items
        if callback_url:
            payload["callbackUrl"] = callback_url
        if custom_message:
            payload["customMessage"] = custom_message

        body_string = self._stringify(payload)
        signature = self._sign(body_string, nonce)

        # The API requires a fresh handshake token bound to this orderId+nonce.
        btoken = self._btoken or self.handshake(order_id=str(order_id), nonce=nonce)

        headers = {
            "Authorization": f"Bearer {self._publishable_key}",
            "X-Mmpay-Btoken": btoken,
            "X-Mmpay-Nonce": nonce,
            "X-Mmpay-Signature": signature,
            "Content-Type": "application/json",
        }
        return self._post(
            self._path("/payments/create", "/payments/sandbox-create"),
            body_string,
            headers,
        )

    def get(self, *, order_id: str) -> Dict[str, Any]:
        nonce = self._now_nonce()
        payload = {"orderId": str(order_id), "nonce": nonce}
        body_string = self._stringify(payload)
        signature = self._sign(body_string, nonce)
        btoken = self._btoken or self.handshake(order_id=str(order_id), nonce=nonce)
        headers = {
            "Authorization": f"Bearer {self._publishable_key}",
            "X-Mmpay-Btoken": btoken,
            "X-Mmpay-Nonce": nonce,
            "X-Mmpay-Signature": signature,
            "Content-Type": "application/json",
        }
        return self._post(
            self._path("/payments/get", "/payments/sandbox-get"), body_string, headers
        )

    def cancel(self, *, order_id: str) -> Dict[str, Any]:
        nonce = self._now_nonce()
        payload = {"orderId": str(order_id), "nonce": nonce}
        body_string = self._stringify(payload)
        signature = self._sign(body_string, nonce)
        btoken = self._btoken or self.handshake(order_id=str(order_id), nonce=nonce)
        headers = {
            "Authorization": f"Bearer {self._publishable_key}",
            "X-Mmpay-Btoken": btoken,
            "X-Mmpay-Nonce": nonce,
            "X-Mmpay-Signature": signature,
            "Content-Type": "application/json",
        }
        return self._post(
            self._path("/payments/cancel", "/payments/sandbox-cancel"), body_string, headers
        )

    # ------------------------------------------------------------------ webhook
    def verify_callback(self, *, body: bytes, nonce: str, signature: str) -> bool:
        if not body or not nonce or not signature:
            return False
        payload = body.decode("utf-8") if isinstance(body, bytes) else str(body)
        expected = hmac.new(
            self._secret_key.encode("utf-8"),
            f"{nonce}.{payload}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
