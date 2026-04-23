from django.db import transaction
from farm.services import grant_attendance_reward
from farm.models import UserFarm


def _ensure_farm(user):
    farm, _ = UserFarm.objects.get_or_create(
        user=user,
        defaults={
            "dex_no": (UserFarm.objects.order_by("-dex_no").values_list("dex_no", flat=True).first() or 0) + 1,
        },
    )
    return farm


@transaction.atomic
def finalize_checkout(record, when, *, skip_reward: bool = False):
    """모든 체크아웃 경로의 단일 진입점.

    record.check_out_at = when 으로 갱신하고, skip_reward=False면 보상 적립.
    멱등성: 이미 reward_granted면 grant_attendance_reward가 noop 처리.
    """
    if record.check_out_at != when:
        record.check_out_at = when
        record.save(update_fields=["check_out_at"])

    if skip_reward:
        return

    _ensure_farm(record.user)
    grant_attendance_reward(record.user, record)
