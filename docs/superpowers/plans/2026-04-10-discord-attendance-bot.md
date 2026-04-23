# 디스코드 출결 봇 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디스코드 봇으로 출결/퇴실/결석을 처리하고, 정해진 시간에 알림을 전송하는 시스템 구축

**Architecture:** Django management command로 discord.py 봇을 실행. 기존 Django ORM을 통해 AttendanceRecord, User, Timetable, AttendanceTimeSetting에 직접 접근. discord.ext.tasks로 스케줄링 처리.

**Tech Stack:** Python, Django 4.2, discord.py, 기존 MySQL DB

---

## 파일 구조

| 액션 | 파일 | 역할 |
|------|------|------|
| 수정 | `Back-end/requirements.txt` | discord.py 의존성 추가 |
| 수정 | `Back-end/config/settings.py` | DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID 환경변수 |
| 수정 | `Back-end/users/models.py` | User 모델에 discord_id 필드 추가 |
| 생성 | `Back-end/users/migrations/XXXX_add_discord_id.py` | 마이그레이션 (자동생성) |
| 생성 | `Back-end/attendance/discord_bot.py` | 봇 핵심 로직 (명령어 + 스케줄러) |
| 생성 | `Back-end/attendance/management/commands/run_discord_bot.py` | management command 진입점 |
| 수정 | `Back-end/docker-compose.yml` 또는 루트 `docker-compose.yml` | 봇 서비스 추가 |

---

### Task 1: 의존성 및 환경 설정

**Files:**
- Modify: `Back-end/requirements.txt`
- Modify: `Back-end/config/settings.py`

- [ ] **Step 1: requirements.txt에 discord.py 추가**

`Back-end/requirements.txt` 끝에 추가:

```
discord.py==2.5.2
```

- [ ] **Step 2: settings.py에 환경변수 추가**

`Back-end/config/settings.py` 파일 하단, 기존 환경변수 설정 근처에 추가:

```python
# Discord Bot
DISCORD_BOT_TOKEN = os.environ.get('DISCORD_BOT_TOKEN', '')
DISCORD_CHANNEL_ID = os.environ.get('DISCORD_CHANNEL_ID', '')
```

- [ ] **Step 3: .env에 토큰 추가**

`Back-end/.env` 또는 루트 `.env`에 추가 (실제 값은 사용자가 입력):

```
DISCORD_BOT_TOKEN=<사용자가 제공한 토큰>
DISCORD_CHANNEL_ID=<출결 채널 ID>
```

- [ ] **Step 4: 의존성 설치 확인**

Run: `cd /Users/bobs/Desktop/bobs_project/team_lab/Back-end && pip install discord.py==2.5.2`
Expected: 정상 설치

- [ ] **Step 5: Commit**

```bash
git add Back-end/requirements.txt Back-end/config/settings.py
git commit -m "chore: discord.py 의존성 및 환경변수 추가"
```

---

### Task 2: User 모델에 discord_id 필드 추가

**Files:**
- Modify: `Back-end/users/models.py:71` (expo_push_token 근처)
- Create: 마이그레이션 (자동생성)

- [ ] **Step 1: User 모델에 discord_id 필드 추가**

`Back-end/users/models.py`의 `expo_push_token` 필드 아래에 추가:

```python
    discord_id = models.CharField("디스코드 ID", max_length=20, blank=True, default="")
```

- [ ] **Step 2: 마이그레이션 생성**

Run: `cd /Users/bobs/Desktop/bobs_project/team_lab/Back-end && python manage.py makemigrations users`
Expected: `Migrations for 'users': users/migrations/XXXX_add_discord_id.py`

- [ ] **Step 3: 마이그레이션 적용**

Run: `cd /Users/bobs/Desktop/bobs_project/team_lab/Back-end && python manage.py migrate users`
Expected: `Applying users.XXXX_add_discord_id... OK`

- [ ] **Step 4: Commit**

```bash
git add Back-end/users/models.py Back-end/users/migrations/
git commit -m "feat: User 모델에 discord_id 필드 추가"
```

---

### Task 3: 디스코드 봇 핵심 로직 — 명령어 처리

**Files:**
- Create: `Back-end/attendance/discord_bot.py`

- [ ] **Step 1: discord_bot.py 생성 — 봇 클래스 및 명령어 처리**

`Back-end/attendance/discord_bot.py` 생성:

```python
import discord
from discord.ext import commands, tasks
from django.conf import settings
from django.utils import timezone
from datetime import time as dtime, timedelta

from attendance.models import AttendanceRecord, AttendanceTimeSetting
from users.models import User
from timetable.models import Timetable


# 명령어 매핑
CHECK_IN_CMDS = {'ㅊㅅ', '출석', 'ㅊㄱ'}
CHECK_OUT_CMDS = {'ㅌㅅ', '퇴실', 'ㅌㄱ'}
ABSENT_CMDS = {'ㄲㅈ', '꺼져', 'ㄱㅈ'}


def _get_time_setting():
    return AttendanceTimeSetting.objects.first()


def _get_user_by_discord_id(discord_id: str):
    """discord_id로 매핑된 User 반환. 없으면 None."""
    try:
        return User.objects.get(discord_id=str(discord_id))
    except User.DoesNotExist:
        return None


def _do_check_in(user):
    """출석 처리. (성공 메시지, 에러 메시지) 중 하나 반환."""
    today = timezone.localdate()
    now_time = timezone.localtime().time()
    time_setting = _get_time_setting()

    status = "present"
    if time_setting and now_time > time_setting.check_in_deadline:
        status = "late"

    record, created = AttendanceRecord.objects.get_or_create(
        user=user,
        attendance_date=today,
        defaults={"status": status},
    )

    if not created:
        return None, "이미 출결됐어요 그만해"

    return "check_in", None


def _do_check_out(user):
    """퇴실 처리."""
    today = timezone.localdate()
    now_time = timezone.localtime().time()

    try:
        record = AttendanceRecord.objects.get(user=user, attendance_date=today)
    except AttendanceRecord.DoesNotExist:
        return None, "출석 기록이 없어요. 먼저 ㅊㅅ 해주세요."

    if record.check_out_at:
        return None, "이미 퇴실했어요 그만해"

    time_setting = _get_time_setting()
    if time_setting and now_time < time_setting.check_out_minimum:
        if record.status == "present":
            record.status = "leave"

    record.check_out_at = timezone.now()
    record.save()
    return "check_out", None


def _do_absent(user):
    """결석 처리."""
    today = timezone.localdate()

    record, created = AttendanceRecord.objects.get_or_create(
        user=user,
        attendance_date=today,
        defaults={"status": "absent"},
    )

    if not created:
        return None, "이미 처리됐어요 그만해"

    return "absent", None


class AttendanceBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)
        self.attendance_channel_id = int(settings.DISCORD_CHANNEL_ID)

    async def setup_hook(self):
        self.check_in_reminder.start()
        self.check_in_nag.start()
        self.check_out_reminder.start()
        self.b_class_thursday_reminder.start()
        self.b_class_thursday_nag.start()

    async def on_message(self, message):
        # 봇 자신의 메시지 무시
        if message.author.bot:
            return

        # 지정 채널에서만 동작
        if message.channel.id != self.attendance_channel_id:
            return

        content = message.content.strip()

        # 명령어 판별
        if content in CHECK_IN_CMDS:
            await self._handle_command(message, _do_check_in)
        elif content in CHECK_OUT_CMDS:
            await self._handle_command(message, _do_check_out)
        elif content in ABSENT_CMDS:
            await self._handle_command(message, _do_absent)

    async def _handle_command(self, message, handler):
        user = _get_user_by_discord_id(str(message.author.id))
        if not user:
            return  # 매핑되지 않은 유저는 무시

        success, error_msg = handler(user)
        if error_msg:
            await message.channel.send(f"{message.author.mention} {error_msg}")
        else:
            await message.add_reaction("✅")

    # ── 스케줄러: A반 기본 ──

    @tasks.loop(time=dtime(hour=10, minute=0, second=0))
    async def check_in_reminder(self):
        """10:00 전체 출결 알림"""
        # 목요일 B반은 별도 처리하므로 여기서는 전체 알림
        channel = self.get_channel(self.attendance_channel_id)
        if channel:
            await channel.send("@everyone 출결해주세요!")

    @tasks.loop(time=dtime(hour=10, minute=30, second=0))
    async def check_in_nag(self):
        """10:30 미출결자 리마인드"""
        await self._send_nag_reminder()

    @tasks.loop(time=dtime(hour=20, minute=0, second=0))
    async def check_out_reminder(self):
        """20:00 전체 퇴실 알림"""
        channel = self.get_channel(self.attendance_channel_id)
        if channel:
            await channel.send("@everyone 퇴실해주세요!")

    # ── 스케줄러: B반 목요일 ──

    @tasks.loop(time=dtime(hour=0, minute=1, second=0))
    async def b_class_thursday_reminder(self):
        """목요일 B반 첫 수업 시간 기준 출결 알림 (0:01에 스케줄 확인 후 wait)"""
        today = timezone.localdate()
        if today.weekday() != 3:  # 목요일 = 3
            return

        first_class = Timetable.objects.filter(
            class_group="B", weekday=3
        ).order_by("start_time").first()

        if not first_class:
            return

        # 첫 수업 시작 시간까지 대기
        now = timezone.localtime()
        target = timezone.make_aware(
            timezone.datetime.combine(today, first_class.start_time),
            timezone.get_current_timezone(),
        )
        wait_seconds = (target - now).total_seconds()
        if wait_seconds > 0:
            import asyncio
            await asyncio.sleep(wait_seconds)

        channel = self.get_channel(self.attendance_channel_id)
        if channel:
            b_users = User.objects.filter(class_group="B", discord_id__gt="")
            mentions = " ".join(
                f"<@{u.discord_id}>" for u in b_users
            )
            if mentions:
                await channel.send(f"{mentions} B반 출결해주세요!")

    @tasks.loop(time=dtime(hour=0, minute=2, second=0))
    async def b_class_thursday_nag(self):
        """목요일 B반 첫 수업 30분 후 미출결자 리마인드"""
        today = timezone.localdate()
        if today.weekday() != 3:
            return

        first_class = Timetable.objects.filter(
            class_group="B", weekday=3
        ).order_by("start_time").first()

        if not first_class:
            return

        now = timezone.localtime()
        nag_time = timezone.make_aware(
            timezone.datetime.combine(today, first_class.start_time),
            timezone.get_current_timezone(),
        ) + timedelta(minutes=30)

        wait_seconds = (nag_time - now).total_seconds()
        if wait_seconds > 0:
            import asyncio
            await asyncio.sleep(wait_seconds)

        await self._send_nag_reminder(class_group="B")

    # ── 공통 리마인드 ──

    async def _send_nag_reminder(self, class_group=None):
        """미출결자(웹/앱/디스코드 모두 포함)에게 리마인드 멘션."""
        today = timezone.localdate()
        channel = self.get_channel(self.attendance_channel_id)
        if not channel:
            return

        # 매핑된 유저 중 대상 필터
        qs = User.objects.filter(discord_id__gt="")
        if class_group:
            qs = qs.filter(class_group=class_group)

        # 오늘 출결 완료자 (present, late, absent 등 기록 있는 사람)
        checked_user_ids = set(
            AttendanceRecord.objects.filter(
                attendance_date=today
            ).values_list("user_id", flat=True)
        )

        # 미출결자 필터
        missing = [u for u in qs if u.id not in checked_user_ids]

        if not missing:
            return

        mentions = " ".join(f"<@{u.discord_id}>" for u in missing)
        await channel.send(f"{mentions} 아직 출결 안 했어요!")

    # ── loop before_loop: 봇 준비 대기 ──

    @check_in_reminder.before_loop
    async def before_check_in_reminder(self):
        await self.wait_until_ready()

    @check_in_nag.before_loop
    async def before_check_in_nag(self):
        await self.wait_until_ready()

    @check_out_reminder.before_loop
    async def before_check_out_reminder(self):
        await self.wait_until_ready()

    @b_class_thursday_reminder.before_loop
    async def before_b_class_thursday_reminder(self):
        await self.wait_until_ready()

    @b_class_thursday_nag.before_loop
    async def before_b_class_thursday_nag(self):
        await self.wait_until_ready()
```

- [ ] **Step 2: Commit**

```bash
git add Back-end/attendance/discord_bot.py
git commit -m "feat: 디스코드 출결 봇 핵심 로직 구현 (명령어 + 스케줄러)"
```

---

### Task 4: Management Command 진입점

**Files:**
- Create: `Back-end/attendance/management/commands/run_discord_bot.py`

- [ ] **Step 1: management command 디렉토리 확인**

Run: `ls /Users/bobs/Desktop/bobs_project/team_lab/Back-end/attendance/management/commands/`
Expected: `auto_check_out.py`, `__init__.py` 등

- [ ] **Step 2: run_discord_bot.py 생성**

`Back-end/attendance/management/commands/run_discord_bot.py`:

```python
from django.core.management.base import BaseCommand
from django.conf import settings

from attendance.discord_bot import AttendanceBot


class Command(BaseCommand):
    help = "디스코드 출결 봇 실행"

    def handle(self, *args, **options):
        token = settings.DISCORD_BOT_TOKEN
        if not token:
            self.stderr.write(self.style.ERROR("DISCORD_BOT_TOKEN 환경변수가 설정되지 않았습니다."))
            return

        if not settings.DISCORD_CHANNEL_ID:
            self.stderr.write(self.style.ERROR("DISCORD_CHANNEL_ID 환경변수가 설정되지 않았습니다."))
            return

        self.stdout.write(self.style.SUCCESS("디스코드 출결 봇을 시작합니다..."))
        bot = AttendanceBot()
        bot.run(token)
```

- [ ] **Step 3: Commit**

```bash
git add Back-end/attendance/management/commands/run_discord_bot.py
git commit -m "feat: 디스코드 봇 management command 추가"
```

---

### Task 5: Docker 배포 설정

**Files:**
- Modify: 루트 `docker-compose.yml` 또는 `Back-end/docker-compose.yml`

- [ ] **Step 1: docker-compose.yml에 봇 서비스 추가**

기존 `web` 서비스 정의 아래에 추가:

```yaml
  discord_bot:
    build: ./Back-end
    command: python manage.py run_discord_bot
    env_file:
      - .env
    depends_on:
      - db
    restart: unless-stopped
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: docker-compose에 디스코드 봇 서비스 추가"
```

---

### Task 6: 수동 테스트 및 검증

- [ ] **Step 1: .env에 실제 토큰 설정**

사용자에게 확인:
- `DISCORD_BOT_TOKEN` 값
- `DISCORD_CHANNEL_ID` 값 (디스코드 채널 우클릭 → ID 복사)

- [ ] **Step 2: 봇 실행**

Run: `cd /Users/bobs/Desktop/bobs_project/team_lab/Back-end && python manage.py run_discord_bot`
Expected: "디스코드 출결 봇을 시작합니다..." 출력 후 봇 온라인

- [ ] **Step 3: 명령어 테스트**

디스코드 지정 채널에서:
1. `ㅊㅅ` → ✅ 리액션 확인
2. `ㅊㅅ` (중복) → "이미 출결됐어요 그만해" 메시지 확인
3. `ㅌㅅ` → ✅ 리액션 확인
4. `ㅌㅅ` (중복) → "이미 퇴실했어요 그만해" 메시지 확인
5. `출석`, `ㅊㄱ`, `퇴실`, `ㅌㄱ`, `ㄲㅈ`, `꺼져`, `ㄱㅈ` 각각 동작 확인

- [ ] **Step 4: DB 확인**

Run: `cd /Users/bobs/Desktop/bobs_project/team_lab/Back-end && python manage.py shell -c "from attendance.models import AttendanceRecord; print(AttendanceRecord.objects.filter(attendance_date='$(date +%Y-%m-%d)').values('user__name', 'status', 'check_in_at', 'check_out_at'))"`
Expected: 디스코드로 처리한 출결 기록 확인

- [ ] **Step 5: 매핑 안 된 유저 테스트**

discord_id가 없는 유저가 `ㅊㅅ` → 봇 무반응 확인

- [ ] **Step 6: Commit (최종)**

```bash
git add -A
git commit -m "feat: 디스코드 출결 봇 구현 완료"
```
