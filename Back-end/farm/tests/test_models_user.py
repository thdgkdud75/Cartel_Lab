import pytest
from django.contrib.auth import get_user_model
from datetime import date
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(student_id="2026001", password="pw", name="Alice")


@pytest.mark.django_db
def test_userfarm_defaults(user):
    farm = UserFarm.objects.create(user=user, dex_no=1)
    assert farm.level == 1
    assert farm.display_slots == 5
    assert farm.coins == 0
    assert farm.total_exp == 0
    assert farm.streak_days == 0
    assert farm.last_attendance_date is None
    assert farm.pity_normal == 0


@pytest.mark.django_db
def test_useranimal_defaults_and_ordering(user):
    farm = UserFarm.objects.create(user=user, dex_no=1)
    species = Species.objects.create(code="_t_chick", name="병아리", rarity="N", description="", stages=[])
    a1 = UserAnimal.objects.create(farm=farm, species=species)
    a2 = UserAnimal.objects.create(farm=farm, species=species)
    assert a1.current_stage == 0
    assert a1.exp == 0
    assert a1.affection == 0
    assert a1.nickname is None
    latest = list(UserAnimal.objects.filter(farm=farm).order_by("-acquired_at"))
    assert latest[0].id == a2.id


@pytest.mark.django_db
def test_daily_interaction_unique(user):
    farm = UserFarm.objects.create(user=user, dex_no=1)
    DailyInteraction.objects.create(farm=farm, date=date(2026, 4, 15))
    with pytest.raises(Exception):
        DailyInteraction.objects.create(farm=farm, date=date(2026, 4, 15))
