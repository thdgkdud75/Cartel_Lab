import pytest
import random
from collections import Counter
from farm.models import Species, UserAnimal
from farm.services import draw_egg, EggError
from farm.tests.factories import make_user, make_farm


@pytest.fixture
def setup(db):
    user = make_user()
    farm = make_farm(user, coins=1000)
    return user, farm


@pytest.mark.django_db
def test_draw_normal_egg_consumes_coin_and_creates_animal(setup):
    user, farm = setup
    initial = farm.coins
    animal = draw_egg(farm, "normal", rng=random.Random(42))
    farm.refresh_from_db()
    assert farm.coins == initial - 30
    assert isinstance(animal, UserAnimal)
    assert animal.farm_id == farm.id
    assert animal.current_stage == 0


@pytest.mark.django_db
def test_draw_insufficient_coins_raises(setup):
    user, farm = setup
    farm.coins = 5
    farm.save()
    with pytest.raises(EggError) as ei:
        draw_egg(farm, "normal", rng=random.Random(0))
    assert ei.value.code == "INSUFFICIENT_COINS"


@pytest.mark.django_db
def test_draw_distribution_matches_probs(setup):
    """30k 회 시뮬, 각 등급 ±1.5% 이내."""
    user, farm = setup
    rng = random.Random(2026)
    rarities = Counter()
    N = 30_000
    for _ in range(N):
        farm.pity_normal = 0
        farm.coins = 30
        farm.save()
        a = draw_egg(farm, "normal", rng=rng)
        rarities[a.species.rarity] += 1
        a.delete()
    assert abs(rarities["N"] / N - 0.70) < 0.015
    assert abs(rarities["R"] / N - 0.25) < 0.015
    assert abs(rarities["SR"] / N - 0.045) < 0.01
    assert abs(rarities["SSR"] / N - 0.005) < 0.005


@pytest.mark.django_db
def test_pity_triggers_at_threshold(setup):
    user, farm = setup
    farm.pity_normal = 49
    farm.save()
    rng = random.Random(0)
    animal = draw_egg(farm, "normal", rng=rng)
    farm.refresh_from_db()
    assert animal.species.rarity in ("SR", "SSR")
    assert farm.pity_normal == 0
