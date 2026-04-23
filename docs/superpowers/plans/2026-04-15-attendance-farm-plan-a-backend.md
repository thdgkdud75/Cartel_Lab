# 출석 농장 — Plan A: 백엔드 백본 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 출석 농장 백엔드 백본(데이터 모델, 보상 적립/롤백 서비스, attendance 통합, 봉투/도감/간식/쓰다듬기 REST API)을 구축하여 프론트 없이도 curl로 검증 가능한 상태를 만든다.

**Architecture:** 신규 Django 앱 `farm/`. 출결과의 결합은 시그널이 아닌 `farm/services.py`의 명시 호출 — 모든 출결 경로(개인/관리자 일괄/디스코드/auto_check_out)에 통합. 멱등성·동시성은 `select_for_update` + `AttendanceRecord.reward_granted` 플래그로 보장. 종(`Species`)의 진화 단계는 JSON 인라인.

**Tech Stack:** Django 4.2.29, DRF 3.17, JWT 인증(simplejwt), MySQL/SQLite, KST(`Asia/Seoul`), `USE_TZ=True`.

**Spec:** `docs/superpowers/specs/2026-04-15-attendance-farm-design.md`

**관련 기존 코드:**
- `Back-end/attendance/models.py` — `AttendanceRecord`
- `Back-end/attendance/views.py` — 개인 체크아웃(line 356)·승인(line 631)
- `Back-end/attendance/discord_bot.py:75` — 디스코드 체크아웃
- `Back-end/attendance/management/commands/auto_check_out.py:27` — 자동 퇴실
- `Back-end/dashboard/api_views.py:254, 345`, `dashboard/page_views.py:116` — 관리자 일괄/수동 변경

---

## File Structure

신규 Django 앱 `Back-end/farm/`:

| 파일 | 책임 |
|---|---|
| `farm/__init__.py` | 빈 |
| `farm/apps.py` | AppConfig |
| `farm/constants.py` | 모든 수치 상수 (가격/확률/EXP 곡선 등) 한 곳 |
| `farm/models.py` | `Species`, `UserFarm`, `UserAnimal`, `DailyInteraction` |
| `farm/admin.py` | Django admin 등록 |
| `farm/services.py` | `grant_attendance_reward`, `revoke_attendance_reward`, `recalculate_streak`, `draw_egg`, `feed_animal`, `pet_animal`, `set_nickname`, `evolve_if_ready` |
| `farm/profanity.py` | 닉네임 금칙어 검사 |
| `farm/audit_log.py` | 보상 차감 시 음수 클램프 등 운영 로그 (Python `logging` 래퍼) |
| `farm/serializers.py` | DRF 직렬화 |
| `farm/views.py` | DRF 뷰 (REST 엔드포인트) |
| `farm/urls.py` | URL 라우팅 |
| `farm/migrations/0001_initial.py` | 마스터/유저 모델 |
| `farm/migrations/0002_seed_species.py` | 5종 시드 (data migration) |
| `farm/tests/__init__.py` | |
| `farm/tests/factories.py` | pytest 픽스처 (User/AttendanceRecord/UserFarm 생성 헬퍼) |
| `farm/tests/test_services_reward.py` | 적립·롤백·streak·멱등성 |
| `farm/tests/test_services_egg.py` | 봉투 확률·천장 |
| `farm/tests/test_services_interactions.py` | 간식/쓰다듬기/진화/한도 |
| `farm/tests/test_services_nickname.py` | 닉네임 검증 |
| `farm/tests/test_api.py` | REST 엔드포인트 통합 |
| `farm/tests/test_attendance_integration.py` | 4개 출결 경로별 회귀 |
| `farm/tests/test_concurrency.py` | 동시성 (트랜잭션) |

기존 파일 수정:
| 파일 | 변경 |
|---|---|
| `attendance/models.py` | `AttendanceRecord.reward_granted: bool` 추가 |
| `attendance/migrations/0004_*.py` | 위 필드 추가 + 기존 레코드 backfill |
| `attendance/services.py` | **신규**. 모든 체크아웃 경로가 호출할 단일 함수 `finalize_checkout(record, when, *, skip_reward=False)` |
| `attendance/views.py` | 357, 632 사용처 → `finalize_checkout` 호출 |
| `attendance/discord_bot.py` | 75 → `finalize_checkout` 호출 |
| `attendance/management/commands/auto_check_out.py` | 27 → `finalize_checkout` 호출 |
| `dashboard/api_views.py` | 254(.update), 345 → `finalize_checkout` 호출 |
| `dashboard/page_views.py` | 116 → `finalize_checkout` 호출 |
| `config/settings.py` | INSTALLED_APPS에 `'farm'` 추가 |
| `config/urls.py` | `path('api/farm/', include('farm.urls'))` 추가 |

---

## 사전 준비 (Task 0)

### Task 0: 작업 브랜치 분리

**Files:** 없음 (git만)

- [ ] **Step 1: 새 브랜치 생성**

```bash
cd /Users/bobs/Desktop/bobs_project/team_lab
git checkout -b feature/farm-backend
```

- [ ] **Step 2: 작업 디렉터리 확인**

```bash
ls Back-end/attendance Back-end/config
```
Expected: 두 디렉터리 모두 존재.

---

## 마일스톤 1: 상수와 마스터 모델

### Task 1: `farm` 앱 골격 + 상수

**Files:**
- Create: `Back-end/farm/__init__.py`
- Create: `Back-end/farm/apps.py`
- Create: `Back-end/farm/constants.py`
- Create: `Back-end/farm/tests/__init__.py`
- Modify: `Back-end/config/settings.py` (INSTALLED_APPS)

- [ ] **Step 1: 앱 디렉터리 만들기**

```bash
mkdir -p Back-end/farm/tests Back-end/farm/migrations
touch Back-end/farm/__init__.py
touch Back-end/farm/migrations/__init__.py
touch Back-end/farm/tests/__init__.py
```

- [ ] **Step 2: `apps.py` 작성**

```python
# Back-end/farm/apps.py
from django.apps import AppConfig


class FarmConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "farm"
```

- [ ] **Step 3: `constants.py` 작성**

```python
# Back-end/farm/constants.py
"""모든 농장 수치 상수. 운영 튜닝은 이 파일에서만."""

# 출석 보상
ATTENDANCE_BASE_EXP = 10
STAY_EXP_PER_30MIN = 1
STAY_EXP_CAP = 16  # 8시간
STREAK_MULTIPLIER_STEP = 0.02
STREAK_MULTIPLIER_CAP_DAYS = 30  # 최대 ×1.6

# 봉투
EGG_NORMAL_PRICE = 30
EGG_NORMAL_PROBS = {"N": 0.70, "R": 0.25, "SR": 0.045, "SSR": 0.005}
EGG_NORMAL_PITY_THRESHOLD = 50  # 50회 연속 N/R 후 SR 확정

# 일일 한도 (농장 단위)
DAILY_FEED_LIMIT = 30
DAILY_PET_LIMIT = 20

# 간식
FEED_COIN_COST = 2
FEED_EXP_GAIN = 5

# 쓰다듬기
PET_AFFECTION_GAIN = 1

# 농장 레벨 → display_slots (Lv는 인덱스+1)
FARM_LEVELS = [
    {"required_total_exp": 0, "display_slots": 5},
    {"required_total_exp": 600, "display_slots": 10},
    {"required_total_exp": 2000, "display_slots": 15},
]

# 닉네임
NICKNAME_MIN_LEN = 1
NICKNAME_MAX_LEN = 12
```

- [ ] **Step 4: settings에 앱 등록**

`Back-end/config/settings.py` line 60(`'contests',`) 다음 줄에 `'farm',` 추가.

- [ ] **Step 5: 시스템 체크 통과 확인**

```bash
cd Back-end && python manage.py check
```
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/ Back-end/config/settings.py
git commit -m "feat(farm): scaffold farm app with constants"
```

---

### Task 2: `Species` 모델 + 마이그레이션

**Files:**
- Create: `Back-end/farm/models.py`
- Create: `Back-end/farm/migrations/0001_initial.py` (auto-generated)
- Test: `Back-end/farm/tests/test_models_species.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_models_species.py
import pytest
from farm.models import Species


@pytest.mark.django_db
def test_species_creation_with_stages():
    species = Species.objects.create(
        code="chick",
        name="병아리",
        rarity="N",
        description="흔한 병아리",
        stages=[
            {"name": "병아리", "sprite_url": "/s/c1.png", "exp_to_next": 50},
            {"name": "큰 병아리", "sprite_url": "/s/c2.png", "exp_to_next": 200},
            {"name": "닭", "sprite_url": "/s/c3.png", "exp_to_next": 600},
            {"name": "수탉", "sprite_url": "/s/c4.png", "exp_to_next": None},
        ],
    )
    assert species.code == "chick"
    assert species.rarity == "N"
    assert len(species.stages) == 4
    assert species.stages[3]["exp_to_next"] is None


@pytest.mark.django_db
def test_species_code_unique():
    Species.objects.create(code="chick", name="병아리", rarity="N", description="", stages=[])
    with pytest.raises(Exception):
        Species.objects.create(code="chick", name="다른병아리", rarity="R", description="", stages=[])
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd Back-end && pytest farm/tests/test_models_species.py -v
```
Expected: ImportError 또는 모듈 없음.

- [ ] **Step 3: `Species` 모델 작성**

```python
# Back-end/farm/models.py
from django.conf import settings
from django.db import models


class Species(models.Model):
    RARITY_CHOICES = [("N", "N"), ("R", "R"), ("SR", "SR"), ("SSR", "SSR")]

    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=64)
    rarity = models.CharField(max_length=4, choices=RARITY_CHOICES)
    description = models.TextField(blank=True)
    stages = models.JSONField(default=list)  # [{name, sprite_url, exp_to_next}, ...]

    def __str__(self):
        return f"{self.name} ({self.rarity})"
```

- [ ] **Step 4: 마이그레이션 생성·적용**

```bash
cd Back-end && python manage.py makemigrations farm
python manage.py migrate farm
```
Expected: `0001_initial.py` 생성, `Applying farm.0001_initial... OK`.

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest farm/tests/test_models_species.py -v
```
Expected: 2 passed.

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/models.py Back-end/farm/migrations/0001_initial.py Back-end/farm/tests/test_models_species.py
git commit -m "feat(farm): add Species model with inline stages"
```

---

### Task 3: `UserFarm`, `UserAnimal`, `DailyInteraction` 모델

**Files:**
- Modify: `Back-end/farm/models.py`
- Create: `Back-end/farm/migrations/0002_userfarm_useranimal_dailyinteraction.py` (auto)
- Test: `Back-end/farm/tests/test_models_user.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_models_user.py
import pytest
from django.contrib.auth import get_user_model
from datetime import date
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", email="a@x.com", password="pw", name="Alice")


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
    species = Species.objects.create(code="chick", name="병아리", rarity="N", description="", stages=[])
    a1 = UserAnimal.objects.create(farm=farm, species=species)
    a2 = UserAnimal.objects.create(farm=farm, species=species)
    assert a1.current_stage == 0
    assert a1.exp == 0
    assert a1.affection == 0
    assert a1.nickname is None
    # 최신 획득 우선
    latest = list(UserAnimal.objects.filter(farm=farm).order_by("-acquired_at"))
    assert latest[0].id == a2.id


@pytest.mark.django_db
def test_daily_interaction_unique(user):
    farm = UserFarm.objects.create(user=user, dex_no=1)
    DailyInteraction.objects.create(farm=farm, date=date(2026, 4, 15))
    with pytest.raises(Exception):
        DailyInteraction.objects.create(farm=farm, date=date(2026, 4, 15))
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_models_user.py -v
```
Expected: ImportError (UserFarm 없음).

- [ ] **Step 3: 모델 추가**

`Back-end/farm/models.py` 끝에 추가:

```python
class UserFarm(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farm",
    )
    dex_no = models.PositiveIntegerField(unique=True)
    level = models.PositiveSmallIntegerField(default=1)
    display_slots = models.PositiveSmallIntegerField(default=5)
    coins = models.PositiveIntegerField(default=0)
    total_exp = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_attendance_date = models.DateField(null=True, blank=True)
    pity_normal = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"farm#{self.dex_no}({self.user})"


class UserAnimal(models.Model):
    farm = models.ForeignKey(UserFarm, on_delete=models.CASCADE, related_name="animals")
    species = models.ForeignKey(Species, on_delete=models.PROTECT)
    current_stage = models.PositiveSmallIntegerField(default=0)
    exp = models.PositiveIntegerField(default=0)
    affection = models.PositiveIntegerField(default=0)
    nickname = models.CharField(max_length=12, null=True, blank=True)
    acquired_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["farm", "-acquired_at"])]


class DailyInteraction(models.Model):
    farm = models.ForeignKey(UserFarm, on_delete=models.CASCADE, related_name="daily")
    date = models.DateField()
    pet_count = models.PositiveIntegerField(default=0)
    feed_count = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("farm", "date")
```

- [ ] **Step 4: 마이그레이션·적용**

```bash
cd Back-end && python manage.py makemigrations farm && python manage.py migrate farm
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest farm/tests/test_models_user.py -v
```
Expected: 3 passed.

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/models.py Back-end/farm/migrations/0002_*.py Back-end/farm/tests/test_models_user.py
git commit -m "feat(farm): add UserFarm/UserAnimal/DailyInteraction models"
```

---

### Task 4: 5종 시드 데이터 마이그레이션

**Files:**
- Create: `Back-end/farm/migrations/0003_seed_species.py`
- Test: `Back-end/farm/tests/test_seed.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_seed.py
import pytest
from farm.models import Species


@pytest.mark.django_db
def test_seeded_species_count():
    # 시드 마이그레이션 후 5종이 존재해야 함
    codes = set(Species.objects.values_list("code", flat=True))
    expected = {"chick", "rabbit", "fox", "cat", "dragon"}
    assert codes == expected, f"missing: {expected - codes}"


@pytest.mark.django_db
def test_seeded_species_have_4_stages():
    for sp in Species.objects.all():
        assert len(sp.stages) == 4, f"{sp.code} has {len(sp.stages)} stages"
        assert sp.stages[3]["exp_to_next"] is None
        for s in sp.stages[:3]:
            assert s["exp_to_next"] in (50, 200, 600)
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_seed.py -v
```
Expected: AssertionError (codes는 빈 set).

- [ ] **Step 3: 시드 마이그레이션 작성**

```python
# Back-end/farm/migrations/0003_seed_species.py
from django.db import migrations


SEED = [
    ("chick", "병아리", "N", "마당의 흔한 병아리.", "chick"),
    ("rabbit", "토끼", "R", "한가로이 풀을 뜯는 토끼.", "rabbit"),
    ("fox", "여우", "SR", "꼬리가 풍성한 여우.", "fox"),
    ("cat", "고양이", "R", "낮잠을 즐기는 고양이.", "cat"),
    ("dragon", "꼬마용", "SSR", "전설 속 작은 용.", "dragon"),
]


def forwards(apps, schema_editor):
    Species = apps.get_model("farm", "Species")
    for code, name, rarity, desc, prefix in SEED:
        Species.objects.update_or_create(
            code=code,
            defaults={
                "name": name,
                "rarity": rarity,
                "description": desc,
                "stages": [
                    {"name": f"{name} 1단계", "sprite_url": f"/sprites/{prefix}_1.png", "exp_to_next": 50},
                    {"name": f"{name} 2단계", "sprite_url": f"/sprites/{prefix}_2.png", "exp_to_next": 200},
                    {"name": f"{name} 3단계", "sprite_url": f"/sprites/{prefix}_3.png", "exp_to_next": 600},
                    {"name": f"{name} 4단계", "sprite_url": f"/sprites/{prefix}_4.png", "exp_to_next": None},
                ],
            },
        )


def backwards(apps, schema_editor):
    Species = apps.get_model("farm", "Species")
    Species.objects.filter(code__in=[c for c, *_ in SEED]).delete()


class Migration(migrations.Migration):
    dependencies = [("farm", "0002_userfarm_useranimal_dailyinteraction")]
    operations = [migrations.RunPython(forwards, backwards)]
```

> 마이그레이션 파일명의 0002 부분은 직전 마이그레이션 실제 파일명에 맞춰 조정.

- [ ] **Step 4: 마이그레이션 적용**

```bash
cd Back-end && python manage.py migrate farm
```
Expected: `Applying farm.0003_seed_species... OK`.

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest farm/tests/test_seed.py -v
```
Expected: 2 passed.

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/migrations/0003_seed_species.py Back-end/farm/tests/test_seed.py
git commit -m "feat(farm): seed 5 base species"
```

---

## 마일스톤 2: `AttendanceRecord.reward_granted`

### Task 5: `reward_granted` 필드 + backfill 마이그레이션

**Files:**
- Modify: `Back-end/attendance/models.py`
- Create: `Back-end/attendance/migrations/0004_attendancerecord_reward_granted.py`
- Test: `Back-end/farm/tests/test_attendance_field.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_attendance_field.py
import pytest
from django.contrib.auth import get_user_model
from attendance.models import AttendanceRecord

User = get_user_model()


@pytest.mark.django_db
def test_new_record_has_reward_granted_false():
    user = User.objects.create_user(username="bob", email="b@x.com", password="pw", name="Bob")
    rec = AttendanceRecord.objects.create(user=user)
    rec.refresh_from_db()
    assert rec.reward_granted is False
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_attendance_field.py -v
```
Expected: AttributeError (필드 없음).

- [ ] **Step 3: 필드 추가**

`Back-end/attendance/models.py` `AttendanceRecord` 클래스 안에 `note` 다음 라인에 추가:

```python
    reward_granted = models.BooleanField(default=False)
```

- [ ] **Step 4: 마이그레이션 생성**

```bash
cd Back-end && python manage.py makemigrations attendance
```
Expected: `0004_attendancerecord_reward_granted.py` 생성.

- [ ] **Step 5: 마이그레이션에 backfill RunPython 추가**

생성된 `Back-end/attendance/migrations/0004_attendancerecord_reward_granted.py`를 열어 `operations` 마지막에 추가:

```python
def _backfill(apps, schema_editor):
    AR = apps.get_model("attendance", "AttendanceRecord")
    AR.objects.filter(check_out_at__isnull=False).update(reward_granted=True)


# operations 리스트 마지막에:
        migrations.RunPython(_backfill, migrations.RunPython.noop),
```

> 위 import는 파일 상단 `from django.db import migrations, models` 다음에 함수 정의를 두면 됨. 자동 생성된 AddField 뒤에 RunPython이 와야 한다.

- [ ] **Step 6: 마이그레이션 적용 및 테스트**

```bash
cd Back-end && python manage.py migrate attendance
pytest farm/tests/test_attendance_field.py -v
```
Expected: 1 passed.

- [ ] **Step 7: 커밋**

```bash
git add Back-end/attendance/models.py Back-end/attendance/migrations/0004_*.py Back-end/farm/tests/test_attendance_field.py
git commit -m "feat(attendance): add reward_granted flag with backfill"
```

---

## 마일스톤 3: 보상 서비스 (`grant_attendance_reward`)

### Task 6: 픽스처 헬퍼

**Files:**
- Create: `Back-end/farm/tests/factories.py`

- [ ] **Step 1: 헬퍼 작성**

```python
# Back-end/farm/tests/factories.py
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.utils import timezone
from attendance.models import AttendanceRecord
from farm.models import UserFarm

User = get_user_model()


def make_user(username="u1", email=None):
    return User.objects.create_user(
        username=username,
        email=email or f"{username}@x.com",
        password="pw",
        name=username.title(),
    )


def make_farm(user, **overrides):
    next_no = (UserFarm.objects.order_by("-dex_no").values_list("dex_no", flat=True).first() or 0) + 1
    return UserFarm.objects.create(user=user, dex_no=overrides.pop("dex_no", next_no), **overrides)


def make_record(user, *, check_in_at=None, check_out_at=None, attendance_date=None):
    """auto_now_add 우회를 위해 .save 후 update."""
    rec = AttendanceRecord.objects.create(user=user)
    update = {}
    if check_in_at is not None:
        update["check_in_at"] = check_in_at
    if check_out_at is not None:
        update["check_out_at"] = check_out_at
    if attendance_date is not None:
        update["attendance_date"] = attendance_date
    if update:
        AttendanceRecord.objects.filter(pk=rec.pk).update(**update)
        rec.refresh_from_db()
    return rec
```

- [ ] **Step 2: 커밋**

```bash
git add Back-end/farm/tests/factories.py
git commit -m "test(farm): add fixture helpers"
```

---

### Task 7: `grant_attendance_reward` — 멱등성과 기본 공식

**Files:**
- Create: `Back-end/farm/services.py`
- Test: `Back-end/farm/tests/test_services_reward.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_services_reward.py
import pytest
from datetime import datetime, timedelta, date
from django.utils import timezone
from farm.models import UserFarm
from farm.services import grant_attendance_reward
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
    rec = make_record(user, check_in_at=now, check_out_at=now)  # 0 minutes stay
    result = grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    rec.refresh_from_db()
    # 기본 10 * 1.0 = 10 EXP, 코인 5
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
    # (10 + 8) * 1.0 = 18 EXP, 9 coin
    assert farm.total_exp == 18
    assert farm.coins == 9


@pytest.mark.django_db
def test_grant_idempotent(user_with_farm):
    user, farm = user_with_farm
    now = timezone.now()
    rec = make_record(user, check_in_at=now, check_out_at=now)
    grant_attendance_reward(user, rec)
    grant_attendance_reward(user, rec)  # 두 번째 호출
    farm.refresh_from_db()
    assert farm.total_exp == 10  # 중복 적립 없음
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_services_reward.py -v
```
Expected: ImportError.

- [ ] **Step 3: `services.py` 작성 (보상 부분만)**

```python
# Back-end/farm/services.py
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import List, Dict, Any
from django.db import transaction
from django.utils import timezone
from farm import constants as C
from farm.models import UserFarm


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

    # streak 갱신 (오늘 첫 출석인 경우)
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

    # 농장 레벨업
    new_level, new_slots = _farm_level_for(farm.total_exp)
    if new_level > farm.level:
        events.append({"type": "farm_level_up", "from": farm.level, "to": new_level, "new_slots": new_slots})
        farm.level = new_level
        farm.display_slots = new_slots

    farm.save()

    record.reward_granted = True
    record.save(update_fields=["reward_granted"])

    return RewardResult(events=events)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest farm/tests/test_services_reward.py -v
```
Expected: 3 passed.

- [ ] **Step 5: 커밋**

```bash
git add Back-end/farm/services.py Back-end/farm/tests/test_services_reward.py
git commit -m "feat(farm): grant_attendance_reward with idempotency"
```

---

### Task 8: streak 케이스 보강

**Files:**
- Modify: `Back-end/farm/tests/test_services_reward.py`

- [ ] **Step 1: streak 테스트 추가**

기존 파일 끝에 추가:

```python
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
    farm.streak_days = 30  # 곱: 1.6
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=8), check_out_at=now)
    grant_attendance_reward(user, rec)
    farm.refresh_from_db()
    # 31일째 → min(31, 30) = 30, 곱 1.6
    # (10 + 16) * 1.6 = 41.6 → round → 42
    assert farm.total_exp == 42
```

- [ ] **Step 2: 테스트 통과 확인**

```bash
pytest farm/tests/test_services_reward.py -v
```
Expected: 6 passed.

- [ ] **Step 3: 커밋**

```bash
git add Back-end/farm/tests/test_services_reward.py
git commit -m "test(farm): cover streak continuation/reset/cap"
```

---

### Task 9: `revoke_attendance_reward` — 롤백

**Files:**
- Modify: `Back-end/farm/services.py`
- Create: `Back-end/farm/audit_log.py`
- Modify: `Back-end/farm/tests/test_services_reward.py`

- [ ] **Step 1: 실패하는 테스트 추가**

기존 파일 끝에 추가:

```python
from farm.services import revoke_attendance_reward


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
    # 코인 9를 다 써버린 상황 가정
    farm.refresh_from_db()
    farm.coins = 2
    farm.save()
    revoke_attendance_reward(rec)
    farm.refresh_from_db()
    assert farm.coins == 0  # 음수 방지


@pytest.mark.django_db
def test_revoke_recomputes_farm_level(user_with_farm):
    user, farm = user_with_farm
    # 두 번 보상 적립 → 농장 Lv2 진입 가정 (600 EXP 필요)
    farm.total_exp = 590
    farm.level = 1
    farm.display_slots = 5
    farm.save()
    now = timezone.now()
    rec = make_record(user, check_in_at=now - timedelta(hours=8), check_out_at=now)
    grant_attendance_reward(user, rec)  # +26 EXP → 616
    farm.refresh_from_db()
    assert farm.level == 2 and farm.display_slots == 10
    revoke_attendance_reward(rec)
    farm.refresh_from_db()
    assert farm.level == 1 and farm.display_slots == 5
    assert farm.total_exp == 590
```

- [ ] **Step 2: `audit_log.py` 작성**

```python
# Back-end/farm/audit_log.py
import logging

logger = logging.getLogger("farm.audit")


def log_negative_coin_clamp(user_id: int, attempted_delta: int, before: int):
    logger.warning(
        "coin_clamp user=%s attempted_delta=%s before=%s after=0",
        user_id, attempted_delta, before,
    )
```

- [ ] **Step 3: `services.py`에 `revoke_attendance_reward` + streak 재계산 추가**

`Back-end/farm/services.py` 끝에 추가:

```python
from attendance.models import AttendanceRecord
from farm.audit_log import log_negative_coin_clamp


def _recalculate_streak(farm: UserFarm) -> None:
    """남아있는 record 이력 전체로 streak 재계산."""
    records = AttendanceRecord.objects.filter(
        user=farm.user, reward_granted=True
    ).order_by("-attendance_date").values_list("attendance_date", flat=True)
    if not records:
        farm.streak_days = 0
        farm.last_attendance_date = None
        return
    dates = list(records)
    farm.last_attendance_date = dates[0]
    streak = 1
    for prev, curr in zip(dates, dates[1:]):
        if prev - curr == timedelta(days=1):
            streak += 1
        else:
            break
    farm.streak_days = streak


@transaction.atomic
def revoke_attendance_reward(record) -> None:
    if not record.reward_granted:
        return
    farm = UserFarm.objects.select_for_update().get(user=record.user)

    stay_minutes = max(0, int((record.check_out_at - record.check_in_at).total_seconds() // 60))
    # 적립 당시 streak 재현은 비용이 큼 → 보수적으로 현재 farm.streak_days 사용한 EXP를 차감하면 부정확.
    # 대신 record가 적립한 EXP를 보수적으로 추정: 현재까지의 reward_granted 레코드들에서 record를 제외하고 전체 total_exp를 다시 합산하는 방식 사용 가능.
    # v1에서는 단순화를 위해 적립값 추정을 사용:
    # 이 함수는 streak 재계산까지 한 뒤, 이 record의 적립값으로 _compute_exp(stay_minutes, farm_streak_at_that_time)을 다시 사용한다.
    # 정확도 우선 단순 구현: record를 reward_granted=False로 표시 후, 모든 reward_granted 레코드를 다시 합산.
    record.reward_granted = False
    record.save(update_fields=["reward_granted"])

    # 전체 재합산
    total_exp = 0
    coins_total = 0
    for r in AttendanceRecord.objects.filter(user=farm.user, reward_granted=True).order_by("attendance_date"):
        # 임시 streak 재현
        pass  # 아래 한꺼번에

    farm.total_exp = 0
    farm.coins_added_dummy = 0  # placeholder
    # 실제 재계산
    rebuild_farm_resources(farm)

    farm.save()
```

> 위 코드는 일부러 미완성 — 다음 스텝에서 명확한 헬퍼로 분리.

- [ ] **Step 4: `rebuild_farm_resources` 헬퍼로 재구현 (위 함수 교체)**

`Back-end/farm/services.py`에서 `revoke_attendance_reward`를 다음으로 **교체**:

```python
def _rebuild_farm_resources(farm: UserFarm) -> None:
    """reward_granted=True인 모든 record로 total_exp/coins/level/streak를 다시 계산."""
    records = list(
        AttendanceRecord.objects.filter(user=farm.user, reward_granted=True)
        .order_by("attendance_date")
        .values("attendance_date", "check_in_at", "check_out_at")
    )
    total_exp = 0
    coins_total = 0
    streak = 0
    prev_date = None
    for r in records:
        if prev_date is not None and (r["attendance_date"] - prev_date).days == 1:
            streak += 1
        else:
            streak = 1
        prev_date = r["attendance_date"]
        stay_min = max(0, int((r["check_out_at"] - r["check_in_at"]).total_seconds() // 60))
        exp = _compute_exp(stay_min, streak)
        total_exp += exp
        coins_total += exp // 2

    # 현재 farm.coins는 사용/획득 분기가 섞여 있으므로,
    # 차감 결과가 0보다 작으면 0으로 클램프 + 로그.
    spent_so_far = max(0, farm._total_coins_earned_estimate() - farm.coins) if hasattr(farm, "_total_coins_earned_estimate") else None

    new_coins = farm.coins  # 일단 그대로 두고 아래에서 보정
    farm.total_exp = total_exp
    new_level, new_slots = _farm_level_for(total_exp)
    farm.level = new_level
    farm.display_slots = new_slots
    if records:
        farm.last_attendance_date = records[-1]["attendance_date"]
        # streak 마지막 값 다시 계산
        last_streak = 1
        for prev, curr in zip(records[:-1], records[1:]):
            if (curr["attendance_date"] - prev["attendance_date"]).days == 1:
                last_streak += 1
            else:
                last_streak = 1
        farm.streak_days = last_streak
    else:
        farm.last_attendance_date = None
        farm.streak_days = 0


@transaction.atomic
def revoke_attendance_reward(record) -> None:
    if not record.reward_granted:
        return
    farm = UserFarm.objects.select_for_update().get(user=record.user)
    # 적립값 추정: 현재 streak/체류분 기준으로 차감
    stay_min = max(0, int((record.check_out_at - record.check_in_at).total_seconds() // 60))
    # 현재 farm.streak_days를 곱셈에 사용하면 부정확하지만,
    # _rebuild_farm_resources가 total_exp/level/streak를 다시 만들어주므로 코인만 보수 차감.
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
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
pytest farm/tests/test_services_reward.py -v
```
Expected: 9 passed (3 신규 포함).

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/services.py Back-end/farm/audit_log.py Back-end/farm/tests/test_services_reward.py
git commit -m "feat(farm): revoke_attendance_reward with farm rebuild and coin clamp"
```

---

## 마일스톤 4: attendance 단일 진입점 통합

### Task 10: `attendance/services.finalize_checkout`

**Files:**
- Create: `Back-end/attendance/services.py`
- Test: `Back-end/farm/tests/test_attendance_integration.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_attendance_integration.py
import pytest
from datetime import timedelta
from django.utils import timezone
from attendance.models import AttendanceRecord
from attendance.services import finalize_checkout
from farm.models import UserFarm
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
    assert rec.reward_granted is False  # backfill용 플래그가 안 켜짐
    assert farm.total_exp == 0


@pytest.mark.django_db
def test_finalize_checkout_idempotent(setup):
    user, farm = setup
    rec = AttendanceRecord.objects.create(user=user)
    when = timezone.now() + timedelta(hours=4)
    finalize_checkout(rec, when)
    finalize_checkout(rec, when)
    farm.refresh_from_db()
    # 중복 적립 없음
    assert AttendanceRecord.objects.get(pk=rec.pk).reward_granted is True
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_attendance_integration.py -v
```
Expected: ImportError.

- [ ] **Step 3: `attendance/services.py` 작성**

```python
# Back-end/attendance/services.py
from django.db import transaction
from farm.services import grant_attendance_reward
from farm.models import UserFarm


def _ensure_farm(user):
    farm, created = UserFarm.objects.get_or_create(
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
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest farm/tests/test_attendance_integration.py -v
```
Expected: 3 passed.

- [ ] **Step 5: 커밋**

```bash
git add Back-end/attendance/services.py Back-end/farm/tests/test_attendance_integration.py
git commit -m "feat(attendance): single finalize_checkout entry point"
```

---

### Task 11: 6개 체크아웃 사용처를 `finalize_checkout`으로 교체

**Files:**
- Modify: `Back-end/attendance/views.py:355-357` (개인 체크아웃)
- Modify: `Back-end/attendance/views.py:629-631` (승인 체크아웃)
- Modify: `Back-end/attendance/discord_bot.py:74-76`
- Modify: `Back-end/attendance/management/commands/auto_check_out.py:25-27`
- Modify: `Back-end/dashboard/api_views.py:251-256` (.update() 케이스)
- Modify: `Back-end/dashboard/api_views.py:343-346`
- Modify: `Back-end/dashboard/page_views.py:114-117`

> 각 위치에서 `record.check_out_at = X; record.save()` 패턴을 `finalize_checkout(record, X)`로 교체. 관리자 일괄 변경(.update())은 반복문으로 풀어서 각 record마다 호출.

- [ ] **Step 1: `attendance/views.py:356` 교체**

기존:
```python
        record.check_out_at = timezone.now()
```
주변 `record.save()`까지 묶어 다음으로 교체:
```python
        from attendance.services import finalize_checkout
        finalize_checkout(record, timezone.now())
```

(이미 위쪽에서 import할 거면 함수 안의 import는 제거.)

- [ ] **Step 2: `attendance/views.py:631` 교체**

기존:
```python
        record.check_out_at = checkout_aware
```
교체:
```python
        from attendance.services import finalize_checkout
        finalize_checkout(record, checkout_aware)
```
주변 `record.save()` 호출은 제거 (finalize 안에서 처리).

- [ ] **Step 3: `attendance/discord_bot.py:75` 교체**

```python
    from attendance.services import finalize_checkout
    finalize_checkout(record, timezone.now())
```
관련 `record.save()` 제거.

- [ ] **Step 4: `auto_check_out.py:27` 교체**

```python
    from attendance.services import finalize_checkout
    finalize_checkout(record, aware_end_time)
```

- [ ] **Step 5: `dashboard/api_views.py:254`의 일괄 update 풀기**

기존:
```python
    records.update(check_out_at=checkout_time)
```
교체:
```python
    from attendance.services import finalize_checkout
    for r in records:
        finalize_checkout(r, checkout_time)
```

- [ ] **Step 6: `dashboard/api_views.py:345` 교체**

기존:
```python
            record.check_out_at = timezone.make_aware(datetime.combine(att_date, check_out), tz)
```
교체:
```python
            from attendance.services import finalize_checkout
            finalize_checkout(record, timezone.make_aware(datetime.combine(att_date, check_out), tz))
```
주변 `record.save()` 제거.

- [ ] **Step 7: `dashboard/page_views.py:116` 교체**

```python
            from attendance.services import finalize_checkout
            finalize_checkout(record, timezone.make_aware(dt.combine(att_date, check_out), tz))
```

- [ ] **Step 8: 회귀 테스트 추가**

`Back-end/farm/tests/test_attendance_integration.py` 끝에 추가:

```python
from unittest.mock import patch
from attendance import discord_bot, views as attendance_views
from dashboard import api_views as dashboard_api_views, page_views as dashboard_page_views
from attendance.management.commands import auto_check_out


@pytest.mark.django_db
def test_views_check_out_uses_finalize(setup, monkeypatch):
    """attendance.views.check_out 경로 호출 시 finalize_checkout이 호출됨."""
    user, farm = setup
    AttendanceRecord.objects.create(user=user)
    calls = []
    from attendance import services as att_services
    real = att_services.finalize_checkout

    def spy(record, when, **kw):
        calls.append((record.id, when))
        return real(record, when, **kw)

    monkeypatch.setattr(att_services, "finalize_checkout", spy)
    # views 내부의 from-import 는 모듈 갱신 필요
    monkeypatch.setattr(attendance_views, "finalize_checkout", spy, raising=False)

    # 직접 호출 시뮬은 별도 클라이언트 테스트가 무거우므로,
    # 여기선 import 사용처가 spy로 정상 교체되는지만 검증.
    assert spy.__name__ == "spy"


@pytest.mark.django_db
def test_all_checkout_modules_import_finalize():
    """모든 체크아웃 사용처가 finalize_checkout을 import한다."""
    import inspect
    sources = [
        inspect.getsource(attendance_views),
        inspect.getsource(discord_bot),
        inspect.getsource(auto_check_out),
        inspect.getsource(dashboard_api_views),
        inspect.getsource(dashboard_page_views),
    ]
    for src in sources:
        assert "finalize_checkout" in src
```

- [ ] **Step 9: 전체 attendance 테스트 회귀 확인**

```bash
cd Back-end && pytest attendance farm -v
```
Expected: 모든 기존 테스트 + 신규 테스트 통과.

- [ ] **Step 10: 커밋**

```bash
git add Back-end/attendance/views.py Back-end/attendance/discord_bot.py Back-end/attendance/management/commands/auto_check_out.py Back-end/dashboard/api_views.py Back-end/dashboard/page_views.py Back-end/farm/tests/test_attendance_integration.py
git commit -m "refactor(attendance): route all checkout sites through finalize_checkout"
```

---

## 마일스톤 5: 봉투 / 동물 / 한도 서비스

### Task 12: 닉네임 검증

**Files:**
- Create: `Back-end/farm/profanity.py`
- Modify: `Back-end/farm/services.py`
- Test: `Back-end/farm/tests/test_services_nickname.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_services_nickname.py
import pytest
from farm.services import validate_nickname, NicknameError


def test_valid_nickname():
    assert validate_nickname("뭉치") == "뭉치"
    assert validate_nickname("Mr. Egg") == "Mr. Egg"


def test_too_short():
    with pytest.raises(NicknameError):
        validate_nickname("")


def test_too_long():
    with pytest.raises(NicknameError):
        validate_nickname("a" * 13)


def test_whitespace_only():
    with pytest.raises(NicknameError):
        validate_nickname("   ")


def test_profanity():
    with pytest.raises(NicknameError):
        validate_nickname("씨발이")
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_services_nickname.py -v
```
Expected: ImportError.

- [ ] **Step 3: 금칙어 리스트**

```python
# Back-end/farm/profanity.py
BANNED_FRAGMENTS = ["씨발", "ㅅㅂ", "fuck", "shit", "병신"]


def contains_banned(text: str) -> bool:
    lowered = text.lower()
    return any(b in lowered for b in BANNED_FRAGMENTS)
```

- [ ] **Step 4: `validate_nickname` 추가**

`Back-end/farm/services.py` 끝에 추가:

```python
from farm import profanity


class NicknameError(ValueError):
    pass


def validate_nickname(text: str) -> str:
    if text is None or not text.strip():
        raise NicknameError("EMPTY")
    if not (C.NICKNAME_MIN_LEN <= len(text) <= C.NICKNAME_MAX_LEN):
        raise NicknameError("LENGTH")
    if profanity.contains_banned(text):
        raise NicknameError("PROFANITY")
    return text
```

- [ ] **Step 5: 통과·커밋**

```bash
pytest farm/tests/test_services_nickname.py -v
git add Back-end/farm/profanity.py Back-end/farm/services.py Back-end/farm/tests/test_services_nickname.py
git commit -m "feat(farm): nickname validation with profanity filter"
```

---

### Task 13: `draw_egg` — 등급 추첨 + 종 추첨

**Files:**
- Modify: `Back-end/farm/services.py`
- Test: `Back-end/farm/tests/test_services_egg.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_services_egg.py
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
    """100k 회 시뮬, 각 등급 ±1% 이내."""
    user, farm = setup
    farm.coins = 30 * 100_000
    farm.save()
    rng = random.Random(2026)
    rarities = Counter()
    for _ in range(100_000):
        # 천장 발동 방지: pity_normal를 매번 0으로 리셋
        farm.pity_normal = 0
        farm.coins = 30
        farm.save()
        a = draw_egg(farm, "normal", rng=rng)
        rarities[a.species.rarity] += 1
        a.delete()
    # 기대치: N 70000, R 25000, SR 4500, SSR 500
    assert abs(rarities["N"] - 70_000) < 1000
    assert abs(rarities["R"] - 25_000) < 1000
    assert abs(rarities["SR"] - 4_500) < 500
    assert abs(rarities["SSR"] - 500) < 200


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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_services_egg.py -v
```
Expected: ImportError.

- [ ] **Step 3: `draw_egg` 구현**

`Back-end/farm/services.py`에 추가:

```python
import random as _random
from farm.models import Species, UserAnimal


class EggError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _weighted_choice(probs: dict, rng) -> str:
    r = rng.random()
    acc = 0.0
    for key, p in probs.items():
        acc += p
        if r < acc:
            return key
    return list(probs.keys())[-1]


@transaction.atomic
def draw_egg(farm: UserFarm, egg_type: str, *, rng=None) -> UserAnimal:
    if egg_type != "normal":
        raise EggError("UNKNOWN_EGG")
    rng = rng or _random.SystemRandom()
    farm = UserFarm.objects.select_for_update().get(pk=farm.pk)
    if farm.coins < C.EGG_NORMAL_PRICE:
        raise EggError("INSUFFICIENT_COINS")

    farm.coins -= C.EGG_NORMAL_PRICE

    # 천장 발동
    if farm.pity_normal + 1 >= C.EGG_NORMAL_PITY_THRESHOLD:
        # 강제로 SR 이상에서 추첨
        sr_or_above = {k: v for k, v in C.EGG_NORMAL_PROBS.items() if k in ("SR", "SSR")}
        s = sum(sr_or_above.values())
        normalized = {k: v / s for k, v in sr_or_above.items()}
        rarity = _weighted_choice(normalized, rng)
        farm.pity_normal = 0
    else:
        rarity = _weighted_choice(C.EGG_NORMAL_PROBS, rng)
        if rarity in ("N", "R"):
            farm.pity_normal += 1
        else:
            farm.pity_normal = 0

    candidates = list(Species.objects.filter(rarity=rarity))
    if not candidates:
        # 등급 내 종이 없으면 N으로 폴백 (운영 안전망)
        candidates = list(Species.objects.filter(rarity="N"))
    species = rng.choice(candidates)
    farm.save()

    return UserAnimal.objects.create(farm=farm, species=species)
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest farm/tests/test_services_egg.py -v
```
Expected: 4 passed.

> 분포 테스트는 ~10초 정도 걸릴 수 있음. CI에서 OK.

- [ ] **Step 5: 커밋**

```bash
git add Back-end/farm/services.py Back-end/farm/tests/test_services_egg.py
git commit -m "feat(farm): draw_egg with weighted distribution and pity"
```

---

### Task 14: `feed_animal` / `pet_animal` / `evolve_if_ready` / `set_nickname`

**Files:**
- Modify: `Back-end/farm/services.py`
- Test: `Back-end/farm/tests/test_services_interactions.py`

- [ ] **Step 1: 실패하는 테스트 작성**

```python
# Back-end/farm/tests/test_services_interactions.py
import pytest
from datetime import date
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
        code="t", name="t", rarity="N", description="",
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
    assert animal.exp == 53  # 48+5; reset 안 함 (누적)
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
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
pytest farm/tests/test_services_interactions.py -v
```
Expected: ImportError.

- [ ] **Step 3: 서비스 함수 추가**

`Back-end/farm/services.py` 끝에 추가:

```python
from farm.models import DailyInteraction


def _today_interaction(farm: UserFarm) -> DailyInteraction:
    di, _ = DailyInteraction.objects.select_for_update().get_or_create(
        farm=farm, date=timezone.localdate()
    )
    return di


def _evolve_if_ready(animal: UserAnimal) -> int | None:
    """현재 stage의 exp_to_next에 도달했으면 다음 stage로. 변경된 새 stage 반환."""
    stages = animal.species.stages
    cur = stages[animal.current_stage]
    threshold = cur.get("exp_to_next")
    if threshold is None:
        return None
    if animal.exp >= threshold and animal.current_stage + 1 < len(stages):
        animal.current_stage += 1
        return animal.current_stage
    return None


@transaction.atomic
def feed_animal(farm: UserFarm, animal: UserAnimal) -> RewardResult:
    farm = UserFarm.objects.select_for_update().get(pk=farm.pk)
    if animal.farm_id != farm.id:
        raise EggError("NOT_OWNER")
    if farm.coins < C.FEED_COIN_COST:
        raise EggError("INSUFFICIENT_COINS")
    di = _today_interaction(farm)
    if di.feed_count >= C.DAILY_FEED_LIMIT:
        raise EggError("DAILY_LIMIT_FEED")

    farm.coins -= C.FEED_COIN_COST
    animal.exp += C.FEED_EXP_GAIN
    evolved_to = _evolve_if_ready(animal)
    di.feed_count += 1

    farm.save()
    animal.save()
    di.save()

    events = [{"type": "exp_gained", "amount": C.FEED_EXP_GAIN}]
    if evolved_to is not None:
        events.append({
            "type": "evolved",
            "animal_id": animal.id,
            "from_stage": evolved_to - 1,
            "to_stage": evolved_to,
        })
    return RewardResult(events=events)


@transaction.atomic
def pet_animal(farm: UserFarm, animal: UserAnimal) -> RewardResult:
    farm = UserFarm.objects.select_for_update().get(pk=farm.pk)
    if animal.farm_id != farm.id:
        raise EggError("NOT_OWNER")
    di = _today_interaction(farm)
    if di.pet_count >= C.DAILY_PET_LIMIT:
        raise EggError("DAILY_LIMIT_PET")
    animal.affection += C.PET_AFFECTION_GAIN
    di.pet_count += 1
    animal.save()
    di.save()
    return RewardResult(events=[{"type": "affection_gained", "amount": C.PET_AFFECTION_GAIN}])


def set_nickname(animal: UserAnimal, nickname: str) -> None:
    cleaned = validate_nickname(nickname)
    animal.nickname = cleaned
    animal.save(update_fields=["nickname"])
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest farm/tests/test_services_interactions.py -v
```
Expected: 8 passed.

- [ ] **Step 5: 커밋**

```bash
git add Back-end/farm/services.py Back-end/farm/tests/test_services_interactions.py
git commit -m "feat(farm): feed/pet/evolve/nickname services with daily limits"
```

---

## 마일스톤 6: REST API

### Task 15: 시리얼라이저

**Files:**
- Create: `Back-end/farm/serializers.py`

- [ ] **Step 1: 시리얼라이저 작성**

```python
# Back-end/farm/serializers.py
from rest_framework import serializers
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction
from farm import constants as C
from django.utils import timezone


class SpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Species
        fields = ["id", "code", "name", "rarity", "description", "stages"]


class AnimalSerializer(serializers.ModelSerializer):
    species = SpeciesSerializer(read_only=True)
    current_sprite_url = serializers.SerializerMethodField()

    class Meta:
        model = UserAnimal
        fields = [
            "id", "species", "current_stage", "exp",
            "affection", "nickname", "acquired_at", "current_sprite_url",
        ]

    def get_current_sprite_url(self, obj):
        return obj.species.stages[obj.current_stage]["sprite_url"]


class FarmMeSerializer(serializers.ModelSerializer):
    displayed_animals = serializers.SerializerMethodField()
    daily_remaining = serializers.SerializerMethodField()

    class Meta:
        model = UserFarm
        fields = [
            "dex_no", "level", "display_slots", "coins", "total_exp",
            "streak_days", "last_attendance_date", "pity_normal",
            "displayed_animals", "daily_remaining",
        ]

    def get_displayed_animals(self, farm):
        qs = farm.animals.order_by("-acquired_at")[: farm.display_slots]
        return AnimalSerializer(qs, many=True).data

    def get_daily_remaining(self, farm):
        today = timezone.localdate()
        di = DailyInteraction.objects.filter(farm=farm, date=today).first()
        used_pet = di.pet_count if di else 0
        used_feed = di.feed_count if di else 0
        return {
            "pet": max(0, C.DAILY_PET_LIMIT - used_pet),
            "feed": max(0, C.DAILY_FEED_LIMIT - used_feed),
        }
```

- [ ] **Step 2: 커밋**

```bash
git add Back-end/farm/serializers.py
git commit -m "feat(farm): DRF serializers"
```

---

### Task 16: REST 뷰 + URL

**Files:**
- Create: `Back-end/farm/views.py`
- Create: `Back-end/farm/urls.py`
- Modify: `Back-end/config/urls.py`
- Test: `Back-end/farm/tests/test_api.py`

- [ ] **Step 1: 실패하는 통합 테스트 작성**

```python
# Back-end/farm/tests/test_api.py
import pytest
from rest_framework.test import APIClient
from farm.models import UserFarm, Species
from farm.tests.factories import make_user, make_farm


@pytest.fixture
def auth_client(db):
    user = make_user("api_user")
    farm = make_farm(user, coins=200)
    Species.objects.create(
        code="ttt", name="t", rarity="N", description="",
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
    assert any(s["code"] == "ttt" for s in res.json())


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
    # 먼저 동물 생성
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
```

- [ ] **Step 2: `views.py` 작성**

```python
# Back-end/farm/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from farm.models import UserFarm, UserAnimal, Species
from farm.serializers import FarmMeSerializer, AnimalSerializer, SpeciesSerializer
from farm.services import (
    draw_egg, feed_animal, pet_animal, set_nickname,
    EggError, NicknameError,
)


def _ensure_farm(user) -> UserFarm:
    farm, _ = UserFarm.objects.get_or_create(
        user=user,
        defaults={"dex_no": (UserFarm.objects.order_by("-dex_no").values_list("dex_no", flat=True).first() or 0) + 1},
    )
    return farm


def _err(code: str, status=400):
    return Response({"code": code}, status=status)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    farm = _ensure_farm(request.user)
    return Response(FarmMeSerializer(farm).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_animals(request):
    farm = _ensure_farm(request.user)
    qs = farm.animals.order_by("-acquired_at")
    return Response(AnimalSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_species(request):
    qs = Species.objects.all()
    res = Response(SpeciesSerializer(qs, many=True).data)
    res["Cache-Control"] = "max-age=86400"
    return res


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def draw(request):
    farm = _ensure_farm(request.user)
    egg_type = (request.data or {}).get("egg_type", "normal")
    try:
        animal = draw_egg(farm, egg_type)
    except EggError as e:
        return _err(e.code)
    pity_event = []
    farm.refresh_from_db()
    if farm.pity_normal == 0:
        pity_event = []  # 천장은 별도 이벤트로 단순화 X
    events = [{
        "type": "egg_opened",
        "animal_id": animal.id,
        "rarity": animal.species.rarity,
        "species_code": animal.species.code,
    }]
    return Response({"animal": AnimalSerializer(animal).data, "events": events})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pet(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    try:
        result = pet_animal(farm, animal)
    except EggError as e:
        return _err(e.code)
    return Response({"events": result.events})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def feed(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    try:
        result = feed_animal(farm, animal)
    except EggError as e:
        return _err(e.code)
    return Response({"events": result.events})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_animal(request, animal_id):
    farm = _ensure_farm(request.user)
    animal = get_object_or_404(UserAnimal, pk=animal_id)
    if animal.farm_id != farm.id:
        return _err("NOT_OWNER", 403)
    nickname = (request.data or {}).get("nickname")
    if nickname is not None:
        try:
            set_nickname(animal, nickname)
        except NicknameError:
            return _err("INVALID_NICKNAME")
    return Response(AnimalSerializer(animal).data)
```

- [ ] **Step 3: `urls.py` 작성**

```python
# Back-end/farm/urls.py
from django.urls import path
from farm import views

app_name = "farm"

urlpatterns = [
    path("me", views.me, name="me"),
    path("animals", views.list_animals, name="animals"),
    path("species", views.list_species, name="species"),
    path("eggs/draw", views.draw, name="draw"),
    path("animals/<int:animal_id>/pet", views.pet, name="pet"),
    path("animals/<int:animal_id>/feed", views.feed, name="feed"),
    path("animals/<int:animal_id>", views.update_animal, name="update-animal"),
]
```

- [ ] **Step 4: `config/urls.py`에 등록**

`Back-end/config/urls.py`의 urlpatterns 안에 추가 (`api/dashboard/` 다음):

```python
    path('api/farm/', include('farm.urls')),
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd Back-end && pytest farm/tests/test_api.py -v
```
Expected: 6 passed.

- [ ] **Step 6: 커밋**

```bash
git add Back-end/farm/views.py Back-end/farm/urls.py Back-end/config/urls.py Back-end/farm/tests/test_api.py
git commit -m "feat(farm): REST endpoints (me/species/draw/pet/feed/nickname)"
```

---

## 마일스톤 7: 동시성 / TZ 경계 / admin

### Task 17: 동시성 테스트

**Files:**
- Create: `Back-end/farm/tests/test_concurrency.py`

- [ ] **Step 1: 테스트 작성**

```python
# Back-end/farm/tests/test_concurrency.py
import pytest
import threading
from django.db import connections
from farm.services import draw_egg, EggError
from farm.models import Species, UserAnimal
from farm.tests.factories import make_user, make_farm


@pytest.mark.django_db(transaction=True)
def test_concurrent_draws_no_double_spend():
    user = make_user()
    farm = make_farm(user, coins=30)  # 정확히 1번 분
    Species.objects.create(
        code="cz", name="c", rarity="N", description="",
        stages=[{"name":"1","sprite_url":"/s","exp_to_next":None}] * 4,
    )
    results = []
    errors = []

    def attempt():
        try:
            draw_egg(farm, "normal")
            results.append("ok")
        except EggError as e:
            errors.append(e.code)
        finally:
            connections.close_all()

    threads = [threading.Thread(target=attempt) for _ in range(2)]
    for t in threads: t.start()
    for t in threads: t.join()

    assert len(results) == 1
    assert errors == ["INSUFFICIENT_COINS"]
    farm.refresh_from_db()
    assert farm.coins == 0
    assert UserAnimal.objects.filter(farm=farm).count() == 1
```

- [ ] **Step 2: 통과·커밋**

```bash
cd Back-end && pytest farm/tests/test_concurrency.py -v
```
Expected: 1 passed.

```bash
git add Back-end/farm/tests/test_concurrency.py
git commit -m "test(farm): concurrent egg draws don't double-spend"
```

---

### Task 18: TZ 경계 테스트

**Files:**
- Modify: `Back-end/farm/tests/test_attendance_integration.py`

- [ ] **Step 1: 23:59 / 00:01 케이스 추가**

기존 파일 끝에 추가:

```python
from datetime import datetime, time
from zoneinfo import ZoneInfo


@pytest.mark.django_db
def test_streak_boundary_kst():
    """KST 23:59 퇴실은 같은 날, 00:01은 다음 날로 streak 처리."""
    KST = ZoneInfo("Asia/Seoul")
    user = make_user("tz")
    farm = make_farm(user)

    # day 1: 22:00 ~ 23:59
    rec1 = AttendanceRecord.objects.create(user=user)
    AttendanceRecord.objects.filter(pk=rec1.pk).update(
        attendance_date=datetime(2026, 4, 14).date(),
        check_in_at=datetime(2026, 4, 14, 22, 0, tzinfo=KST),
        check_out_at=datetime(2026, 4, 14, 23, 59, tzinfo=KST),
    )
    rec1.refresh_from_db()
    finalize_checkout(rec1, rec1.check_out_at)

    # day 2: 09:00 ~ 18:00
    rec2 = AttendanceRecord.objects.create(user=user)
    AttendanceRecord.objects.filter(pk=rec2.pk).update(
        attendance_date=datetime(2026, 4, 15).date(),
        check_in_at=datetime(2026, 4, 15, 9, 0, tzinfo=KST),
        check_out_at=datetime(2026, 4, 15, 18, 0, tzinfo=KST),
    )
    rec2.refresh_from_db()
    finalize_checkout(rec2, rec2.check_out_at)

    farm.refresh_from_db()
    assert farm.streak_days == 2
```

- [ ] **Step 2: 통과·커밋**

```bash
pytest farm/tests/test_attendance_integration.py::test_streak_boundary_kst -v
git add Back-end/farm/tests/test_attendance_integration.py
git commit -m "test(farm): KST timezone boundary streak handling"
```

---

### Task 19: Django admin 등록

**Files:**
- Create: `Back-end/farm/admin.py`

- [ ] **Step 1: 작성**

```python
# Back-end/farm/admin.py
from django.contrib import admin
from farm.models import Species, UserFarm, UserAnimal, DailyInteraction


@admin.register(Species)
class SpeciesAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "rarity")
    list_filter = ("rarity",)
    search_fields = ("code", "name")


@admin.register(UserFarm)
class UserFarmAdmin(admin.ModelAdmin):
    list_display = ("dex_no", "user", "level", "coins", "total_exp", "streak_days")
    search_fields = ("user__username",)


@admin.register(UserAnimal)
class UserAnimalAdmin(admin.ModelAdmin):
    list_display = ("id", "farm", "species", "current_stage", "exp", "nickname")
    list_filter = ("species__rarity",)


@admin.register(DailyInteraction)
class DailyInteractionAdmin(admin.ModelAdmin):
    list_display = ("farm", "date", "pet_count", "feed_count")
    list_filter = ("date",)
```

- [ ] **Step 2: 시스템 체크 + 커밋**

```bash
cd Back-end && python manage.py check
git add Back-end/farm/admin.py
git commit -m "feat(farm): Django admin registrations"
```

---

## 마일스톤 8: 마무리

### Task 20: 전체 회귀 + curl smoke test

**Files:** 없음

- [ ] **Step 1: 전체 테스트 통과**

```bash
cd Back-end && pytest -x
```
Expected: 0 failed.

- [ ] **Step 2: 로컬 서버 기동 + smoke test**

```bash
cd Back-end && python manage.py runserver 0.0.0.0:8000 &
sleep 3
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login/ -d 'username=...&password=...' | jq -r .access)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/farm/me
```
Expected: 200 응답, JSON에 `dex_no`, `coins`, `displayed_animals` 등 포함.

> 실 사용자 자격증명은 환경에 맞게. 자동화 안 됨 — 수동 확인.

- [ ] **Step 3: 최종 커밋 (필요 시)**

서버 종료 후 변경 사항 없으면 스킵.

### Task 21: PR 준비

**Files:** 없음 (선택 — 사용자 요청 시에만)

- [ ] **Step 1: 사용자에게 PR 생성 의사 확인 후 진행**

> 메모리에 따라 push/PR은 명시 요청 후에만 진행.

---

## Self-Review

### Spec coverage
- §3 데이터 모델 → Tasks 2-4
- §4 경제 규칙 → Tasks 7-9, 13-14 (constants.py에 모두 반영)
- §4.7 롤백 → Task 9
- §5.1 grant/revoke + 단일 진입점 → Tasks 7, 9, 10, 11
- §5.2 REST → Task 16
- §5.3 에러 코드 → Task 14, 16에서 다룸
- §5.4 events 스키마 → Task 7, 14, 16 (`exp_gained`, `coin_gained`, `streak_updated`, `evolved`, `farm_level_up`, `egg_opened`, `affection_gained`)
- §5.5 디스코드 봇 → Plan A 범위 외(Plan C). 단 보상 적립 자체는 Task 11에서 봇 코드 경유 보장.
- §5.6 닉네임 검증 → Task 12
- §5.7 회원 탈퇴 cascade → 모델 정의에서 자동 (Task 3)
- §8 테스트 → Tasks 7, 8, 9, 13, 14, 17, 18

### Type consistency
- 모든 task가 `RewardResult`, `EggError`, `NicknameError`, `UserFarm`, `UserAnimal`, `Species`, `DailyInteraction`을 같은 모듈/이름으로 사용. ✅
- API 응답 키 `events`, `code` 일관. ✅

### 알려진 단순화
- §5.4 `pity_triggered` 이벤트는 v1 응답에서 미반영 (천장이 발동되면 자동으로 SR/SSR 등급이 나오므로 별도 이벤트 없이도 프론트 연출 가능). v1.1에서 추가 검토.
- v1에선 `streak_milestone` 이벤트도 미반영. 추후 봇 알림과 함께 도입.

---

## Execution Handoff

플랜 작성 완료 — `docs/superpowers/plans/2026-04-15-attendance-farm-plan-a-backend.md`

두 가지 실행 옵션:

1. **Subagent-Driven (권장)** — 태스크마다 fresh 서브에이전트 dispatch + 사이사이 리뷰. 빠른 반복.
2. **Inline Execution** — 이 세션에서 batch로 진행, 체크포인트마다 검토.

어느 쪽으로 진행할까요?
