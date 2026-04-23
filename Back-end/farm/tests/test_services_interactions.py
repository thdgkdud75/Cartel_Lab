import pytest
from django.utils import timezone
from farm.models import Species, UserAnimal, DailyInteraction
from farm.services import (
    feed_animal, pet_animal, set_nickname,
    EggError, NicknameError,
)
from farm.tests.factories import make_user, make_farm


@pytest.fixture
def setup(db):
    user = make_user()
    farm = make_farm(user, coins=100)
    sp = Species.objects.create(
        code="_int_t", name="t", rarity="N", description="",
        stages=[
            {"name": "1", "sprite_url": "/s/1", "exp_to_next": 50},
            {"name": "2", "sprite_url": "/s/2", "exp_to_next": 200},
            {"name": "3", "sprite_url": "/s/3", "exp_to_next": 600},
            {"name": "4", "sprite_url": "/s/4", "exp_to_next": None},
        ],
    )
    animal = UserAnimal.objects.create(farm=farm, species=sp)
    return farm, animal


@pytest.mark.django_db
def test_feed_consumes_coin_and_adds_exp(setup):
    farm, animal = setup
    result = feed_animal(farm, animal)
    farm.refresh_from_db()
    animal.refresh_from_db()
    assert farm.coins == 98
    assert animal.exp == 5
    assert any(e["type"] == "exp_gained" and e["amount"] == 5 for e in result.events)


@pytest.mark.django_db
def test_feed_triggers_evolution(setup):
    farm, animal = setup
    animal.exp = 48
    animal.save()
    result = feed_animal(farm, animal)
    animal.refresh_from_db()
    assert animal.current_stage == 1
    assert animal.exp == 53
    assert any(e["type"] == "evolved" and e["to_stage"] == 1 for e in result.events)


@pytest.mark.django_db
def test_feed_daily_limit(setup):
    farm, animal = setup
    DailyInteraction.objects.create(farm=farm, date=timezone.localdate(), feed_count=30)
    with pytest.raises(EggError) as ei:
        feed_animal(farm, animal)
    assert ei.value.code == "DAILY_LIMIT_FEED"


@pytest.mark.django_db
def test_feed_insufficient_coins(setup):
    farm, animal = setup
    farm.coins = 1
    farm.save()
    with pytest.raises(EggError) as ei:
        feed_animal(farm, animal)
    assert ei.value.code == "INSUFFICIENT_COINS"


@pytest.mark.django_db
def test_pet_increases_affection_no_coin(setup):
    farm, animal = setup
    initial = farm.coins
    pet_animal(farm, animal)
    farm.refresh_from_db()
    animal.refresh_from_db()
    assert farm.coins == initial
    assert animal.affection == 1


@pytest.mark.django_db
def test_pet_daily_limit(setup):
    farm, animal = setup
    DailyInteraction.objects.create(farm=farm, date=timezone.localdate(), pet_count=20)
    with pytest.raises(EggError) as ei:
        pet_animal(farm, animal)
    assert ei.value.code == "DAILY_LIMIT_PET"


@pytest.mark.django_db
def test_set_nickname(setup):
    farm, animal = setup
    set_nickname(animal, "뭉치")
    animal.refresh_from_db()
    assert animal.nickname == "뭉치"


@pytest.mark.django_db
def test_set_nickname_invalid(setup):
    farm, animal = setup
    with pytest.raises(NicknameError):
        set_nickname(animal, "")
