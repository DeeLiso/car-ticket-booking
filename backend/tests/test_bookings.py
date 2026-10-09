from tests.conftest import auth_headers, login, register_row, seat_ids


def _user_context(client, email=None):
    import uuid

    r = register_row(client, email=email or f"pax-{uuid.uuid4().hex[:8]}@test.com")
    return r.json()["access_token"]


def _passengers(seat_ids_list):
    return [
        {
            "seat_id": sid,
            "full_name": f"Passenger {i}",
            "phone": f"09-{900000000 + i}",
            "email": f"p{i}@test.com",
        }
        for i, sid in enumerate(seat_ids_list)
    ]


def _make_booking(client, trip_id, token, n=2):
    seats = seat_ids_long(client, trip_id, n)
    payload = {
        "trip_id": trip_id,
        "seat_ids": seats,
        "passengers": _passengers(seats),
        "contact_name": "Lead Booker",
        "contact_phone": "09-812345678",
        "contact_email": "lead@test.com",
    }
    return client.post("/api/v1/bookings", json=payload, headers=auth_headers(token))


def seat_ids_long(client, trip_id, n):
    seats = client.get(f"/api/v1/trips/{trip_id}/seats").json()["seats"]
    return [s["seat_id"] for s in seats if s["status"] == "AVAILABLE"][:n]


def test_create_and_fetch_booking(client, db, trip):
    token = _user_context(client)
    r = _make_booking(client, trip.id, token)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "PENDING"
    assert body["seat_count"] == 2
    assert body["subtotal"] == 30000 * 2
    assert body["total_amount"] == 30000 * 2
    assert body["reference"].startswith("CTB-")
    assert body["trip"]["origin"] == "Yangon"
    assert body["trip"]["destination"] == "Mandalay"

    got = client.get(f"/api/v1/bookings/{body['id']}", headers=auth_headers(token))
    assert got.status_code == 200
    assert got.json()["id"] == body["id"]

    listing = client.get("/api/v1/bookings", headers=auth_headers(token))
    assert listing.status_code == 200
    assert listing.json()["total"] == 1


def test_seats_marked_reserved(client, db, trip):
    token = _user_context(client)
    _make_booking(client, trip.id, token, n=3)
    from app.models.enums import InventoryStatus
    from app.models.trip import TripSeatInventory
    from sqlalchemy import select

    rows = db.scalars(
        select(TripSeatInventory).where(
            TripSeatInventory.trip_id == trip.id,
            TripSeatInventory.status == InventoryStatus.RESERVED.value,
        )
    ).all()
    assert len(rows) == 3
    assert all(r.booking_id is not None for r in rows)


def test_cannot_book_same_seat_twice(client, db, trip):
    token_a = _user_context(client, "a@test.com")
    token_b = _user_context(client, "b@test.com")
    seats = seat_ids_long(client, trip.id, 2)

    payload = {
        "trip_id": trip.id,
        "seat_ids": seats,
        "passengers": _passengers(seats),
        "contact_name": "AA",
        "contact_phone": "09-812345678",
    }
    ok = client.post("/api/v1/bookings", json=payload, headers=auth_headers(token_a))
    assert ok.status_code == 201, (ok.text, payload)

    conflict = client.post("/api/v1/bookings", json=payload, headers=auth_headers(token_b))
    assert conflict.status_code == 409, conflict.text
    assert conflict.json()["error"]["code"] == "seat_unavailable"


def test_booking_requires_ownership(client, db, trip):
    token_a = _user_context(client, "owner@test.com")
    token_b = _user_context(client, "other@test.com")
    booking = _make_booking(client, trip.id, token_a).json()

    got = client.get(f"/api/v1/bookings/{booking['id']}", headers=auth_headers(token_b))
    assert got.status_code == 403


def test_passenger_and_seat_validation(client, db, trip):
    token = _user_context(client)
    seats = seat_ids_long(client, trip.id, 2)

    # seat_ids and passengers mismatch
    payload = {
        "trip_id": trip.id,
        "seat_ids": seats,
        "passengers": _passengers(seats[:1]),
        "contact_name": "X",
        "contact_phone": "09-812345678",
    }
    r = client.post("/api/v1/bookings", json=payload, headers=auth_headers(token))
    assert r.status_code == 422

    # duplicate seats
    payload["seat_ids"] = [seats[0], seats[0]]
    payload["passengers"] = _passengers([seats[0]])
    r = client.post("/api/v1/bookings", json=payload, headers=auth_headers(token))
    assert r.status_code == 422


def test_cancel_pending_releases_seats(client, db, trip):
    token = _user_context(client)
    booking = _make_booking(client, trip.id, token, n=1).json()
    r = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel",
        json={"reason": "changed my mind"},
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "CANCELLED"

    seats = seat_ids_long(client, trip.id, 100)
    from app.models.enums import InventoryStatus
    from app.models.trip import TripSeatInventory
    from sqlalchemy import select, func

    reserved = db.scalar(
        select(func.count(TripSeatInventory.id)).where(
            TripSeatInventory.trip_id == trip.id,
            TripSeatInventory.status == InventoryStatus.RESERVED.value,
        )
    )
    assert reserved == 0


def test_cancel_cover_booking(client, db, trip):
    # Departure is ~25h away (> cutoff), so cancellation should succeed even with payment
    token = _user_context(client, "cxl@test.com")
    booking = _make_booking(client, trip.id, token, n=1).json()
    r = client.post(
        f"/api/v1/bookings/{booking['id']}/cancel", json={}, headers=auth_headers(token)
    )
    assert r.status_code == 200