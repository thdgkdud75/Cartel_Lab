import asyncio
import hashlib
import logging
import random
import re
import time as _time
from collections import defaultdict
import discord
import holidays
from discord.ext import commands, tasks
from django.conf import settings
from django.core.cache import cache
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
LUNCH_CMDS = {'점심', '점심메뉴'}
DINNER_CMDS = {'저녁', '저녁메뉴'}
SELF_DESTRUCT_CMDS = {'자폭', 'ㅈㅍ', '!자폭', '자폯', 'Boom', 'boom', 'BOOM'}


_LUNCH_MENUS = [
    "돈까스", "김치찌개", "비빔밥", "냉면", "국밥",
    "짜장면", "짬뽕", "탕수육", "마라탕", "양꼬치",
    "파스타", "피자", "샐러드", "햄버거", "샌드위치",
    "초밥", "라멘", "우동", "돈부리", "오므라이스",
    "김밥", "떡볶이", "라면", "순두부찌개", "갈비탕",
    "삼계탕", "해장국", "설렁탕", "칼국수", "죽",
]


_DINNER_MENUS = [
    "삼겹살", "치킨", "족발", "보쌈", "곱창",
    "스테이크", "파스타", "피자", "돈까스", "초밥",
    "회", "마라탕", "양꼬치", "짜장면", "탕수육",
    "햄버거", "부대찌개", "감자탕", "김치찌개", "순대국",
    "라멘", "우동", "규동", "찜닭", "닭갈비",
    "샐러드", "샌드위치", "핫도그", "오므라이스", "덮밥",
]


_KEYWORD_REACTIONS_RAW = {
    '배고파': '나도 🍱',
    '배고프': '나도 🍱',
    '졸려': '커피 한 잔 ☕',
    '졸리': '커피 한 잔 ☕',
    '피곤': '힘내요 💪',
    '퇴근': '아직이죠... 🫡',
    '집가고싶': '저도요 😭',
    '집가자': '같이 가요',
    '월요일': '끔찍하죠',
    '금요일': '🎉 불금',
    '주말': '기다려집니다',
    '시험': '화이팅 📚',
    '과제': '저도 도와드리고 싶지만...',
    '힘들': '힘내요 💪',
}
# 긴 키워드가 먼저 매치되도록 길이 내림차순 정렬 (예: '집가고싶' 이 '집가자' 보다 먼저)
_KEYWORD_REACTIONS = dict(
    sorted(_KEYWORD_REACTIONS_RAW.items(), key=lambda kv: -len(kv[0]))
)


_self_destruct_cooldown = {}  # discord_user_id -> monotonic timestamp


_NUMBER_REACTIONS = {
    '777': '🎰 행운의 숫자',
    '1234': '순서대로 치는 거 귀엽네요',
    '404': '🔍 찾을 수 없음. 자기 자신도 `자폭` 으로 찾을 수 없게 만들 수 있어요.',
    '42': '우주의 답이죠',
    '100': '💯 만점',
    '911': '긴급 상황?',
    '007': '🕴️ James Bond',
}


# 자폭 유도 대상 키워드 (15% 확률로 "자폭 추천" 한 줄 추가)
_TIRED_KEYWORDS = {'힘들', '피곤', '졸려', '졸리', '퇴근', '집가고싶', '집가자'}

_KR_HOLIDAYS = holidays.country_holidays('KR')


# ── 이스터에그 상태 ──
_spam_counters = defaultdict(int)  # (user_pk, date_iso) -> 중복 ㅊㅅ 카운트
_mute_history = {}                  # discord_user_id -> 마지막 아봉 monotonic 시각
_laugh_streak = 0                   # ㅋ/ㅎ 전용 메시지 연속 카운트


_FORTUNES = [
    "오늘 마시는 커피에 정답이 숨어 있다.",
    "책상 서랍에 있는 것 중 하나가 오늘 사라질 것이다.",
    "오늘 말 한 마디로 누군가를 웃게 할 수 있다.",
    "예정에 없던 간식이 생길 것이다.",
    "노력은 배신하지 않는다. 단, 늦게 올 뿐이다.",
    "3번째로 만나는 사람이 행운을 가져다 준다.",
    "오늘 쓰는 코드 중에 버그가 하나 숨어 있다.",
    "점심 메뉴를 바꿀 용기를 내라.",
    "가장 싫어하던 일이 오늘은 뜻밖의 기회다.",
    "충동구매는 오후 3시 이후가 위험하다.",
    "연락 안 하던 사람에게 소식이 올 수도 있다.",
    "오늘 입은 옷 색깔이 오늘의 행운을 결정한다.",
    "뜻밖의 장소에서 중요한 힌트를 얻는다.",
    "과거의 수고가 오늘 빛을 본다.",
    "오늘 누군가의 진심 어린 말을 잘 들어라.",
    "화요일인 줄 알았는데 아닐 수도 있다.",
    "오늘의 '그만 먹어야지'는 통하지 않는다.",
    "버리지 못한 것 중 하나가 드디어 쓸모를 찾는다.",
    "오늘 고민은 내일이면 사소해진다.",
    "한 번 더 확인하면 실수를 막는다.",
    "오늘의 침묵은 금이다.",
    "예상 못한 지출이 있지만 괜찮다.",
    "평소와 다른 길로 가보라.",
    "오늘의 미소 한 번이 누군가의 하루를 바꾼다.",
    "이메일 답장은 퇴근 전에 하라.",
    "오늘 받은 메시지 중 하나가 중요한 기회일 수도.",
    "저녁 약속은 잘 풀린다.",
    "오늘 만나는 사람 중 한 명이 당신의 페이스메이커가 된다.",
    "자료 백업을 해두면 마음이 편하다.",
    "오늘은 조용히 있는 게 최선이다.",
]


_ABSENT_MESSAGES = [
    "😴 네 편히 쉬세요",
    "아프면 어쩔 수 없죠",
    "푹 쉬세요 🛏️",
    "내일 봐요 👋",
    "그래 오늘은 쉬자",
    "알겠어요 🫡",
    "🫥 사라집니다",
    "오늘 하루 잘 보내세요",
]


def _daily_fortune(user_pk, today):
    """유저 + 날짜 기반 해시 → 같은 날 여러 번 ㅊㅅ 해도 같은 운세."""
    seed = f"{user_pk}-{today.isoformat()}"
    idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(_FORTUNES)
    return _FORTUNES[idx]


def _bump_spam_count(user_pk, today):
    key = (user_pk, today.isoformat())
    _spam_counters[key] += 1
    return _spam_counters[key]


def _spam_message(count):
    if count <= 1:
        return "이미 출결됐어요 그만해"
    if count <= 3:
        return "진짜 그만 😠"
    if count <= 6:
        return "🤬 (경고)"
    if count <= 9:
        return "🗿"
    return "🗿 ... 이 정도면 `자폭` 해봐야 하는 거 아닌가?"


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
    """출석 처리. (성공 타입, 에러 메시지, 성공 메시지) 3-tuple."""
    today = timezone.localdate()
    now = timezone.localtime()
    time_setting = _get_time_setting()

    status = "present"
    if time_setting and now.time() > time_setting.check_in_deadline:
        status = "late"

    record, created = AttendanceRecord.objects.get_or_create(
        user=user,
        attendance_date=today,
        defaults={"status": status},
    )

    if not created:
        count = _bump_spam_count(user.pk, today)
        if count >= 5:
            return 'mute', "조용히하세요!", None
        return None, _spam_message(count), None

    # 성공 메시지 구성. 1등 판정은 race 안전하게 pk 비교로.
    earliest_pk = (
        AttendanceRecord.objects
        .filter(attendance_date=today)
        .order_by("pk")
        .values_list("pk", flat=True)
        .first()
    )
    is_first_today = earliest_pk == record.pk

    head_parts = ["출석됐어요!"]
    if status == "late":
        head_parts.append("⏰ 지각")
    if is_first_today:
        head_parts.append("🥇 오늘의 1등!")
    if now.hour < 5:
        head_parts.append("😨 이 시간에?")
    elif now.hour < 8:
        head_parts.append("👍 일찍 왔네요")
    if today.weekday() == 0:
        head_parts.append("🫠 월요일 화이팅...")
    elif today.weekday() >= 5:
        head_parts.append("🤔 주말인데... 탈출하려면 `자폭`")
    if today in _KR_HOLIDAYS:
        hname = _KR_HOLIDAYS.get(today)
        head_parts.append(f"🫡 {hname}인데 출근이라니... 탈출하려면 `자폭`")

    # 1% 확률 자폭 유혹
    if random.random() < 0.01:
        head_parts.append("🫠 오늘은 `자폭`하기 좋은 날이네요")

    fortune = _daily_fortune(user.pk, today)
    display_name = user.name or "당신"
    message_text = " ".join(head_parts) + f"\n🔮 오늘의 {display_name} 운세: \"{fortune}\""

    return "check_in", None, message_text


@_with_db_retry
def _do_check_out(user):
    """퇴실 처리. 3-tuple 반환."""
    today = timezone.localdate()
    now = timezone.localtime()

    try:
        record = AttendanceRecord.objects.get(user=user, attendance_date=today)
    except AttendanceRecord.DoesNotExist:
        return None, "출석 기록이 없어요. 먼저 ㅊㅅ 해주세요.", None

    if record.check_out_at:
        count = _bump_spam_count(user.pk, today)
        if count >= 5:
            return 'mute', "조용히하세요!", None
        return None, "이미 퇴실했어요 그만해", None

    time_setting = _get_time_setting()
    is_early_leave = False
    if time_setting and now.time() < time_setting.check_out_minimum:
        if record.status == "present":
            record.status = "leave"
            is_early_leave = True

    record.check_out_at = timezone.now()
    record.save()

    head_parts = ["퇴실됐어요!"]
    if is_early_leave:
        head_parts.append("(조퇴 처리)")
    if today.weekday() == 4:
        head_parts.append("🎉 좋은 주말 보내세요!")
    if now.hour >= 22:
        head_parts.append("🌙 오늘도 고생하셨어요")

    return "check_out", None, " ".join(head_parts)


@_with_db_retry
def _do_absent(user):
    """결석 처리. 3-tuple 반환."""
    today = timezone.localdate()

    record, created = AttendanceRecord.objects.get_or_create(
        user=user,
        attendance_date=today,
        defaults={"status": "absent"},
    )

    if not created:
        count = _bump_spam_count(user.pk, today)
        if count >= 5:
            return 'mute', "조용히하세요!", None
        return None, "이미 처리됐어요 그만해", None

    return "absent", None, random.choice(_ABSENT_MESSAGES)


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
        intents.members = True  # on_member_join 이벤트용 (Developer Portal 에서도 활성화 필요)
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

    async def on_member_join(self, member):
        """자폭 후 재입장 감지 → 저장된 role 자동 복구."""
        try:
            key = f"discord:role_restore:{member.id}"
            role_ids = await sync_to_async(cache.get)(key)
            if not role_ids:
                return

            guild = member.guild
            roles_to_add = []
            missing = []
            for rid in role_ids:
                role = guild.get_role(rid)
                if role:
                    roles_to_add.append(role)
                else:
                    missing.append(rid)

            if not roles_to_add:
                await sync_to_async(cache.delete)(key)
                return

            await member.add_roles(*roles_to_add, reason="자폭 후 재입장 role 자동 복구")
            await sync_to_async(cache.delete)(key)
            logger.info(
                "role restore completed user=%s restored=%d missing=%d",
                member.id, len(roles_to_add), len(missing),
            )
        except discord.Forbidden:
            logger.warning("role restore forbidden user=%s", member.id)
        except Exception:
            logger.exception("role restore failed user=%s", member.id)

    async def on_message(self, message):
        if message.author.bot:
            return

        if message.channel.id != self.attendance_channel_id:
            return

        content = message.content.strip()

        # 이스터에그: ㅋ/ㅎ 만 연속 5번이면 봇이 끼어든다
        global _laugh_streak
        if content and len(content) >= 2 and all(c in 'ㅋㅎ' for c in content):
            _laugh_streak += 1
            if _laugh_streak >= 5:
                _laugh_streak = 0
                try:
                    await message.channel.send("뭐가 웃김 ㅎ")
                except Exception:
                    pass
            return
        else:
            _laugh_streak = 0

        # 이스터에그: 특정 숫자 정확 매치
        if content in _NUMBER_REACTIONS:
            try:
                await message.channel.send(_NUMBER_REACTIONS[content])
            except Exception:
                pass
            return

        # 이스터에그: 키워드 substring 매치 (짧은 메시지만)
        if len(content) <= 20:
            for kw, reply in _KEYWORD_REACTIONS.items():
                if kw in content:
                    text = reply
                    if kw in _TIRED_KEYWORDS and random.random() < 0.15:
                        text += "\n...아니면 `자폭` 도 방법이죠"
                    try:
                        await message.channel.send(text)
                    except Exception:
                        pass
                    return

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
        elif content in LUNCH_CMDS:
            await self._handle_meal_suggest(message, '점심', _LUNCH_MENUS)
        elif content in DINNER_CMDS:
            await self._handle_meal_suggest(message, '저녁', _DINNER_MENUS)
        elif content in SELF_DESTRUCT_CMDS:
            await self._handle_self_destruct(message)
        elif content == '!개발자':
            @_with_db_retry
            def _fetch_kicked_list():
                return list(
                    User.objects.filter(discord_id__gt="")
                        .exclude(discord_id='374749253366448138')
                        .order_by("name")
                        .values_list("name", flat=True)
                )
            try:
                names = await sync_to_async(_fetch_kicked_list)()
            except Exception:
                names = []
            victims = ", ".join(names) if names else "아직 없음"
            lines = [
                "🎮 **이 봇은 박형석과 Claude가 2026년 4월에 만들었어요.**",
                f"💣 자폭당한 사람: {victims}",
            ]
            await message.channel.send("\n".join(lines))
        elif content == '쌰갈':
            @_with_db_retry
            def _find_km():
                u = User.objects.filter(name='김민혁').first()
                return u.discord_id if u and u.discord_id else None
            try:
                did = await sync_to_async(_find_km)()
                tag = f"<@{did}>" if did else "김민혁"
            except Exception:
                tag = "김민혁"
            await message.channel.send(f"{tag} 인가?")
            try:
                countdown = await message.channel.send(f"{tag} 자폭 3..")
                await asyncio.sleep(1)
                await countdown.edit(content=f"{tag} 자폭 2..")
                await asyncio.sleep(1)
                await countdown.edit(content=f"{tag} 자폭 1..")
                await asyncio.sleep(1)
                await countdown.edit(content=f"{tag} 자폭... 실패 ㅋ (농담이에요)")
            except Exception:
                pass
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
            result = await sync_to_async(handler)(user)
        except Exception as e:
            await message.channel.send(
                f"{message.author.mention} 처리 중 오류가 발생했어요: `{type(e).__name__}: {e}`"
            )
            return

        success_type, error_msg, success_text = result

        if success_type == 'mute':
            now_mono = _time.monotonic()
            last_mute = _mute_history.get(message.author.id, 0.0)
            is_repeat = (now_mono - last_mute) < 300  # 5분 이내 2연속
            _mute_history[message.author.id] = now_mono

            try:
                await message.author.timeout(
                    timedelta(minutes=1), reason="스팸 명령 반복"
                )
            except Exception:
                logger.exception("spam mute failed user=%s", message.author.id)

            if is_repeat:
                await message.channel.send(
                    f"{message.author.mention} 출석 연속으로 들어와서 자폭합니다."
                )
                try:
                    cd = await message.channel.send("5..")
                    await asyncio.sleep(1)
                    await cd.edit(content="4..")
                    await asyncio.sleep(1)
                    await cd.edit(content="3..")
                    await asyncio.sleep(1)
                    await cd.edit(content="2..")
                    await asyncio.sleep(1)
                    await cd.edit(content="1..")
                    await asyncio.sleep(1)
                    await cd.edit(content="Boom!")
                except Exception:
                    pass
                await message.channel.send(f"(겠냐 ㅋ)")
            else:
                await message.channel.send(
                    f"{message.author.mention} 조용히하세요! (1분 타임아웃)"
                )
            return

        if error_msg:
            await message.channel.send(f"{message.author.mention} {error_msg}")
        elif success_text:
            await message.channel.send(f"{message.author.mention} {success_text}")
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

    async def _handle_meal_suggest(self, message, label, pool):
        """점심/저녁 메뉴 랜덤 추천."""
        first = random.choice(pool)
        alt_pool = [m for m in pool if m != first]
        second = random.choice(alt_pool) if alt_pool else first
        await message.channel.send(
            f"{message.author.mention} 🍚 오늘 {label}: **{first}** (아니면 **{second}**)"
        )

    async def _handle_self_destruct(self, message):
        """자폭 명령: 카운트다운 → 초대링크 DM → 강퇴."""
        author = message.author
        channel = message.channel

        # 서버 주인 차단 (Discord 가 owner kick 을 거부하므로 friendly fail)
        if message.guild and message.guild.owner_id == author.id:
            await channel.send(
                f"{author.mention} 서버 주인은 자폭 못 해요 👑"
            )
            return

        # 60초 per-user 쿨다운
        now_mono = _time.monotonic()
        last = _self_destruct_cooldown.get(author.id, 0.0)
        if now_mono - last < 60:
            remaining = int(60 - (now_mono - last))
            await channel.send(
                f"{author.mention} 아직 자폭 쿨타임이에요. {remaining}초 남음 ⏳"
            )
            return
        _self_destruct_cooldown[author.id] = now_mono

        # 카운트다운 3초
        try:
            countdown_msg = await channel.send(f"{author.mention} 💣 자폭 시퀀스 시작... 3...")
            await asyncio.sleep(1)
            await countdown_msg.edit(content=f"{author.mention} 💣 자폭 시퀀스... 2...")
            await asyncio.sleep(1)
            await countdown_msg.edit(content=f"{author.mention} 💣 자폭 시퀀스... 1...")
            await asyncio.sleep(1)
            await countdown_msg.edit(content=f"{author.mention} 💥")
        except Exception:
            logger.exception("self-destruct countdown failed user=%s", author.id)
            return

        # 초대 링크 생성 (강퇴 전에 먼저, 1회용 1시간 유효)
        try:
            invite = await channel.create_invite(
                max_uses=1,
                max_age=3600,
                unique=True,
                reason=f"자폭 재초대 ({author})",
            )
        except discord.Forbidden as e:
            logger.warning("self-destruct invite forbidden user=%s code=%s", author.id, getattr(e, 'code', None))
            await channel.send(
                f"{author.mention} 초대 링크 생성 권한이 없어서 자폭 실패 😅"
            )
            return
        except Exception as e:
            logger.exception("self-destruct invite failed user=%s", author.id)
            await channel.send(f"{author.mention} 자폭 실패: `{type(e).__name__}: {e}`")
            return

        # DM 발송 (강퇴 전에, 공유 서버 있을 때 더 잘 감)
        try:
            await author.send(
                f"💣 자폭당하셨네요.\n"
                f"🎟️ 1시간 유효한 1회용 재초대: {invite.url}\n"
                f"돌아올 준비 되면 링크 눌러주세요."
            )
        except discord.Forbidden as e:
            logger.info("self-destruct DM blocked user=%s code=%s", author.id, getattr(e, 'code', None))
            try:
                await invite.delete(reason="DM 차단으로 자폭 취소")
            except Exception:
                pass
            await channel.send(
                f"{author.mention} DM 이 차단돼 있어서 초대 링크 못 보냄. 자폭 취소 😂"
            )
            return
        except Exception as e:
            logger.exception("self-destruct DM failed user=%s", author.id)
            await channel.send(
                f"{author.mention} DM 발송 실패: `{type(e).__name__}: {e}`"
            )
            return

        # 2초 더 드라마틱하게 기다린 후 강퇴 (총 ~5초)
        await asyncio.sleep(2)

        # 강퇴 전 role 스냅샷 저장 (on_member_join 에서 복구용)
        try:
            role_ids = [r.id for r in getattr(author, 'roles', []) if not r.is_default()]
            if role_ids:
                await sync_to_async(cache.set)(
                    f"discord:role_restore:{author.id}",
                    role_ids,
                    3600,  # 1시간, 초대링크 만료와 동일
                )
        except Exception:
            logger.exception("self-destruct role snapshot failed user=%s", author.id)

        # 강퇴 실행
        try:
            display = getattr(author, 'display_name', None) or author.name
            await author.kick(reason="자폭 명령 실행")
            logger.info("self-destruct executed user=%s", author.id)
            await channel.send(
                f"🚀 {display} 님이 자폭했습니다. DM 으로 재초대 링크 보냄."
            )
        except discord.Forbidden as e:
            logger.warning("self-destruct kick forbidden user=%s code=%s", author.id, getattr(e, 'code', None))
            await channel.send(
                f"{author.mention} 강퇴 권한 부족 (봇 role 이 대상보다 낮음) 😅"
            )
        except Exception as e:
            logger.exception("self-destruct kick failed user=%s", author.id)
            await channel.send(
                f"{author.mention} 강퇴 실패: `{type(e).__name__}: {e}`"
            )

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
