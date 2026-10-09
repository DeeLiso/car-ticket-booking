from tests.conftest import auth_headers, register_row


def _admin_header(client):
    r = client.post(
        "/api/v1/auth/login", json={"email": "admin@test.com", "password": "Passw0rd123"}
    )
    assert r.status_code == 200, r.text
    return auth_headers(r.json()["access_token"])


def test_admin_dashboard_requires_admin(client):
    assert client.get("/api/v1/admin/dashboard").status_code == 401
    token = register_row(client, email="peon@test.com").json()["access_token"]
    assert client.get("/api/v1/admin/dashboard", headers=auth_headers(token)).status_code == 403


def test_dashboard_stats(client, db, trip):
    h = _admin_header(client)
    r = client.get("/api/v1/admin/dashboard", headers=h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["stats"]["total_buses"] >= 1
    assert body["stats"]["total_routes"] >= 1
    assert body["charts"]["payment_status_distribution"] is not None
    assert body["stats"]["net_revenue"] == 0


def test_admin_creates_operator(client):
    h = _admin_header(client)
    r = client.post(
        "/api/v1/admin/operators",
        json={
            "email": "newop@test.com",
            "password": "Operator@123",
            "full_name": "New Operator",
            "company_name": "New Express Co",
            "is_verified": True,
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    assert r.json()["company_name"] == "New Express Co"
    # Operator can now log in.
    login = client.post(
        "/api/v1/auth/login", json={"email": "newop@test.com", "password": "Operator@123"}
    )
    assert login.status_code == 200


def test_admin_bus_crud(client, operator):
    h = _admin_header(client)
    r = client.get("/api/v1/admin/buses", headers=h)
    assert r.status_code == 200

    created = client.post(
        "/api/v1/admin/buses",
        json={
            "operator_id": operator.id,
            "registration_number": "ADM-9001",
            "name": "Admin Bus",
            "bus_type": "AC_SEATER",
            "layout": "2+2",
            "seat_capacity": 20,
            "amenities": ["AC"],
        },
        headers=h,
    )
    assert created.status_code == 201, created.text
    bus_id = created.json()["id"]

    patched = client.patch(
        f"/api/v1/admin/buses/{bus_id}", json={"name": "Renamed Bus"}, headers=h
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Renamed Bus"

    deleted = client.delete(f"/api/v1/admin/buses/{bus_id}", headers=h)
    assert deleted.status_code == 200


def test_admin_route_crud(client, cities):
    h = _admin_header(client)
    origin = cities["Naypyidaw"]
    destination = cities["Bagan"]
    r = client.post(
        "/api/v1/admin/routes",
        json={
            "origin_city_id": origin.id,
            "destination_city_id": destination.id,
            "duration_minutes": 300,
            "distance_km": 200,
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    dup = client.post(
        "/api/v1/admin/routes",
        json={
            "origin_city_id": origin.id,
            "destination_city_id": destination.id,
            "duration_minutes": 300,
        },
        headers=h,
    )
    assert dup.status_code == 409


def test_admin_trip_creation_blocks_overlap(client, db, route, bus, operator):
    h = _admin_header(client)
    from datetime import timedelta

    from app.utils.timeutil import now_utc

    dep1 = (now_utc() + timedelta(days=5)).replace(microsecond=0)
    body = {
        "route_id": route.id,
        "bus_id": bus.id,
        "departure_at": dep1.isoformat(),
        "arrival_at": (dep1 + timedelta(hours=6)).isoformat(),
        "base_price": 25000,
    }
    ok = client.post("/api/v1/admin/trips", json=body, headers=h)
    assert ok.status_code == 201, ok.text

    # overlapping trip on the same bus must be rejected
    body["departure_at"] = (dep1 + timedelta(hours=1)).isoformat()
    body["arrival_at"] = (dep1 + timedelta(hours=7)).isoformat()
    conflict = client.post("/api/v1/admin/trips", json=body, headers=h)
    assert conflict.status_code == 409

    # a later non-overlapping trip is fine
    body["departure_at"] = (dep1 + timedelta(hours=8)).isoformat()
    body["arrival_at"] = (dep1 + timedelta(hours=14)).isoformat()
    ok2 = client.post("/api/v1/admin/trips", json=body, headers=h)
    assert ok2.status_code == 201


def test_operator_cannot_delete_buses_of_others(client, bus):
    token = register_row(client, email="other-op@test.com").json()["access_token"]
    assert client.delete(f"/api/v1/admin/buses/{bus.id}", headers=auth_headers(token)).status_code == 403


def test_reports(client, db, trip):
    h = _admin_header(client)
    r = client.get("/api/v1/admin/reports", params={"days": 30}, headers=h)
    assert r.status_code == 200
    assert r.json()["kpis"]


def test_audit_logs_created_on_admin_actions(client, operator):
    h = _admin_header(client)
    client.post(
        "/api/v1/admin/operators",
        json={
            "email": "audited@test.com",
            "password": "Operator@123",
            "full_name": "Audited",
            "company_name": "Audited Co",
        },
        headers=h,
    )
    logs = client.get("/api/v1/admin/audit-logs", headers=h)
    assert logs.status_code == 200
    assert any(log["action"] == "operator.create" for log in logs.json())