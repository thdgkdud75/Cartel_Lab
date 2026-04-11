import asyncio
import logging
import re
import time as _time
import discord
import holidays
from discord.ext import commands, tasks
from django.conf import settings
from django.db import close_old_connections, connections, transaction, InterfaceError, OperationalError
from django.utils import timezone
from datetime import time as dtime, timedelta
from zoneinfo import ZoneInfo
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

KST = ZoneInfo("Asia/Seoul")

from attendance.models import AttendanceRecord, AttendanceTimeSetting
from users.models import User
from timetable.models import Timetable


# 명령어 매핑
CHECK_IN_CMDS = {'ㅊㅅ', '출석', 'ㅊㄱ'}
CHECK_OUT_CMDS = {'ㅌㅅ', '퇴실', 'ㅌㄱ'}
ABSENT_CMDS = {'ㄲㅈ', '꺼져', 'ㄱㅈ'}
LIST_MAPPED_CMDS = {'ㅁㅍ', '매핑', '매핑목록'}
TAG_MAPPED_CMDS = {'ㅁㄷ', '모두', '전체'}
REGISTER_CMD_PREFIXES = ('ㄷㄹ', '등록')
ALARM_ON_CMDS = {'전체알람켜기', '알람켜', '알람온'}
ALARM_OFF_CMDS = {'전체알람끄기', '알람꺼', '알람오프'}
ALARM_STATUS_CMDS = {'알람상태', '알람'}

_KR_HOLIDAYS = holidays.country_holidays('KR')


_CONN_ERR_HINTS = (
    "can't connect", "connection refused", "gone away",
    "lost connection", "broken pipe", "connection reset",
)


def _is_connection_error(exc):
    msg = str(exc).lower()
    return any(s in msg for s in _CONN_ERR_HINTS)


def _with_db_retry(fn):
    """Long-running 봇용: stale 연결 정리 + connection 류 예외 1회 재시도.

    InterfaceError 는 항상 connection 깨짐으로 간주, OperationalError 는 substring 매칭.
    """
    def wrapper(*args, **kwargs):
        for attempt in range(2):
            close_old_connections()
            try:
                return fn(*args, **kwargs)
            except (OperationalError, InterfaceError) as e:
                is_conn = isinstance(e, InterfaceError) or _is_connection_error(e)
                if attempt == 0 and is_conn:
                    for conn in connections.all():
                        try:
                            conn.close()
                        except Exception:
                            pass
                    _time.sleep(1)
                    continue
                raise
    return wrapper


@_with_db_retry
def _get_time_setting():
    return AttendanceTimeSetting.objects.first()


@_with_db_retry
def _should_skip_alarm():
    """주말/한국 공휴일/전체 알람 비활성화 중 하나라도 해당하면 True."""
    today = timezone.localdate()
    if today.weekday() >= 5:
        return True
    if today in _KR_HOLIDAYS:
        return True
    setting = AttendanceTimeSetting.objects.first()
    if setting and not setting.alarms_enabled:
        return True
    return False


@_with_db_retry
def _get_user_by_discord_id(discord_id: str):
    """discord_id로 매핑된 User 반환. 없으면 None."""
    try:
        return User.objects.get(discord_id=str(discord_id))
    except User.DoesNotExist:
        return None


@_with_db_retry
def _do_check_in(user):
    """출석 처리. (성공 타입, 에러 메시지) 중 하나 반환."""
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


@_with_db_retry
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


@_with_db_retry
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


def _chunk_lines(lines, sep="\n", limit=1900):
    """Discord 2000자 한도 안에 들어가도록 묶기."""
    chunks = []
    cur = ""
    for line in lines:
        candidate = line if not cur else cur + sep + line
        if len(candidate) > limit:
            if cur:
                chunks.append(cur)
            cur = line
        else:
            cur = candidate
    if cur:
        chunks.append(cur)
    return chunks


class AttendanceBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)
        if not settings.DISCORD_CHANNEL_ID:
            raise ValueError("DISCORD_CHANNEL_ID 환경변수가 설정되지 않았습니다.")
        self.attendance_channel_id = int(settings.DISCORD_CHANNEL_ID)

    async def setup_hook(self):
        self.check_in_reminder.start()
        self.check_in_nag.start()
        self.check_out_reminder.start()
        self.b_class_thursday_reminder.start()
        self.b_class_thursday_nag.start()

    async def on_message(self, message):
        if message.author.bot:
            return

        if message.channel.id != self.attendance_channel_id:
            return

        content = message.content.strip()

        if content in CHECK_IN_CMDS:
            await self._handle_command(message, _do_check_in)
        elif content in CHECK_OUT_CMDS:
            await self._handle_command(message, _do_check_out)
        elif content in ABSENT_CMDS:
            await self._handle_command(message, _do_absent)
        elif content in LIST_MAPPED_CMDS:
            await self._handle_list_mapped(message)
        elif content in TAG_MAPPED_CMDS:
            await self._handle_tag_mapped(message)
        elif content in ALARM_ON_CMDS:
            await self._handle_alarm_toggle(message, enable=True)
        elif content in ALARM_OFF_CMDS:
            await self._handle_alarm_toggle(message, enable=False)
        elif content in ALARM_STATUS_CMDS:
            await self._handle_alarm_status(message)
        elif content.split(maxsplit=1)[0] in REGISTER_CMD_PREFIXES:
            await self._handle_register(message)

    async def _handle_command(self, message, handler):
        user = await sync_to_async(_get_user_by_discord_id)(str(message.author.id))
        if not user:
            await message.channel.send(
                f"{message.author.mention} 등록 안 된 계정이에요. "
                f"(discord_id: `{message.author.id}` — 운영진에게 매핑 요청)"
            )
            return

        try:
            success, error_msg = await sync_to_async(handler)(user)
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 처리 중 오류가 발생했어요: `{type(e).__name__}: {e}`"
            )
            return

        if error_msg:
            await message.channel.send(f"{message.author.mention} {error_msg}")
        else:
            await message.add_reaction("✅")

    async def _handle_list_mapped(self, message):
        @_with_db_retry
        def _fetch():
            return list(
                User.objects.filter(discord_id__gt="")
                    .order_by("name")
                    .values_list("name", "discord_id")
            )
        try:
            rows = await sync_to_async(_fetch)()
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 조회 실패: `{type(e).__name__}: {e}`"
            )
            return

        if not rows:
            await message.channel.send("매핑된 사람이 없어요.")
            return

        header = f"**현재 매핑된 사람 ({len(rows)}명):**"
        lines = [f"- {name} (`{did}`)" for name, did in rows]
        for chunk in _chunk_lines([header] + lines):
            await message.channel.send(chunk)

    async def _handle_tag_mapped(self, message):
        @_with_db_retry
        def _fetch():
            return list(
                User.objects.filter(discord_id__gt="")
                    .values_list("discord_id", flat=True)
            )
        try:
            ids = await sync_to_async(_fetch)()
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 조회 실패: `{type(e).__name__}: {e}`"
            )
            return

        if not ids:
            await message.channel.send("매핑된 사람이 없어요.")
            return

        tokens = [f"<@{did}>" for did in ids]
        allow = discord.AllowedMentions(users=True)
        for chunk in _chunk_lines(tokens, sep=" "):
            await message.channel.send(chunk, allowed_mentions=allow)

    async def _handle_register(self, message):
        """`ㄷㄹ <학번>` 본인 등록, `ㄷㄹ` 단독은 현재 매핑 조회. 1:1 강제."""
        discord_id = str(message.author.id)
        if not discord_id:
            return

        parts = re.split(r'\s+', message.content.strip(), maxsplit=1)

        if len(parts) == 1:
            @_with_db_retry
            def _fetch_current():
                try:
                    u = User.objects.get(discord_id=discord_id)
                    return (u.student_id, u.name)
                except User.DoesNotExist:
                    return None
            try:
                current = await sync_to_async(_fetch_current)()
            except Exception as e:
                await message.channel.send(
                    f"{message.author.mention} 조회 실패: `{type(e).__name__}: {e}`"
                )
                return
            if current:
                sid, name = current
                await message.channel.send(
                    f"{message.author.mention} 📋 `{name}` (학번 `{sid}`) 으로 등록돼 있어요."
                )
            else:
                await message.channel.send(
                    f"{message.author.mention} 등록 안 됨. `ㄷㄹ <학번>` 으로 본인 등록하세요."
                )
            return

        student_id = parts[1].strip()
        if not student_id or len(student_id) > 20:
            await message.channel.send(
                f"{message.author.mention} 학번 형식이 이상해요. (1~20자)"
            )
            return

        @_with_db_retry
        def _register():
            with transaction.atomic():
                try:
                    target = User.objects.select_for_update().get(student_id=student_id)
                except User.DoesNotExist:
                    return ('not_found', None)

                if target.discord_id == discord_id:
                    return ('already', target)

                if target.discord_id and target.discord_id != discord_id:
                    return ('student_taken', target)

                existing = (
                    User.objects.select_for_update()
                    .filter(discord_id=discord_id)
                    .first()
                )
                if existing:
                    return ('discord_taken', existing)

                target.discord_id = discord_id
                target.save(update_fields=['discord_id'])
                return ('registered', target)

        try:
            result, user = await sync_to_async(_register)()
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 등록 실패: `{type(e).__name__}: {e}`"
            )
            return

        if result == 'not_found':
            await message.channel.send(
                f"{message.author.mention} 학번 `{student_id}` 에 해당하는 사용자가 없어요."
            )
        elif result == 'student_taken':
            await message.channel.send(
                f"{message.author.mention} 학번 `{student_id}` 는 이미 다른 디스코드 계정 "
                f"(`{user.discord_id}`) 에 등록돼 있어요. 운영진에게 문의."
            )
        elif result == 'discord_taken':
            await message.channel.send(
                f"{message.author.mention} 본인 디스코드는 이미 다른 학번 `{user.student_id}` "
                f"({user.name}) 에 등록돼 있어요. 운영진에게 문의."
            )
        elif result == 'already':
            await message.channel.send(
                f"{message.author.mention} 이미 `{user.name}` (학번 `{user.student_id}`) 으로 매핑돼 있어요."
            )
        elif result == 'registered':
            await message.channel.send(
                f"{message.author.mention} ✅ `{user.name}` (학번 `{user.student_id}`) 등록 완료. "
                f"이제 ㅊㅅ/ㅌㅅ 사용 가능."
            )

    async def _handle_alarm_toggle(self, message, enable: bool):
        """전체 알람 켜기/끄기 — 운영진(is_staff) 전용."""
        user = await sync_to_async(_get_user_by_discord_id)(str(message.author.id))
        if not user:
            await message.channel.send(
                f"{message.author.mention} 등록 안 된 계정이에요. "
                f"(discord_id: `{message.author.id}` — 운영진에게 매핑 요청)"
            )
            return
        if not user.is_staff:
            await message.channel.send(
                f"{message.author.mention} 운영진(is_staff)만 사용할 수 있는 명령이에요."
            )
            return

        @_with_db_retry
        def _set():
            with transaction.atomic():
                setting, _ = AttendanceTimeSetting.objects.update_or_create(
                    pk=1, defaults={'alarms_enabled': enable}
                )
                return setting.alarms_enabled

        try:
            result = await sync_to_async(_set)()
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 알람 설정 변경 실패: `{type(e).__name__}: {e}`"
            )
            return

        try:
            await message.add_reaction("✅")
        except Exception:
            pass

        state = "🟢 켜짐" if result else "🔴 꺼짐"
        await message.channel.send(
            f"📢 전체 알람이 {state} 으로 설정됐어요. (by {user.name})"
        )

    async def _handle_alarm_status(self, message):
        """현재 전체 알람 / 주말 / 공휴일 상태 조회."""
        @_with_db_retry
        def _fetch():
            setting = AttendanceTimeSetting.objects.first()
            return True if setting is None else bool(setting.alarms_enabled)
        try:
            enabled = await sync_to_async(_fetch)()
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 알람 상태 조회 실패: `{type(e).__name__}: {e}`"
            )
            return

        today = timezone.localdate()
        is_weekend = today.weekday() >= 5
        is_holiday = today in _KR_HOLIDAYS
        holiday_name = _KR_HOLIDAYS.get(today) if is_holiday else None

        lines = [f"📢 전체 알람: {'🟢 켜짐' if enabled else '🔴 꺼짐'}"]
        if is_weekend:
            lines.append("📅 오늘은 주말 → 알람 자동 차단")
        if is_holiday:
            lines.append(f"🎌 오늘은 공휴일 ({holiday_name}) → 알람 자동 차단")
        if enabled and not is_weekend and not is_holiday:
            lines.append("→ 오늘은 정상 알람 동작")
        elif not enabled:
            lines.append("→ 운영진이 전체 알람을 꺼둔 상태")
        await message.channel.send("\n".join(lines))

    # ── 스케줄러: A반 기본 ──

    @tasks.loop(time=dtime(hour=10, minute=0, second=0, tzinfo=KST))
    async def check_in_reminder(self):
        """10:00 전체 출결 알림"""
        try:
            if await sync_to_async(_should_skip_alarm)():
                return
            channel = self.get_channel(self.attendance_channel_id)
            if channel:
                await channel.send("@everyone 출결해주세요!", allowed_mentions=discord.AllowedMentions(everyone=True))
        except Exception:
            logger.exception("check_in_reminder failed")

    @tasks.loop(time=dtime(hour=10, minute=30, second=0, tzinfo=KST))
    async def check_in_nag(self):
        """10:30 미출결자 리마인드"""
        try:
            if await sync_to_async(_should_skip_alarm)():
                return
            await self._send_nag_reminder()
        except Exception:
            logger.exception("check_in_nag failed")

    @tasks.loop(time=dtime(hour=20, minute=0, second=0, tzinfo=KST))
    async def check_out_reminder(self):
        """20:00 전체 퇴실 알림"""
        try:
            if await sync_to_async(_should_skip_alarm)():
                return
            channel = self.get_channel(self.attendance_channel_id)
            if channel:
                await channel.send("@everyone 퇴실해주세요!", allowed_mentions=discord.AllowedMentions(everyone=True))
        except Exception:
            logger.exception("check_out_reminder failed")

    # ── 스케줄러: B반 목요일 ──

    @tasks.loop(time=dtime(hour=0, minute=1, second=0, tzinfo=KST))
    async def b_class_thursday_reminder(self):
        """목요일 B반 첫 수업 시간 기준 출결 알림"""
        try:
            today = timezone.localdate()
            if today.weekday() != 3:
                return
            if await sync_to_async(_should_skip_alarm)():
                return

            @_with_db_retry
            def _first_b_class():
                return (
                    Timetable.objects.filter(class_group="B", weekday=3)
                    .order_by("start_time")
                    .first()
                )
            first_class = await sync_to_async(_first_b_class)()

            if not first_class:
                return

            now = timezone.localtime()
            target = timezone.make_aware(
                timezone.datetime.combine(today, first_class.start_time),
                timezone.get_current_timezone(),
            )
            wait_seconds = (target - now).total_seconds()
            if wait_seconds <= 0:
                return
            await asyncio.sleep(wait_seconds)

            channel = self.get_channel(self.attendance_channel_id)
            if channel:
                @_with_db_retry
                def _list_b_users():
                    return list(User.objects.filter(class_group="B", discord_id__gt=""))
                b_users = await sync_to_async(_list_b_users)()
                mentions = " ".join(f"<@{u.discord_id}>" for u in b_users)
                if mentions:
                    await channel.send(f"{mentions} B반 출결해주세요!")
        except Exception:
            logger.exception("b_class_thursday_reminder failed")

    @tasks.loop(time=dtime(hour=0, minute=2, second=0, tzinfo=KST))
    async def b_class_thursday_nag(self):
        """목요일 B반 첫 수업 30분 후 미출결자 리마인드"""
        try:
            today = timezone.localdate()
            if today.weekday() != 3:
                return
            if await sync_to_async(_should_skip_alarm)():
                return

            @_with_db_retry
            def _first_b_class():
                return (
                    Timetable.objects.filter(class_group="B", weekday=3)
                    .order_by("start_time")
                    .first()
                )
            first_class = await sync_to_async(_first_b_class)()

            if not first_class:
                return

            now = timezone.localtime()
            nag_time = timezone.make_aware(
                timezone.datetime.combine(today, first_class.start_time),
                timezone.get_current_timezone(),
            ) + timedelta(minutes=30)

            wait_seconds = (nag_time - now).total_seconds()
            if wait_seconds <= 0:
                return
            await asyncio.sleep(wait_seconds)

            await self._send_nag_reminder(class_group="B")
        except Exception:
            logger.exception("b_class_thursday_nag failed")

    # ── 공통 리마인드 ──

    async def _send_nag_reminder(self, class_group=None):
        """미출결자(웹/앱/디스코드 모두 포함)에게 리마인드 멘션."""
        try:
            today = timezone.localdate()
            channel = self.get_channel(self.attendance_channel_id)
            if not channel:
                return

            @_with_db_retry
            def _get_missing_users():
                qs = User.objects.filter(discord_id__gt="")
                if class_group:
                    qs = qs.filter(class_group=class_group)

                checked_user_ids = set(
                    AttendanceRecord.objects.filter(
                        attendance_date=today
                    ).values_list("user_id", flat=True)
                )

                return list(qs.exclude(id__in=checked_user_ids))

            missing = await sync_to_async(_get_missing_users)()

            if not missing:
                return

            allow = discord.AllowedMentions(users=True)
            for u in missing:
                await channel.send(
                    f"<@{u.discord_id}> 아직 출결 안 했어요!",
                    allowed_mentions=allow,
                )
        except Exception:
            logger.exception("_send_nag_reminder failed (class_group=%s)", class_group)

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
