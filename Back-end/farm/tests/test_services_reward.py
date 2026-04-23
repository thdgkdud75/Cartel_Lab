import pytest
from datetime import timedelta
from django.utils import timezone
from farm.services import grant_attendance_reward, revoke_attendance_reward
from farm.tests.factories import make_user, make_farm, make_record


@pytest.fixture
def user_with_farm(db):
    user = make_user()
    farm = make_farm(user)
    return user, farm


@pytest.mark.django_db
def test_grant_first_attendance_no_stay(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now, check_out_at=now)
    result = grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    rec.refresh_from_db()
    assert farm.total_exp == 10
    assert farm.coins == 5
    assert farm.streak_days == 1
    assert farm.last_attendance_date == timezone.localdate()
    assert rec.reward_granted is True
    assert any(e["type"] == "exp_gained" and e["amount"] == 10 for e in result.events)


@pytest.mark.django_db
def test_grant_with_stay_4h(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=4), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.total_exp == 18
    assert farm.coins == 9


@pytest.mark.django_db
def test_grant_idempotent(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now, check_out_at=now)
    grant_attendance_reward(user, rec)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.total_exp == 10


@pytest.mark.django_db
def test_streak_continues_when_consecutive(user_with_farm):
    user, farm = user_with_farm
    yesterday = timezone.localdate() - timedelta(days=1)
    farm.last_attendance_date = yesterday
    farm.streak_days = 5
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now, check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.streak_days == 6


@pytest.mark.django_db
def test_streak_resets_when_gap(user_with_farm):
    user, farm = user_with_farm
    farm.last_attendance_date = timezone.localdate() - timedelta(days=3)
    farm.streak_days = 10
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now, check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.streak_days == 1


@pytest.mark.django_db
def test_streak_multiplier_applies(user_with_farm):
    user, farm = user_with_farm
    farm.last_attendance_date = timezone.localdate() - timedelta(days=1)
    farm.streak_days = 30
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=8), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.total_exp == 42


@pytest.mark.django_db
def test_revoke_returns_resources(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=4), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.coins == 9 and farm.total_exp == 18

    revoke_attendance_reward(rec)
    farm.refresh_from_db()
    rec.refresh_from_db()
    assert farm.total_exp == 0
    assert farm.coins == 0
    assert rec.reward_granted is False


@pytest.mark.django_db
def test_revoke_clamps_negative_coins(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=4), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    farm.coins = 2
    farm.save()
    revoke_attendance_reward(rec)
    farm.refresh_from_db()
    assert farm.coins == 0


@pytest.mark.django_db
def test_revoke_recomputes_farm_level(user_with_farm):
    user, farm = user_with_farm
    farm.total_exp = 590
    farm.level = 1
    farm.display_slots = 5
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=8), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    assert farm.level == 2 and farm.display_slots == 10
    revoke_attendance_reward(rec)
    farm.refresh_from_db()
    assert farm.level == 1 and farm.display_slots == 5
    # rebuild_farm_resources는 reward_granted 레코드만 합산하므로 0
    assert farm.total_exp == 0
