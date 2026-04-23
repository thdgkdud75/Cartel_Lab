import pytest
from datetime import timedelta, datetime
from zoneinfo import ZoneInfo
from django.utils import timezone
from attendance.models import AttendanceRecord
from attendance.services import finalize_checkout
from farm.tests.factories import make_user, make_farm


@pytest.fixture
def setup(db):
    user = make_user()
    farm = make_farm(user)
    return user, farm


@pytest.mark.django_db
def test_finalize_checkout_grants_reward(setup):
    user, farm = setup
    rec = AttendanceRecord.objects.create(user=user)
    when = timezone.now() + timedelta(hours=4)
    finalize_checkout(rec, when)
    rec.refresh_from_db()
    farm.refresh_from_db()
    assert rec.check_out_at == when
    assert rec.reward_granted is True
    assert farm.total_exp > 0


@pytest.mark.django_db
def test_finalize_checkout_skip_reward(setup):
    user, farm = setup
    rec = AttendanceRecord.objects.create(user=user)
    when = timezone.now() + timedelta(hours=4)
    finalize_checkout(rec, when, skip_reward=True)
    rec.refresh_from_db()
    farm.refresh_from_db()
    assert rec.check_out_at == when
    assert rec.reward_granted is False
    assert farm.total_exp == 0


@pytest.mark.django_db
def test_finalize_checkout_idempotent(setup):
    user, farm = setup
    rec = AttendanceRecord.objects.create(user=user)
    when = timezone.now() + timedelta(hours=4)
    finalize_checkout(rec, when)
    finalize_checkout(rec, when)
    farm.refresh_from_db()
    assert AttendanceRecord.objects.get(pk=rec.pk).reward_granted is True
    # 중복 적립 없음 — 4시간 체류 1회분 EXP만
    assert farm.total_exp == 18


@pytest.mark.django_db
def test_streak_boundary_kst():
    """KST 23:59 퇴실은 같은 날, 다음날 출석은 +1."""
    KST = ZoneInfo("Asia/Seoul")
    user = make_user("tz")
    make_farm(user)

    rec1 = AttendanceRecord.objects.create(user=user)
    AttendanceRecord.objects.filter(pk=rec1.pk).update(
        attendance_date=datetime(2026, 4, 14).date(),
        check_in_at=datetime(2026, 4, 14, 22, 0, tzinfo=KST),
        check_out_at=datetime(2026, 4, 14, 23, 59, tzinfo=KST),
    )
    rec1.refresh_from_db()
    finalize_checkout(rec1, rec1.check_out_at)

    rec2 = AttendanceRecord.objects.create(user=user)
    AttendanceRecord.objects.filter(pk=rec2.pk).update(
        attendance_date=datetime(2026, 4, 15).date(),
        check_in_at=datetime(2026, 4, 15, 9, 0, tzinfo=KST),
        check_out_at=datetime(2026, 4, 15, 18, 0, tzinfo=KST),
    )
    rec2.refresh_from_db()
    finalize_checkout(rec2, rec2.check_out_at)

    from farm.models import UserFarm
    farm = UserFarm.objects.get(user=user)
    assert farm.streak_days == 2


@pytest.mark.django_db
def test_all_checkout_modules_import_finalize():
    """모든 체크아웃 사용처가 finalize_checkout을 import한다."""
    import inspect
    from attendance import discord_bot, views as attendance_views
    from dashboard import api_views as dashboard_api_views, page_views as dashboard_page_views
    from attendance.management.commands import auto_check_out

    sources = [
        inspect.getsource(attendance_views),
        inspect.getsource(discord_bot),
        inspect.getsource(auto_check_out),
        inspect.getsource(dashboard_api_views),
        inspect.getsource(dashboard_page_views),
    ]
    for src in sources:
        assert "finalize_checkout" in src
