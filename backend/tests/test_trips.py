from tests.conftest import seat_ids


def test_search_trips(client, trip):
    r = client.get("/api/v1/trips/search", params={"origin_city_id": None, "page_size": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 1
    item = body["items"][0]
    assert item["available_seats"] > 0
    assert item["origin_city"]["name"] == "Yangon"
    assert item["destination_city"]["name"] == "Mandalay"
    assert item["bus"]["layout"] == "2+2"
    assert item["base_price"] == 30000


def test_search_filters_passenger_capacity(client, db, route, operator):
    import uuid

    from app.schemas.catalog import BusCreate
    from app.schemas.trip import TripCreate
    from app.services import catalog_service
    from app.utils.timeutil import now_utc

    from datetime import timedelta

    small_bus = catalog_service.create_bus(
        db,
        BusCreate(
            operator_id=operator.id,
            registration_number=f"TEST/SMALL/{uuid.uuid4().hex[:8]}",
            name="Small Bus",
            bus_type="AC_SEATER",
            layout="2+1",
            seat_capacity=8,
        ),
        operator_id=operator.id,
    )
    dep = now_utc().replace(microsecond=0) + timedelta(days=3)
    small_trip = catalog_service.create_trip(
        db,
        TripCreate(
            route_id=route.id,
            bus_id=small_bus.id,
            departure_at=dep,
            arrival_at=dep + timedelta(hours=6),
            base_price=10000,
        ),
    )

    r = client.get("/api/v1/trips/search", params={"passengers": 10})
    assert r.status_code == 200
    assert small_trip.id not in [i["id"] for i in r.json()["items"]]


def test_search_sort_price(client, trip):
    r = client.get("/api/v1/trips/search", params={"sort": "price", "page_size": 50})
    prices = [i["base_price"] for i in r.json()["items"]]
    assert prices == sorted(prices)


def test_get_trip_detail(client, trip):
    r = client.get(f"/api/v1/trips/{trip.id}")
    assert r.status_code == 200
    assert r.json()["duration_minutes"] == 540


def test_seat_map(client, db, trip):
    r = client.get(f"/api/v1/trips/{trip.id}/seats")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["layout"] == "2+2"
    assert body["cols"] == 4
    assert body["aisle_after_col"] == 2
    seats = body["seats"]
    assert len(seats) == 20
    assert body["available_seats"] == 20
    assert all(s["status"] == "AVAILABLE" for s in seats)
    # VIP rows priced higher, remain available in the map
    assert any(s["category"] == "ORDINARY" for s in seats)


def test_seat_map_unknown_trip(client):
    assert client.get("/api/v1/trips/does-not-exist/seats").status_code == 404


def test_cities_list(client):
    r = client.get("/api/v1/cities")
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "Yangon" in names