from app.models.enums import UserRole
from tests.conftest import auth_headers, login, register_row


def test_register_and_login(client):
    r = register_row(client, email="alice@test.com")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"]
    assert body["user"]["role"] == "PASSENGER"
    assert "refresh_token" in body

    # Refresh rotation
    r2 = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert r2.status_code == 200, r2.text
    new_pair = r2.json()

    # Old refresh token is revoked after rotation
    r3 = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert r3.status_code == 401

    # New token still valid
    me = client.get("/api/v1/auth/me", headers=auth_headers(new_pair["access_token"]))
    assert me.status_code == 200
    assert me.json()["email"] == "alice@test.com"


def test_duplicate_email_rejected(client):
    register_row(client, email="bob@test.com")
    r = register_row(client, email="bob@test.com")
    assert r.status_code == 409


def test_weak_password_rejected(client):
    r = register_row(client, email="weak@test.com", password="short")
    assert r.status_code == 422


def test_public_register_cannot_claim_admin(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "evil@test.com",
            "password": "Password123",
            "full_name": "Evil",
            "role": "ADMIN",
        },
    )
    assert r.status_code == 422


def test_login_wrong_password(client):
    register_row(client, email="carol@test.com")
    r = login(client, "carol@test.com", "WrongPass123")
    assert r.status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers=auth_headers("garbage")).status_code == 401


def test_change_password_invalidates_refresh(client):
    r = register_row(client, email="dave@test.com")
    tokens = r.json()
    me = client.get("/api/v1/auth/me", headers=auth_headers(tokens["access_token"]))
    user_id = me.json()["id"]

    ch = client.post(
        "/api/v1/auth/password/change",
        headers=auth_headers(tokens["access_token"]),
        json={"current_password": "Passw0rd123", "new_password": "NewPassw0rd456"},
    )
    assert ch.status_code == 200

    old_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert old_refresh.status_code == 401

    assert login(client, "dave@test.com", "NewPassw0rd456").status_code == 200


def test_operator_role_endpoint_rbac(client, operator):
    r = login(client, "operator@test.com")
    token = r.json()["access_token"]
    resp = client.get("/api/v1/operator/buses", headers=auth_headers(token))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    assert client.get("/api/v1/operator/buses").status_code == 401