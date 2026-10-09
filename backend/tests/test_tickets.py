from app.core.security import sign_ticket_reference
from tests.conftest import auth_headers, register_row


def _pay(client, trip, email):
    from tests.test_payments import _initiate, _make_booking

    token = register_row(client, email=email).json()["access_token"]
    booking = _make_booking(client, trip, token, n=1)
    init = _initiate(client, booking["id"], token)
    tx = init.json()["payment"]["transaction_ref"]
    mock = init.json()["mock_confirm_token"]
    done = client.post(
        "/api/v1/payments/mock/confirm",
        json={"transaction_ref": tx, "confirm_token": mock},
        headers=auth_headers(token),
    )
    assert done.json()["payment"]["status"] == "SUCCEEDED"
    detail = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token)).json()
    return token, detail, detail["ticket_id"]


def test_ticket_issued_and_pdf_generated(client, db, trip):
    token, booking, ticket_id = _pay(client, trip, "tk@test.com")
    r = client.get(f"/api/v1/tickets/{ticket_id}", headers=auth_headers(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ticket_number"].startswith("TKT-")
    assert body["passenger_names"] == ["P0"]
    assert len(body["seat_numbers"]) == 1
    assert body["payment_status"] == "SUCCEEDED"
    assert body["booking_reference"] == booking["reference"]

    pdf = client.get(f"/api/v1/tickets/{ticket_id}/pdf", headers=auth_headers(token))
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert b"%PDF" in pdf.content

    qr = client.get(f"/api/v1/tickets/{ticket_id}/qr", headers=auth_headers(token))
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_ticket_lookup_by_reference(client, db, trip):
    token, booking, ticket_id = _pay(client, trip, "lookup@test.com")
    r = client.get(
        f"/api/v1/tickets/lookup?reference={booking['reference']}", headers=auth_headers(token)
    )
    assert r.status_code == 200
    assert r.json()["ticket_number"].startswith("TKT-")


def _operator_header(client):
    r = client.post(
        "/api/v1/auth/login", json={"email": "operator@test.com", "password": "Passw0rd123"}
    )
    assert r.status_code == 200, r.text
    return auth_headers(r.json()["access_token"])


def test_operator_validates_and_single_use(client, db, trip):
    token, booking, ticket_id = _pay(client, trip, "val@test.com")
    op = _operator_header(client)

    r = client.get(f"/api/v1/tickets/{ticket_id}", headers=auth_headers(token))
    payload = None
    # Rebuild the signed token through the service to mirror operator scanning.
    from app.core.security import sign_ticket_reference

    signed = sign_ticket_reference(ticket_id)

    v = client.post(
        "/api/v1/tickets/validate",
        json={"token": signed, "trip_id": trip.id},
        headers=op,
    )
    assert v.status_code == 200, v.text
    body = v.json()
    assert body["valid"] is True
    assert body["outcome"] == "VALID"
    assert body["seat_numbers"]

    # First use consumed the ticket (single-use policy).
    v2 = client.post(
        "/api/v1/tickets/validate",
        json={"token": signed, "trip_id": trip.id},
        headers=op,
    )
    assert v2.status_code == 200
    assert v2.json()["valid"] is False
    assert v2.json()["outcome"] == "ALREADY_USED"


def test_validate_wrong_trip(client, db, trip):
    _, booking, ticket_id = _pay(client, trip, "wtrip@test.com")
    signed = sign_ticket_reference(ticket_id)
    op = _operator_header(client)
    v = client.post(
        "/api/v1/tickets/validate",
        json={"token": signed, "trip_id": "not-the-trip"},
        headers=op,
    )
    assert v.status_code == 200
    assert v.json()["outcome"] == "WRONG_TRIP"


def test_validate_garbage_token(client, trip):
    op = _operator_header(client)
    v = client.post(
        "/api/v1/tickets/validate", json={"token": "garbage-token"}, headers=op
    )
    assert v.status_code == 200
    assert v.json()["outcome"] == "NOT_FOUND"


def test_ticket_requires_ownership(client, db, trip):
    _, _, ticket_id = _pay(client, trip, "own1@test.com")
    token2 = register_row(client, email="own2@test.com").json()["access_token"]
    assert client.get(f"/api/v1/tickets/{ticket_id}", headers=auth_headers(token2)).status_code == 403


def test_validate_requires_operator_role(client, db, trip):
    token = register_row(client, email="vpe@test.com").json()["access_token"]
    _, _, ticket_id = _pay(client, trip, "banana@test.com")
    signed = sign_ticket_reference(ticket_id)
    v = client.post(
        "/api/v1/tickets/validate",
        json={"token": signed, "trip_id": trip.id},
        headers=auth_headers(token),
    )
    assert v.status_code == 403