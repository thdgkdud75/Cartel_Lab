from dataclasses import dataclass, field
from datetime import timedelta
from typing import List, Dict, Any
from django.db import transaction
from django.utils import timezone
from farm import constants as C
from farm.models import UserFarm
from attendance.models import AttendanceRecord
from farm.audit_log import log_negative_coin_clamp


@dataclass
class RewardResult:
    noop: bool = False
    events: List[Dict[str, Any]] = field(default_factory=list)


def _compute_exp(stay_minutes: int, streak_days: int) -> int:
    stay_exp = min(stay_minutes // 30, C.STAY_EXP_CAP)
    multiplier = 1.0 + min(streak_days, C.STREAK_MULTIPLIER_CAP_DAYS) * C.STREAK_MULTIPLIER_STEP
    return round((C.ATTENDANCE_BASE_EXP + stay_exp) * multiplier)


def _farm_level_for(total_exp: int) -> tuple[int, int]:
    """반환 (level, display_slots)."""
    level = 1
    slots = C.FARM_LEVELS[0]["display_slots"]
    for i, lv in enumerate(C.FARM_LEVELS):
        if total_exp >= lv["required_total_exp"]:
            level = i + 1
            slots = lv["display_slots"]
    return level, slots


@transaction.atomic
def grant_attendance_reward(user, record) -> RewardResult:
    if record.reward_granted:
        return RewardResult(noop=True)
    if record.check_out_at is None:
        return RewardResult(noop=True)

    farm = UserFarm.objects.select_for_update().get(user=user)
    today = timezone.localdate(record.check_out_at)

    # streak 갱신
    if farm.last_attendance_date == today - timedelta(days=1):
        farm.streak_days += 1
    elif farm.last_attendance_date != today:
        farm.streak_days = 1
    farm.last_attendance_date = today

    stay_minutes = max(0, int((record.check_out_at - record.check_in_at).total_seconds() // 60))
    exp = _compute_exp(stay_minutes, farm.streak_days)
    coins = exp // 2

    farm.total_exp += exp
    farm.coins += coins

    events = [
        {"type": "exp_gained", "amount": exp},
        {"type": "coin_gained", "amount": coins},
        {"type": "streak_updated", "days": farm.streak_days},
    ]

    new_level, new_slots = _farm_level_for(farm.total_exp)
    if new_level > farm.level:
        events.append({"type": "farm_level_up", "from": farm.level, "to": new_level, "new_slots": new_slots})
        farm.level = new_level
        farm.display_slots = new_slots

    farm.save()

    record.reward_granted = True
    record.save(update_fields=["reward_granted"])

    return RewardResult(events=events)


def _rebuild_farm_resources(farm: UserFarm) -> None:
    """reward_granted=True인 모든 record로 total_exp/level/streak 다시 계산.

    coins는 사용/획득이 섞이므로 여기서 건드리지 않는다 — 호출자가 차감 후 음수 클램프.
    """
    records = list(
        AttendanceRecord.objects.filter(user=farm.user, reward_granted=True)
        .order_by("attendance_date")
        .values("attendance_date", "check_in_at", "check_out_at")
    )
    if not records:
        farm.total_exp = 0
        farm.streak_days = 0
        farm.last_attendance_date = None
        farm.level = 1
        farm.display_slots = C.FARM_LEVELS[0]["display_slots"]
        return

    total_exp = 0
    streak = 0
    prev_date = None
    for r in records:
        if prev_date is not None and (r["attendance_date"] - prev_date).days == 1:
            streak += 1
        else:
            streak = 1
        prev_date = r["attendance_date"]
        stay_min = max(0, int((r["check_out_at"] - r["check_in_at"]).total_seconds() // 60))
        total_exp += _compute_exp(stay_min, streak)

    farm.total_exp = total_exp
    farm.streak_days = streak
    farm.last_attendance_date = records[-1]["attendance_date"]
    new_level, new_slots = _farm_level_for(total_exp)
    farm.level = new_level
    farm.display_slots = new_slots


@transaction.atomic
def revoke_attendance_reward(record) -> None:
    if not record.reward_granted:
        return
    farm = UserFarm.objects.select_for_update().get(user=record.user)

    # 적립 시 코인 추정 — 현재 streak 기반 (정확하진 않지만 보수적)
    stay_min = max(0, int((record.check_out_at - record.check_in_at).total_seconds() // 60))
    estimated_exp = _compute_exp(stay_min, farm.streak_days)
    estimated_coins = estimated_exp // 2

    new_coins = farm.coins - estimated_coins
    if new_coins < 0:
        log_negative_coin_clamp(record.user_id, -estimated_coins, farm.coins)
        new_coins = 0
    farm.coins = new_coins

    record.reward_granted = False
    record.save(update_fields=["reward_granted"])

    _rebuild_farm_resources(farm)
    farm.save()
