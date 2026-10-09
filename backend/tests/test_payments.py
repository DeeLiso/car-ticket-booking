import hashlib
import hmac

from tests.conftest import auth_headers, register_row

from app.core.config import settings


def _pfx(client, email="paypax@test.com"):
    token = register_row(client, email=email).json()["access_token"]
    return token


def _make_booking(client, trip, token, n=1):
    seats = client.get(f"/api/v1/trips/{trip.id}/seats").json()["seats"]
    seat_ids = [s["seat_id"] for s in seats[:n]]
    payload = {
        "trip_id": trip.id,
        "seat_ids": seat_ids,
        "passengers": [
            {"seat_id": sid, "full_name": f"P{i}", "phone": "09-123456"}
            for i, sid in enumerate(seat_ids)
        ],
        "contact_name": "Pay Pax",
        "contact_phone": "09-123456",
    }
    r = client.post("/api/v1/bookings", json=payload, headers=auth_headers(token))
    assert r.status_code == 201, r.text
    return r.json()


def _initiate(client, booking_id, token, method="MOCK"):
    r = client.post(
        "/api/v1/payments/initiate",
        json={"booking_id": booking_id, "method": method},
        headers=auth_headers(token),
    )
    return r


def _sign(body: bytes) -> dict:
    sig = hmac.new(settings.webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    return {"X-Webhook-Signature": sig, "x-webhook-signature": sig}


def test_mock_payment_flow_confirms_booking(client, db, trip):
    token = _pfx(client)
    booking = _make_booking(client, trip, token)
    r = _initiate(client, booking["id"], token)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["payment"]["status"] == "PROCESSING"
    assert body["payment"]["amount"] == booking["total_amount"]
    assert body["instructions"]
    assert body["mock_confirm_token"]

    conf = client.post(
        "/api/v1/payments/mock/confirm",
        json={
            "transaction_ref": body["payment"]["transaction_ref"],
            "confirm_token": body["mock_confirm_token"],
            "succeed": True,
        },
        headers=auth_headers(token),
    )
    assert conf.status_code == 200, conf.text
    assert conf.json()["payment"]["status"] == "SUCCEEDED"

    detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token)).json()
    assert detail["status"] == "CONFIRMED"
    assert detail["has_ticket"] is True
    assert detail["ticket_id"]

    # Second confirmation is idempotent / already paid
    conf2 = client.post(
        "/api/v1/payments/mock/confirm",
        json={
            "transaction_ref": body["payment"]["transaction_ref"],
            "confirm_token": body["mock_confirm_token"],
        },
        headers=auth_headers(token),
    )
    assert conf2.status_code == 200


def test_declined_mock_payment(client, trip):
    token = _pfx(client, "decliner@test.com")
    booking = _make_booking(client, trip, token)
    r = _initiate(client, booking["id"], token)
    body = r.json()
    conf = client.post(
        "/api/v1/payments/mock/confirm",
        json={
            "transaction_ref": body["payment"]["transaction_ref"],
            "confirm_token": body["mock_confirm_token"],
            "succeed": False,
        },
        headers=auth_headers(token),
    )
    assert conf.status_code == 200
    assert conf.json()["payment"]["status"] == "FAILED"
    detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token)).json()
    assert detail["status"] == "PENDING"


def test_amount_is_always_derived_on_backend(client, trip):
    token = _pfx(client, "amount@test.com")
    booking = _make_booking(client, trip, token)
    # Client cannot change the price: it is not even an accepted field.
    r = _initiate(client, booking["id"], token)
    assert r.status_code == 200
    assert r.json()["payment"]["amount"] == booking["total_amount"]


def test_webhook_confirms_and_is_idempotent(client, trip):
    token = _pfx(client, "webhook@test.com")
    booking = _make_booking(client, trip, token)
    r = _initiate(client, booking["id"], token)
    tx = r.json()["payment"]["transaction_ref"]

    payload = {"transaction_ref": tx, "status": "SUCCEEDED", "amount": booking["total_amount"]}
    import json

    body = json.dumps(payload).encode()
    headers = _sign(body)
    wk = client.post("/api/v1/payments/webhooks/mock", content=body, headers=headers)
    assert wk.status_code == 200, wk.text
    assert wk.json()["processed"] is True

    wk2 = client.post("/api/v1/payments/webhooks/mock", content=body, headers=headers)
    assert wk2.status_code == 200
    assert wk2.json()["duplicate"] is True

    detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token)).json()
    assert detail["status"] == "CONFIRMED"


def test_webhook_wrong_amount_fails(client, trip):
    token = _pfx(client, "wbamt@test.com")
    booking = _make_booking(client, trip, token)
    r = _initiate(client, booking["id"], token)
    tx = r.json()["payment"]["transaction_ref"]

    import json

    payload = {"transaction_ref": tx, "status": "SUCCEEDED", "amount": 1.0}
    body = json.dumps(payload).encode()
    wk = client.post("/api/v1/payments/webhooks/mock", content=body, headers=_sign(body))
    assert wk.status_code == 400

    detail = client.get(
        f"/api/v1/payments/{r.json()['payment']['id']}", headers=auth_headers(token)
    ).json()
    assert detail["status"] == "FAILED"


def test_webhook_bad_signature_rejected(client, trip):
    token = _pfx(client, "wbsig@test.com")
    booking = _make_booking(client, trip, token)
    r = _initiate(client, booking["id"], token)
    tx = r.json()["payment"]["transaction_ref"]

    import json

    body = json.dumps({"transaction_ref": tx, "status": "SUCCEEDED"}).encode()
    wk = client.post(
        "/api/v1/payments/webhooks/mock", content=body, headers={"X-Webhook-Signature": "deadbeef"}
    )
    assert wk.status_code == 400


def test_cancel_confirmed_booking_requests_refund(client, db, trip, admin):
    token = _pfx(client, "refundee@test.com")
    booking = _make_booking(client, trip, token, n=1)

    init = _initiate(client, booking["id"], token)
    assert init.status_code == 200
    tx = init.json()["payment"]["transaction_ref"]
    mock_token = init.json()["mock_confirm_token"]

    done = client.post(
        "/api/v1/payments/mock/confirm",
        json={"transaction_ref": tx, "confirm_token": mock_token},
        headers=auth_headers(token),
    )
    assert done.json()["payment"]["status"] == "SUCCEEDED"
    assert _initiate(client, booking["id"], token).status_code == 409  # already paid

    cancel = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        json={"reason": "trip change"},
        headers=auth_headers(token),
    )
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["status"] == "REFUND_PENDING"

    # Admin approves and processes the refund.
    admin_header = _admin_header(client)
    refunds = client.get("/api/v1/admin/refunds", headers=admin_header)
    assert refunds.status_code == 200
    items = [r for r in refunds.json() if r["booking_id"] == booking["id"]]
    assert items, refunds.json()
    refund_id = items[0]["id"]
    approve = client.post(f"/api/v1/admin/refunds/{refund_id}/approve", headers=admin_header)
    assert approve.status_code == 200
    proc = client.post(f"/api/v1/admin/refunds/{refund_id}/process", headers=admin_header)
    assert proc.status_code == 200, proc.text
    assert proc.json()["status"] == "PROCESSED"

    # Booking and payment settle to refunded.
    detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token)).json()
    assert detail["status"] == "REFUNDED"


def _admin_header(client):
    r = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "Passw0rd123"}
    )
    assert r.status_code == 200, r.text
    return auth_headers(r.json()["access_token"])