from __future__ import annotations

import html
import re
from datetime import timedelta

import requests
from django.core.cache import cache
from django.utils import timezone


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)

QNET_INFO_PROCESSING_ENGINEER_URL = (
    "https://www.q-net.or.kr/crf005.do?gId=&gSite=Q&id=crf00503s02&jmCd=1320&jmInfoDivCcd=B0"
)
QNET_INFO_PROCESSING_INDUSTRIAL_ENGINEER_URL = (
    "https://www.q-net.or.kr/crf005.do?gId=&gSite=Q&id=crf00503s02&jmCd=2290&jmInfoDivCcd=B0"
)
QNET_BIGDATA_ANALYSIS_ENGINEER_URL = (
    "https://www.q-net.or.kr/crf005.do?gId=&gSite=Q&id=crf00503s02&jmCd=2121&jmInfoDivCcd=B0"
)
QNET_WEB_DESIGN_CRAFTSMAN_URL = (
    "https://www.q-net.or.kr/crf005.do?gId=&gSite=Q&id=crf00505&jmCd=7798"
)
QNET_INFORMATION_SECURITY_ENGINEER_URL = (
    "https://www.q-net.or.kr/crf005.do?gId=&gSite=Q&id=crf00505&jmCd=2027"
)
QNET_APPLY_URL = "https://www.q-net.or.kr"

DATAQ_SCHEDULE_URL = "https://www.dataq.or.kr/www/accept/schedule.do"
DATAQ_APPLY_URL = "https://www.dataq.or.kr/www/index.do"

KAIT_AI_SCHEDULE_URL = "https://www.ihd.or.kr/guidecert11.do"
KAIT_LINUX_SCHEDULE_URL = "https://www.ihd.or.kr/guidecert2.do"
KAIT_APPLY_URL = "https://www.ihd.or.kr/"

KPC_DASHBOARD_URL = "https://license.kpc.or.kr/qplus/login/LoginView.do"
KPC_HOME_URL = "https://license.kpc.or.kr/"
KPC_AI_POT_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectAipot.do"
KPC_AIBT_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectAibt.do"
KPC_GTQ_AI_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectGtqAi.do"
KPC_SW_CODING_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectSwcoding.do"
KPC_DSAC_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectDsac.do"
KPC_DEQ_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectIeqinfomg.do"
KPC_ITQ_URL = "https://license.kpc.or.kr/nasec/qlfint/qlfint/selectItqinfomg.do"

KORCHAM_COMPUTER_SPECIALIST_URL = "https://license.korcham.net/co/examguide03.do?cd=0301&mm=21"
FORENSICS_EXAM_URL = "https://exam.forensickorea.org/"

DATAQ_SECTION_ORDER = [
    "빅데이터 분석기사",
    "데이터분석 전문가",
    "데이터분석 준전문가",
    "SQL 전문가",
    "SQL 개발자",
    "데이터아키텍처 전문가",
    "데이터아키텍처 준전문가",
]


def _fetch_html(url: str) -> str:
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=15)
    response.raise_for_status()
    return response.text


def _strip_tags(raw_html: str) -> str:
    without_script = re.sub(r"<script[\s\S]*?</script>", " ", raw_html, flags=re.IGNORECASE)
    without_style = re.sub(r"<style[\s\S]*?</style>", " ", without_script, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", without_style)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _format_year_range(raw_value: str, year: int) -> str:
    start, end = [part.strip() for part in raw_value.split("~", 1)]
    start_month, start_day = [int(part) for part in start.split(".")]
    if "." in end:
        end_month, end_day = [int(part) for part in end.split(".")]
    else:
        end_month, end_day = start_month, int(end)
    return f"{year}.{start_month:02d}.{start_day:02d} ~ {year}.{end_month:02d}.{end_day:02d}"


def _format_year_date(raw_value: str, year: int) -> str:
    value = raw_value.strip().replace("'", str(year + 1))
    match = re.match(r"(\d{1,2})\.(\d{1,2})(\([^)]+\))?", value)
    if not match:
        return value
    month = int(match.group(1))
    day = int(match.group(2))
    suffix = match.group(3) or ""
    return f"{year}.{month:02d}.{day:02d}{suffix}"


def _format_iso_date(raw_value: str) -> str:
    return raw_value.replace("-", ".")


def _parse_date_token(raw_value: str):
    full_match = re.search(r"(\d{4})\.(\d{2})\.(\d{2})", raw_value)
    if full_match:
        year, month, day = [int(part) for part in full_match.groups()]
        return timezone.datetime(year, month, day).date()

    short_match = re.search(r"(\d{1,2})\.(\d{1,2})", raw_value)
    if short_match:
        year = timezone.localdate().year
        month, day = [int(part) for part in short_match.groups()]
        return timezone.datetime(year, month, day).date()
    return None


def _parse_range(raw_value: str):
    parts = [part.strip() for part in raw_value.split("~", 1)]
    if len(parts) == 1:
        date_value = _parse_date_token(parts[0])
        return date_value, date_value
    start_date = _parse_date_token(parts[0])
    end_date = _parse_date_token(parts[1])
    if start_date and end_date and end_date < start_date:
        end_date = start_date
    return start_date, end_date


def _registration_status(raw_value: str, today):
    start_date, end_date = _parse_range(raw_value)
    if not start_date or not end_date:
        return {"code": "unknown", "label": "상태 확인 필요"}
    if today < start_date:
        return {"code": "upcoming", "label": "접수 예정"}
    if start_date <= today <= end_date:
        return {"code": "open", "label": "접수 진행 중"}
    return {"code": "closed", "label": "접수 마감"}


def _exam_status(raw_value: str, today):
    start_date, end_date = _parse_range(raw_value)
    if not start_date or not end_date:
        return {"code": "unknown", "label": "상태 확인 필요", "is_today": False}
    if start_date <= today <= end_date:
        return {"code": "today", "label": "D-DAY", "is_today": True}
    if today < start_date:
        days_left = (start_date - today).days
        if days_left <= 7:
            return {"code": "urgent", "label": f"D-{days_left}", "is_today": False, "days_left": days_left}
        if days_left <= 30:
            return {"code": "soon", "label": f"D-{days_left}", "is_today": False, "days_left": days_left}
        return {"code": "upcoming", "label": f"D-{days_left}", "is_today": False, "days_left": days_left}
    return {"code": "passed", "label": "시험 종료", "is_today": False}


def _decorate_qnet_schedules(schedules: list[dict[str, str]], today, name: str = "정보처리산업기사"):
    alerts = []
    for schedule in schedules:
        schedule["written_registration_status"] = _registration_status(schedule["written_registration"], today)
        schedule["practical_registration_status"] = _registration_status(schedule["practical_registration"], today)
        schedule["written_exam_status"] = _exam_status(schedule["written_exam"], today)
        schedule["practical_exam_status"] = _exam_status(schedule["practical_exam"], today)
        schedule["is_today"] = (
            schedule["written_exam_status"]["is_today"] or schedule["practical_exam_status"]["is_today"]
        )
        if schedule["written_exam_status"]["is_today"]:
            alerts.append({"name": name, "round": schedule["round"], "part": "필기"})
        if schedule["practical_exam_status"]["is_today"]:
            alerts.append({"name": name, "round": schedule["round"], "part": "실기"})
    return alerts


def _decorate_single_stage_schedules(
    schedules: list[dict[str, str]],
    today,
    name: str,
    part_label: str = "시험",
):
    alerts = []
    for schedule in schedules:
        schedule["registration_status"] = _registration_status(schedule["registration"], today)
        schedule["exam_status"] = _exam_status(schedule["exam_date"], today)
        schedule["is_today"] = schedule["exam_status"]["is_today"]
        if schedule["exam_status"]["is_today"]:
            alerts.append({"name": name, "round": schedule["round"], "part": part_label})
    return alerts


def _decorate_sqld_schedules(schedules: list[dict[str, str]], today):
    return _decorate_single_stage_schedules(schedules, today, name="SQLD")


def _extract_section(text: str, title: str, markers: list[str]) -> str:
    start = text.find(title)
    if start == -1:
        return ""
    start += len(title)
    end = len(text)
    for marker in markers:
        marker_index = text.find(marker, start)
        if marker_index != -1:
            end = min(end, marker_index)
    return text[start:end].strip()


def parse_qnet_info_processing_schedule(raw_html: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    pattern = re.compile(
        r"((?:20\d{2})년\s+정기\s+(?:기사|산업기사)\s+\d+회)\s+"
        r"(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})\s*"
        r"(?:\[\s*빈자리접수\s*:\s*\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2}\s*\])?\s+"
        r"(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})\s+"
        r"(\d{4}\.\d{2}\.\d{2})\s+"
        r"(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})\s*"
        r"(?:빈자리접수\s*:\s*\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2}\s+)?"
        r"(\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2})\s+"
        r"(\d{4}\.\d{2}\.\d{2})"
    )
    schedules = []
    for match in pattern.finditer(text):
        schedules.append(
            {
                "round": match.group(1),
                "written_registration": re.sub(r"\s+", " ", match.group(2)).strip(),
                "written_exam": re.sub(r"\s+", " ", match.group(3)).strip(),
                "written_result": match.group(4).strip(),
                "practical_registration": re.sub(r"\s+", " ", match.group(5)).strip(),
                "practical_exam": re.sub(r"\s+", " ", match.group(6)).strip(),
                "final_result": match.group(7).strip(),
            }
        )
    return schedules


def parse_qnet_info_processing_schedule(raw_html: str) -> list[dict[str, str]]:
    def normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()

    def extract_first_date_range(value: str) -> str:
        match = re.search(r"\d{4}\.\d{2}\.\d{2}\s*~\s*\d{4}\.\d{2}\.\d{2}", value)
        return normalize(match.group(0)) if match else ""

    def extract_first_date(value: str) -> str:
        match = re.search(r"\d{4}\.\d{2}\.\d{2}", value)
        return match.group(0) if match else ""

    schedules = []
    for row_html in re.findall(r"<tr\b[^>]*>(.*?)</tr>", raw_html, flags=re.IGNORECASE | re.DOTALL):
        cells = [
            normalize(_strip_tags(cell_html))
            for cell_html in re.findall(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", row_html, flags=re.IGNORECASE | re.DOTALL)
        ]
        if len(cells) < 7:
            continue

        round_label = cells[0]
        if not re.search(r"20\d{2}.*\d+\s*회", round_label):
            continue

        written_registration = extract_first_date_range(cells[1])
        written_exam = extract_first_date_range(cells[2])
        written_result = extract_first_date(cells[3])
        practical_registration = extract_first_date_range(cells[4])
        practical_exam = extract_first_date_range(cells[5])
        final_result = extract_first_date(cells[6])

        if not all([
            written_registration,
            written_exam,
            written_result,
            practical_registration,
            practical_exam,
            final_result,
        ]):
            continue

        schedules.append(
            {
                "round": round_label,
                "written_registration": written_registration,
                "written_exam": written_exam,
                "written_result": written_result,
                "practical_registration": practical_registration,
                "practical_exam": practical_exam,
                "final_result": final_result,
            }
        )
    return schedules


def parse_dataq_single_schedule(raw_html: str, title: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    year_match = re.search(r"(20\d{2})년도 일정", text)
    year = int(year_match.group(1)) if year_match else timezone.localdate().year
    section = _extract_section(text, title, [value for value in DATAQ_SECTION_ORDER if value != title] + ["원서접수 시간"])
    if not section:
        return []
    pattern = re.compile(
        r"(제\d+회)\s*-\s+"
        r"(\d{1,2}\.\d{1,2}~(?:\d{1,2}\.\d{1,2}|\d{1,2}))\s+"
        r"(\d{1,2}\.\d{1,2})\s+"
        r"(\d{1,2}\.\d{1,2}\([^)]+\))\s+"
        r"(\d{1,2}\.\d{1,2}~(?:\d{1,2}\.\d{1,2}|\d{1,2}))\s+"
        r"(\d{1,2}\.\d{1,2})\s+-"
    )
    schedules = []
    for match in pattern.finditer(section):
        schedules.append(
            {
                "round": match.group(1),
                "registration": _format_year_range(match.group(2), year),
                "ticket_open": _format_year_date(match.group(3), year),
                "exam_date": _format_year_date(match.group(4), year),
                "score_review": _format_year_range(match.group(5), year),
                "result_date": _format_year_date(match.group(6), year),
            }
        )
    return schedules


def parse_sqld_schedule(raw_html: str) -> list[dict[str, str]]:
    return parse_dataq_single_schedule(raw_html, "SQL 개발자")


def parse_dataq_dual_schedule(raw_html: str, title: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    year_match = re.search(r"(20\d{2})년도 일정", text)
    year = int(year_match.group(1)) if year_match else timezone.localdate().year
    section = _extract_section(text, title, [value for value in DATAQ_SECTION_ORDER if value != title] + ["원서접수 시간"])
    if not section:
        return []
    round_pattern = re.compile(r"(제\d+회)\s+필기\s+(.*?)\s+실기\s+(.*?)(?=제\d+회|$)")
    token_pattern = re.compile(r"\d{1,2}\.\d{1,2}~(?:\d{1,2}\.\d{1,2}|\d{1,2})|\d{1,2}\.\d{1,2}\([^)]+\)|\d{1,2}\.\d{1,2}")
    schedules = []
    for match in round_pattern.finditer(section):
        written_tokens = token_pattern.findall(match.group(2))
        practical_tokens = token_pattern.findall(match.group(3))
        if len(written_tokens) < 5 or len(practical_tokens) < 5:
            continue
        schedules.append(
            {
                "round": match.group(1),
                "written_registration": _format_year_range(written_tokens[0], year),
                "written_ticket_open": _format_year_date(written_tokens[1], year),
                "written_exam": _format_year_date(written_tokens[2], year),
                "written_score_review": _format_year_range(written_tokens[3], year),
                "written_result": _format_year_date(written_tokens[4], year),
                "practical_registration": _format_year_range(practical_tokens[0], year),
                "practical_ticket_open": _format_year_date(practical_tokens[1], year),
                "practical_exam": _format_year_date(practical_tokens[2], year),
                "practical_score_review": _format_year_range(practical_tokens[3], year),
                "final_result": _format_year_date(practical_tokens[4], year),
            }
        )
    return schedules


def _normalize_kait_date(raw_value: str, year: int) -> str:
    value = raw_value.strip().replace("'", str(year + 1)).replace("..", ".")
    match = re.match(r"(\d{2,4})\.(\d{2})\.\(([^)]+)\)", value)
    if match and len(match.group(1)) == 4:
        return f"{match.group(1)}.{match.group(2)}({match.group(3)})"
    parts = re.match(r"(\d{2})\.(\d{2})\.\(([^)]+)\)", value)
    if not parts:
        return value
    return f"{year}.{parts.group(1)}.{parts.group(2)}({parts.group(3)})"


def _normalize_kait_range(raw_value: str, year: int) -> str:
    start, end = [part.strip() for part in raw_value.replace("'", str(year + 1)).split("~", 1)]
    return f"{_normalize_kait_date(start, year)} ~ {_normalize_kait_date(end, year)}"


def parse_kait_ai_basic_schedule(raw_html: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    year = timezone.localdate().year
    pattern = re.compile(
        r"AI상식\s+-\s+(\d+회)\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\)\s*~\s*\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"((?:\d{2}\.\d{2}\.\([^)]+\)|'27\.\d{2}\.\d{2}\.\([^)]+\)))"
    )
    schedules = []
    for match in pattern.finditer(text):
        schedules.append(
            {
                "round": match.group(1),
                "registration": _normalize_kait_range(match.group(2), year),
                "exam_date": _normalize_kait_date(match.group(3), year),
                "result_date": _normalize_kait_date(match.group(4), year),
            }
        )
    return schedules


def parse_kait_prompt_schedule(raw_html: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    year = timezone.localdate().year
    pattern = re.compile(
        r"프롬프트 엔지니어 \(비대면\)\s+(1급|2급)\s+(\d+회)\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\)\s*~\s*\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"((?:\d{2}\.\d{2}\.\([^)]+\)|'27\.\d{2}\.\d{2}\.\([^)]+\)))"
    )
    schedules = []
    for match in pattern.finditer(text):
        schedules.append(
            {
                "round": f"{match.group(2)} {match.group(1)}",
                "registration": _normalize_kait_range(match.group(3), year),
                "exam_date": _normalize_kait_date(match.group(4), year),
                "result_date": _normalize_kait_date(match.group(5), year),
            }
        )
    return schedules


def parse_kait_linux_schedule(raw_html: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    year = timezone.localdate().year
    pattern = re.compile(
        r"리눅스마스터\s+(1급|2급)\s+(1차|2차)\s+(\d+회)\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\)\s*~\s*\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\))\s+"
        r"(\d{2}\.\d{2}\.\([^)]+\))"
    )
    schedules = []
    for match in pattern.finditer(text):
        schedules.append(
            {
                "round": f"{match.group(3)} {match.group(1)} {match.group(2)}",
                "registration": _normalize_kait_range(match.group(4), year),
                "exam_date": _normalize_kait_date(match.group(5), year),
                "result_date": _normalize_kait_date(match.group(6), year),
            }
        )
    return schedules


def parse_kpc_dashboard_schedule(raw_html: str, exam_keyword: str) -> list[dict[str, str]]:
    text = _strip_tags(raw_html)
    pattern = re.compile(
        rf"((?:20\d{{2}}년\s+)?제\d+회\s+{exam_keyword}\s*정기시험)\s+"
        r"온라인\s+(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\s+"
        r"시험일\s+(\d{4}-\d{2}-\d{2})"
    )
    schedules = []
    for match in pattern.finditer(text):
        schedules.append(
            {
                "round": match.group(1),
                "registration": f"{_format_iso_date(match.group(2))} ~ {_format_iso_date(match.group(3))}",
                "ticket_open": "공식 사이트 참고",
                "exam_date": _format_iso_date(match.group(4)),
                "score_review": "공식 사이트 참고",
                "result_date": "공식 사이트 참고",
            }
        )
    return schedules


def _build_item(
    *,
    slug: str,
    name: str,
    short_name: str,
    source: str,
    official_url: str,
    apply_url: str,
    apply_label: str,
    description: str,
    exam_structure: list[str],
    pass_rate: str = "공식 사이트 확인 필요",
    exam_fee: str = "회차별 확인 필요",
    difficulty_label: str = "정보 확인중",
    difficulty_score: int = 0,
    quick_tip: str = "자세한 수치는 공식 공고에서 최종 확인해주세요.",
    schedules: list[dict[str, str]] | None = None,
    error: str = "",
):
    return {
        "slug": slug,
        "name": name,
        "short_name": short_name,
        "source": source,
        "official_url": official_url,
        "apply_url": apply_url,
        "apply_label": apply_label,
        "description": description,
        "exam_structure": exam_structure,
        "pass_rate": pass_rate,
        "exam_fee": exam_fee,
        "difficulty_label": difficulty_label,
        "difficulty_score": difficulty_score,
        "quick_tip": quick_tip,
        "schedules": schedules or [],
        "error": error,
    }


def get_important_certification_feed() -> dict:
    cache_key = "planner:important-certification-feed:v8"
    cached = cache.get(cache_key)
    if cached:
        return cached

    today = timezone.localdate()
    payload = {
        "generated_at": timezone.localtime().isoformat(),
        "today": today.isoformat(),
        "today_alerts": [],
        "items": [],
    }

    certification_meta = {
        "information-processing-industrial-engineer": {
            "pass_rate": "연도별 편차 큼",
            "exam_fee": "필기 19,400원 / 실기 20,800원",
            "difficulty_label": "보통 이상",
            "difficulty_score": 3,
            "quick_tip": "필기와 실기 모두 준비해야 해서 체감 난이도가 올라갈 수 있습니다.",
        },
        "bigdata-analysis-engineer": {
            "pass_rate": "연도별 편차 큼",
            "exam_fee": "필기 17,800원 / 실기 40,800원",
            "difficulty_label": "어려움",
            "difficulty_score": 4,
            "quick_tip": "통계, 분석, 실무형 준비가 함께 필요해 준비 시간이 길어질 수 있습니다.",
        },
        "adp": {
            "pass_rate": "낮은 편",
            "exam_fee": "100,000원",
            "difficulty_label": "매우 어려움",
            "difficulty_score": 5,
            "quick_tip": "실무형 분석 역량이 필요한 상위 자격이라 충분한 학습 기간이 필요합니다.",
        },
        "adsp": {
            "pass_rate": "중간 이상",
            "exam_fee": "50,000원",
            "difficulty_label": "보통",
            "difficulty_score": 3,
            "quick_tip": "데이터 입문용으로 많이 선택하지만 범위가 넓어 기본 정리가 중요합니다.",
        },
        "sqld": {
            "pass_rate": "중간 이상",
            "exam_fee": "50,000원",
            "difficulty_label": "보통",
            "difficulty_score": 3,
            "quick_tip": "기초 SQL 문법과 모델링을 함께 보는 편이라 실습형 공부가 잘 맞습니다.",
        },
        "sqlp": {
            "pass_rate": "낮은 편",
            "exam_fee": "100,000원",
            "difficulty_label": "어려움",
            "difficulty_score": 4,
            "quick_tip": "SQL 튜닝과 설계 범위가 넓어서 실무 경험이 있을수록 유리합니다.",
        },
        "dap": {
            "pass_rate": "낮은 편",
            "exam_fee": "100,000원",
            "difficulty_label": "어려움",
            "difficulty_score": 4,
            "quick_tip": "아키텍처와 모델링 이해도가 중요해서 초반 진입 난도가 있는 편입니다.",
        },
        "dasp": {
            "pass_rate": "중간 이하",
            "exam_fee": "50,000원",
            "difficulty_label": "보통 이상",
            "difficulty_score": 3,
            "quick_tip": "데이터 구조와 설계 개념을 처음 접하면 용어 정리부터 하는 편이 좋습니다.",
        },
        "linux-master": {
            "pass_rate": "급수별 편차 큼",
            "exam_fee": "KAIT 급수별 공고 확인",
            "difficulty_label": "보통",
            "difficulty_score": 3,
            "quick_tip": "급수와 차수마다 범위가 달라 신청 전에 시험 구성을 먼저 확인하는 편이 좋습니다.",
        },
        "information-security-engineer": {
            "pass_rate": "낮은 편",
            "exam_fee": "Q-Net 회차별 공고 확인",
            "difficulty_label": "어려움",
            "difficulty_score": 4,
            "quick_tip": "보안 전공/실무 지식이 필요해 비전공자에게는 체감 난이도가 높을 수 있습니다.",
        },
        "computer-specialist": {
            "pass_rate": "급수별 편차 큼",
            "exam_fee": "대한상공회의소 공고 확인",
            "difficulty_label": "쉬움~보통",
            "difficulty_score": 2,
            "quick_tip": "실기 비중이 커서 기출 반복 연습이 효율적입니다.",
        },
    }

    def meta_for(slug: str) -> dict:
        return certification_meta.get(slug, {})

    def add_qnet_item(slug: str, name: str, short_name: str, url: str, description: str):
        schedules = []
        error = ""
        try:
            schedules = parse_qnet_info_processing_schedule(_fetch_html(url))
            payload["today_alerts"].extend(_decorate_qnet_schedules(schedules, today, name=name))
        except requests.RequestException:
            error = f"{name} 일정 정보를 불러오지 못했습니다."
        payload["items"].append(
            _build_item(
                slug=slug,
                name=name,
                short_name=short_name,
                source="Q-Net",
                official_url=url,
                apply_url=QNET_APPLY_URL,
                apply_label="Q-Net에서 신청",
                description=description,
                exam_structure=["필기", "실기"],
                **meta_for(slug),
                schedules=schedules,
                error=error,
            )
        )

    add_qnet_item(
        slug="information-processing-industrial-engineer",
        name="정보처리산업기사",
        short_name="정보처리산업기사",
        url=QNET_INFO_PROCESSING_INDUSTRIAL_ENGINEER_URL,
        description="대표적인 정보처리 계열 산업기사 일정으로 필기와 실기 흐름을 함께 확인할 수 있습니다.",
    )
    add_qnet_item(
        slug="bigdata-analysis-engineer",
        name="빅데이터분석기사",
        short_name="빅분기",
        url=QNET_BIGDATA_ANALYSIS_ENGINEER_URL,
        description="데이터 분석과 AI 응용 쪽으로 확장하기 좋은 국가기술자격입니다.",
    )

    dataq_html = ""
    dataq_error = ""
    try:
        dataq_html = _fetch_html(DATAQ_SCHEDULE_URL)
    except requests.RequestException:
        dataq_error = "데이터 자격 일정 정보를 불러오지 못했습니다."

    dataq_dual_specs = [
        ("adp", "데이터분석전문가", "ADP", "데이터분석 전문가", "고급 데이터 분석 역량을 검증하는 대표 자격입니다."),
        ("bigdata-dataq", "빅데이터분석기사", "빅분기(DataQ)", "빅데이터 분석기사", "DataQ 일정표 기준의 빅데이터분석기사 회차입니다."),
    ]
    for slug, name, short_name, title, description in dataq_dual_specs:
        schedules = parse_dataq_dual_schedule(dataq_html, title) if dataq_html else []
        if schedules:
            payload["today_alerts"].extend(_decorate_qnet_schedules(schedules, today, name=name))
        payload["items"].append(
            _build_item(
                slug=slug,
                name=name,
                short_name=short_name,
                source="KDATA DataQ",
                official_url=DATAQ_SCHEDULE_URL,
                apply_url=DATAQ_APPLY_URL,
                apply_label="DataQ에서 신청",
                description=description,
                exam_structure=["필기", "실기"],
                **meta_for(slug),
                schedules=schedules,
                error=dataq_error,
            )
        )

    dataq_single_specs = [
        ("adsp", "데이터분석준전문가", "ADsP", "데이터분석 준전문가", "데이터 입문과 분석 기초를 다지기 좋은 자격입니다."),
        ("sqld", "SQLD", "SQLD", "SQL 개발자", "데이터베이스와 SQL 기본기를 확인하기 좋은 대표 자격입니다."),
        ("sqlp", "SQL 전문가", "SQLP", "SQL 전문가", "고급 SQL 설계와 튜닝 역량까지 보는 상위 자격입니다."),
        ("dap", "데이터아키텍처전문가", "DAP", "데이터아키텍처 전문가", "데이터 구조와 아키텍처 설계 중심의 상위 자격입니다."),
        ("dasp", "데이터아키텍처준전문가", "DAsP", "데이터아키텍처 준전문가", "데이터 모델링과 아키텍처 기초를 익히는 데 유용합니다."),
    ]
    for slug, name, short_name, title, description in dataq_single_specs:
        schedules = parse_dataq_single_schedule(dataq_html, title) if dataq_html else []
        if schedules:
            payload["today_alerts"].extend(_decorate_single_stage_schedules(schedules, today, name=name))
        payload["items"].append(
            _build_item(
                slug=slug,
                name=name,
                short_name=short_name,
                source="KDATA DataQ",
                official_url=DATAQ_SCHEDULE_URL,
                apply_url=DATAQ_APPLY_URL,
                apply_label="DataQ에서 신청",
                description=description,
                exam_structure=["필기"],
                **meta_for(slug),
                schedules=schedules,
                error=dataq_error,
            )
        )

    kait_ai_html = ""
    kait_ai_error = ""
    try:
        kait_ai_html = _fetch_html(KAIT_AI_SCHEDULE_URL)
    except requests.RequestException:
        kait_ai_error = "KAIT AI 자격 일정을 불러오지 못했습니다."
    ai_basic_schedules = parse_kait_ai_basic_schedule(kait_ai_html) if kait_ai_html else []
    prompt_schedules = parse_kait_prompt_schedule(kait_ai_html) if kait_ai_html else []
    if ai_basic_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(ai_basic_schedules, today, name="AI활용능력", part_label="AI상식"))
    if prompt_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(prompt_schedules, today, name="프롬프트엔지니어", part_label="프롬프트"))

    payload["items"].append(
        _build_item(
            slug="ai-literacy",
            name="AI활용능력",
            short_name="AI활용",
            source="KAIT",
            official_url=KAIT_AI_SCHEDULE_URL,
            apply_url=KAIT_APPLY_URL,
            apply_label="KAIT에서 신청",
            description="AI 상식과 활용 역량을 빠르게 확인하기 좋은 디지털 자격입니다.",
            exam_structure=["필기"],
            **meta_for("ai-literacy"),
            schedules=ai_basic_schedules,
            error=kait_ai_error,
        )
    )
    payload["items"].append(
        _build_item(
            slug="prompt-engineer",
            name="프롬프트엔지니어",
            short_name="AI프롬프트",
            source="KAIT",
            official_url=KAIT_AI_SCHEDULE_URL,
            apply_url=KAIT_APPLY_URL,
            apply_label="KAIT에서 신청",
            description="프롬프트 설계와 생성형 AI 활용 역량을 직접적으로 보여주는 최신 자격입니다.",
            exam_structure=["1급", "2급"],
            **meta_for("prompt-engineer"),
            schedules=prompt_schedules,
            error=kait_ai_error,
        )
    )

    linux_html = ""
    linux_error = ""
    try:
        linux_html = _fetch_html(KAIT_LINUX_SCHEDULE_URL)
    except requests.RequestException:
        linux_error = "리눅스마스터 일정을 불러오지 못했습니다."
    linux_schedules = parse_kait_linux_schedule(linux_html) if linux_html else []
    if linux_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(linux_schedules, today, name="리눅스마스터"))
    payload["items"].append(
        _build_item(
            slug="linux-master",
            name="리눅스마스터",
            short_name="리눅스",
            source="KAIT",
            official_url=KAIT_LINUX_SCHEDULE_URL,
            apply_url=KAIT_APPLY_URL,
            apply_label="KAIT에서 신청",
            description="서버, 인프라, 보안 기초와 연결되는 대표 리눅스 자격입니다.",
            exam_structure=["1급", "2급", "1차", "2차"],
            **meta_for("linux-master"),
            schedules=linux_schedules,
            error=linux_error,
        )
    )

    kpc_html = ""
    kpc_error = ""
    try:
        kpc_html = _fetch_html(KPC_DASHBOARD_URL)
    except requests.RequestException:
        kpc_error = "KPC 일정 정보를 불러오지 못했습니다."

    ai_pot_schedules = parse_kpc_dashboard_schedule(kpc_html, r"AI-POT") if kpc_html else []
    aibt_schedules = parse_kpc_dashboard_schedule(kpc_html, r"AIBT") if kpc_html else []
    itq_schedules = parse_kpc_dashboard_schedule(kpc_html, r"ITQ") if kpc_html else []
    sw_coding_schedules = parse_kpc_dashboard_schedule(kpc_html, r"SW코딩") if kpc_html else []
    if ai_pot_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(ai_pot_schedules, today, name="AI-POT"))
    if aibt_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(aibt_schedules, today, name="AIBT"))
    if itq_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(itq_schedules, today, name="ITQ"))
    if sw_coding_schedules:
        payload["today_alerts"].extend(_decorate_single_stage_schedules(sw_coding_schedules, today, name="SW코딩자격"))

    payload["items"].extend(
        [
            _build_item(
                slug="information-security-engineer",
                name="정보보안기사",
                short_name="정보보안",
                source="Q-Net",
                official_url=QNET_INFORMATION_SECURITY_ENGINEER_URL,
                apply_url=QNET_APPLY_URL,
                apply_label="Q-Net에서 신청",
                description="보안, 침해대응, 포렌식 기초로 이어지는 대표 정보보안 자격입니다.",
                exam_structure=["필기", "실기"],
                **meta_for("information-security-engineer"),
            ),
            _build_item(
                slug="web-design-craftsman",
                name="웹디자인기능사",
                short_name="웹디자인",
                source="Q-Net",
                official_url=QNET_WEB_DESIGN_CRAFTSMAN_URL,
                apply_url=QNET_APPLY_URL,
                apply_label="Q-Net에서 신청",
                description="웹 퍼블리싱과 디자인 기초 역량을 함께 보여주기 좋은 국가기술자격입니다.",
                exam_structure=["필기", "실기"],
                **meta_for("web-design-craftsman"),
            ),
            _build_item(
                slug="computer-specialist",
                name="컴퓨터활용능력",
                short_name="컴활",
                source="대한상공회의소",
                official_url=KORCHAM_COMPUTER_SPECIALIST_URL,
                apply_url=KORCHAM_COMPUTER_SPECIALIST_URL,
                apply_label="상공회의소에서 신청",
                description="문서, 스프레드시트, 실무 OA 역량을 증명하는 대표 자격입니다.",
                exam_structure=["1급", "2급"],
                **meta_for("computer-specialist"),
            ),
            _build_item(
                slug="digital-forensics",
                name="디지털포렌식전문가",
                short_name="포렌식",
                source="한국포렌식학회",
                official_url=FORENSICS_EXAM_URL,
                apply_url=FORENSICS_EXAM_URL,
                apply_label="공식 사이트 보기",
                description="디지털 증거 분석과 보존 절차를 다루는 포렌식 계열 자격입니다.",
                exam_structure=["필기", "실기"],
                **meta_for("digital-forensics"),
            ),
            _build_item(
                slug="ai-pot",
                name="AI-POT(AI프롬프트활용능력)",
                short_name="AI-POT",
                source="한국생산성본부",
                official_url=KPC_AI_POT_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="생성형 AI 프롬프트 설계와 실무 활용력을 보는 AI 계열 자격입니다.",
                exam_structure=["필기"],
                **meta_for("ai-pot"),
                schedules=ai_pot_schedules,
                error=kpc_error,
            ),
            _build_item(
                slug="aibt",
                name="AIBT(AI 비즈니스 활용능력)",
                short_name="AIBT",
                source="한국생산성본부",
                official_url=KPC_AIBT_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="AI 도구를 비즈니스와 업무에 연결하는 활용 역량을 확인하는 자격입니다.",
                exam_structure=["필기"],
                **meta_for("aibt"),
                schedules=aibt_schedules,
                error=kpc_error,
            ),
            _build_item(
                slug="gtq-ai",
                name="GTQ-AI",
                short_name="GTQ-AI",
                source="한국생산성본부",
                official_url=KPC_GTQ_AI_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="그래픽 도구와 생성형 AI를 결합한 최신 실무형 자격입니다.",
                exam_structure=["실기"],
                **meta_for("gtq-ai"),
            ),
            _build_item(
                slug="sw-coding",
                name="SW코딩자격",
                short_name="SW코딩",
                source="한국생산성본부",
                official_url=KPC_SW_CODING_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="프로그래밍과 컴퓨팅 사고 기초를 확인하는 코딩 자격입니다.",
                exam_structure=["필기", "실기"],
                **meta_for("sw-coding"),
                schedules=sw_coding_schedules,
                error=kpc_error,
            ),
            _build_item(
                slug="dsac",
                name="DSAC 데이터 사이언티스트 능력인증자격",
                short_name="DSAC",
                source="한국생산성본부",
                official_url=KPC_DSAC_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="데이터 사이언스 실무 감각과 프로젝트형 역량을 보여주기 좋은 자격입니다.",
                exam_structure=["필기"],
                **meta_for("dsac"),
            ),
            _build_item(
                slug="deq",
                name="DEQ(디지털윤리자격)",
                short_name="DEQ",
                source="한국생산성본부",
                official_url=KPC_DEQ_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="AI와 디지털 환경에서 필요한 윤리와 책임 역량을 확인하는 자격입니다.",
                exam_structure=["필기"],
                **meta_for("deq"),
            ),
            _build_item(
                slug="itq",
                name="ITQ(정보기술자격)",
                short_name="ITQ",
                source="한국생산성본부",
                official_url=KPC_ITQ_URL,
                apply_url=KPC_HOME_URL,
                apply_label="KPC에서 신청",
                description="컴퓨터 실무 활용 능력을 빠르게 증명하기 좋은 기본 자격입니다.",
                exam_structure=["한글", "엑셀", "파워포인트"],
                **meta_for("itq"),
                schedules=itq_schedules,
                error=kpc_error,
            ),
        ]
    )

    cache.set(cache_key, payload, int(timedelta(hours=6).total_seconds()))
    return payload
