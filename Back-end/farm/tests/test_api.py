import pytest
from rest_framework.test import APIClient
from farm.models import UserFarm, Species
from farm.tests.factories import make_user, make_farm


@pytest.fixture
def auth_client(db):
    user = make_user("api")
    farm = make_farm(user, coins=200)
    Species.objects.create(
        code="_api_t", name="t", rarity="N", description="",
        stages=[
            {"name": "1", "sprite_url": "/s/1", "exp_to_next": 50},
            {"name": "2", "sprite_url": "/s/2", "exp_to_next": 200},
            {"name": "3", "sprite_url": "/s/3", "exp_to_next": 600},
            {"name": "4", "sprite_url": "/s/4", "exp_to_next": None},
        ],
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user, farm


@pytest.mark.django_db
def test_get_me(auth_client):
    client, user, farm = auth_client
    res = client.get("/api/farm/me")
    assert res.status_code == 200
    body = res.json()
    assert body["dex_no"] == farm.dex_no
    assert body["coins"] == 200
    assert "displayed_animals" in body
    assert body["daily_remaining"]["pet"] == 20


@pytest.mark.django_db
def test_get_species(auth_client):
    client, *_ = auth_client
    res = client.get("/api/farm/species")
    assert res.status_code == 200
    assert any(s["code"] == "_api_t" for s in res.json())


@pytest.mark.django_db
def test_draw_egg_endpoint(auth_client):
    client, user, farm = auth_client
    res = client.post("/api/farm/eggs/draw", {"egg_type": "normal"}, format="json")
    assert res.status_code == 200
    body = res.json()
    assert "events" in body
    assert any(e["type"] == "egg_opened" for e in body["events"])
    farm.refresh_from_db()
    assert farm.coins == 170


@pytest.mark.django_db
def test_draw_egg_insufficient_coins(auth_client):
    client, user, farm = auth_client
    farm.coins = 5
    farm.save()
    res = client.post("/api/farm/eggs/draw", {"egg_type": "normal"}, format="json")
    assert res.status_code == 400
    assert res.json()["code"] == "INSUFFICIENT_COINS"


@pytest.mark.django_db
def test_pet_and_feed_endpoints(auth_client):
    client, user, farm = auth_client
    res = client.post("/api/farm/eggs/draw", {"egg_type": "normal"}, format="json")
    animal_id = next(e["animal_id"] for e in res.json()["events"] if e["type"] == "egg_opened")
    res2 = client.post(f"/api/farm/animals/{animal_id}/pet")
    assert res2.status_code == 200
    res3 = client.post(f"/api/farm/animals/{animal_id}/feed")
    assert res3.status_code == 200


@pytest.mark.django_db
def test_patch_nickname(auth_client):
    client, user, farm = auth_client
    res = client.post("/api/farm/eggs/draw", {"egg_type": "normal"}, format="json")
    animal_id = next(e["animal_id"] for e in res.json()["events"] if e["type"] == "egg_opened")
    res2 = client.patch(f"/api/farm/animals/{animal_id}", {"nickname": "뭉치"}, format="json")
    assert res2.status_code == 200
    res3 = client.patch(f"/api/farm/animals/{animal_id}", {"nickname": ""}, format="json")
    assert res3.status_code == 400
    assert res3.json()["code"] == "INVALID_NICKNAME"
