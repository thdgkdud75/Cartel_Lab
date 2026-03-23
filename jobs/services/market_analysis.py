from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

from jobs.models import JobMarketSnapshot, JobPosting
from users.ai_services import call_openai_json_schema, is_openai_configured


MARKET_ANALYSIS_KEY = "active_jobs"
MARKET_ANALYSIS_SAMPLE_LIMIT = 60
MARKET_ANALYSIS_REFRESH_HOUR = 12  # 매일 이 시간 이후 첫 접근 시 갱신

ROLE_RULES = {
    "AI / ML Engineer": ("ai", "ml", "머신러닝", "딥러닝", "llm", "vision", "nlp", "data scientist"),
    "Web Backend": ("backend", "백엔드", "server", "api", "spring", "django", "fastapi", "flask"),
    "Frontend": ("frontend", "프론트", "react", "vue", "typescript", "javascript", "html", "css"),
    "Full Stack": ("full stack", "fullstack", "풀스택"),
    "Mobile App": ("android", "ios", "mobile", "flutter", "swift", "kotlin", "react native"),
    "DevOps": ("devops", "infra", "cloud", "docker", "kubernetes", "ci/cd", "sre"),
    "Data Engineer": ("data engineer", "데이터 엔지니어", "etl", "pipeline", "warehouse", "analytics"),
    "QA / Test": ("qa", "test", "테스트", "automation", "품질"),
    "Embedded / Robotics": ("embedded", "임베디드", "firmware", "robot", "ros", "c++", "hardware"),
}


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _split_tokens(value: str) -> list[str]:
    tokens = []
    for raw in re.split(r"[,/\n|()\-:]", value or ""):
        cleaned = _normalize_space(raw)
        if len(cleaned) < 2:
            continue
        tokens.append(cleaned)
    return tokens


def _serialize_job(job: JobPosting) -> dict[str, str]:
    return {
        "title": job.title,
        "company_name": job.company_name,
        "job_role": job.job_role,
        "required_skills": job.required_skills,
        "detail_required_skills": job.detail_required_skills,
        "detail_main_tasks": job.detail_main_tasks,
        "detail_requirements": job.detail_requirements,
        "detail_preferred_points": job.detail_preferred_points,
        "education_level": job.education_level,
        "experience_label": job.experience_label,
    }


def _extract_job_skills(job: JobPosting) -> list[str]:
    source = "\n".join(
        filter(
            None,
            [
                job.required_skills,
                job.detail_required_skills,
                job.detail_requirements,
                job.detail_preferred_points,
            ],
        )
    )
    seen = []
    for token in _split_tokens(source):
        if token not in seen:
            seen.append(token)
    return seen[:8]


def _guess_role(job: JobPosting) -> str:
    combined = " ".join(
        filter(None, [job.title, job.job_role, job.required_skills, job.detail_main_tasks, job.detail_requirements])
    ).lower()
    for label, keywords in ROLE_RULES.items():
        if any(keyword in combined for keyword in keywords):
            return label
    return "General Software"


def build_heuristic_market_breakdown(jobs: list[JobPosting]) -> dict[str, Any]:
    if not jobs:
        return {"summary": "", "role_breakdown": []}

    role_counts: Counter[str] = Counter()
    role_skills: dict[str, Counter[str]] = defaultdict(Counter)
    for job in jobs:
        role = _guess_role(job)
        role_counts.update([role])
        role_skills[role].update(_extract_job_skills(job))

    total = sum(role_counts.values()) or 1
    breakdown = []
    for role, count in role_counts.most_common(8):
        ratio = int(round((count / total) * 100))
        major_skills = [skill for skill, _ in role_skills[role].most_common(5)]
        breakdown.append(
            {
                "role": role,
                "ratio": ratio,
                "major_skills": major_skills,
            }
        )

    if breakdown:
        used = sum(item["ratio"] for item in breakdown[:-1])
        breakdown[-1]["ratio"] = max(1, 100 - used) if len(breakdown) > 1 else 100

    summary = "최근 활성 공고를 기준으로 직무군 비율과 반복 요구 기술을 정리했습니다."
    return {"summary": summary, "role_breakdown": breakdown}


def _build_market_prompt(job_payloads: list[dict[str, str]]) -> str:
    return (
        "너는 소프트웨어 개발 직무 분석가이다.\n\n"
        "최근 개발자 채용 공고 데이터를 분석하여 주요 개발 직무 유형과 요구 기술을 분류하는 역할을 수행한다.\n\n"
        "다음 채용 공고 데이터를 분석하여 개발 직무 유형을 분류하고 비율을 계산해라.\n"
        "반드시 최근 개발 직무 위주로 묶고, role은 사람이 읽기 쉬운 직무명으로 작성해라.\n"
        "ratio는 정수 퍼센트로 작성하고, major_skills는 대표 기술만 3~6개로 정리해라.\n"
        "출력에는 role_breakdown 배열을 내림차순으로 넣어라.\n\n"
        f"[채용 공고 데이터]\n{json.dumps(job_payloads, ensure_ascii=False)}"
    )


def generate_market_breakdown_with_ai(jobs: list[JobPosting]) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "role_breakdown": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string"},
                        "ratio": {"type": "integer"},
                        "major_skills": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["role", "ratio", "major_skills"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["summary", "role_breakdown"],
        "additionalProperties": False,
    }
    return call_openai_json_schema(
        model=getattr(settings, "OPENAI_JOB_MODEL", "gpt-4.1-mini"),
        schema_name="job_market_breakdown",
        schema=schema,
        system_prompt=(
            "너는 소프트웨어 개발 직무 분석가이다. "
            "최근 개발자 채용 공고를 읽고 직무군과 요구 기술을 분류한다. "
            "직무명은 한국어 또는 일반적으로 통용되는 영어 직무명으로 쓰고, "
            "비율은 전체 공고 대비 정수 퍼센트로 계산한다."
        ),
        user_prompt=_build_market_prompt([_serialize_job(job) for job in jobs]),
    )


def _normalize_breakdown(raw_breakdown: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for item in raw_breakdown:
        role = _normalize_space(str(item.get("role", "")))
        if not role:
            continue
        try:
            ratio = int(item.get("ratio", 0))
        except (TypeError, ValueError):
            ratio = 0
        skills = []
        for skill in item.get("major_skills", []):
            cleaned = _normalize_space(str(skill))
            if cleaned and cleaned not in skills:
                skills.append(cleaned)
        normalized.append(
            {
                "role": role,
                "ratio": max(0, min(100, ratio)),
                "major_skills": skills[:6],
            }
        )
    normalized.sort(key=lambda item: item["ratio"], reverse=True)
    if normalized:
        total = sum(item["ratio"] for item in normalized)
        if total and total != 100:
            diff = 100 - total
            normalized[0]["ratio"] = max(0, min(100, normalized[0]["ratio"] + diff))
    return normalized[:8]


def get_market_role_context(snapshot: JobMarketSnapshot | None, selected_role: str) -> dict[str, Any] | None:
    selected = _normalize_space(selected_role)
    if not snapshot or not selected:
        return None
    for item in snapshot.role_breakdown:
        if _normalize_space(item.get("role", "")) == selected:
            return item
    return None


def get_direction_choices(snapshot: JobMarketSnapshot | None) -> list[tuple[str, str]]:
    if not snapshot:
        return []
    return [
        (item["role"], f"{item['role']} ({item['ratio']}%)")
        for item in snapshot.role_breakdown
        if item.get("role")
    ]


def _run_market_refresh(jobs: list, current_total_jobs: int) -> None:
    generator_name = "heuristic"
    if is_openai_configured():
        try:
            raw_result = generate_market_breakdown_with_ai(jobs)
            generator_name = getattr(settings, "OPENAI_JOB_MODEL", "gpt-4.1-mini")
        except Exception:
            raw_result = build_heuristic_market_breakdown(jobs)
    else:
        raw_result = build_heuristic_market_breakdown(jobs)

    JobMarketSnapshot.objects.update_or_create(
        analysis_key=MARKET_ANALYSIS_KEY,
        defaults={
            "total_jobs": current_total_jobs,
            "sampled_job_count": len(jobs),
            "analysis_summary": raw_result.get("summary", ""),
            "role_breakdown": _normalize_breakdown(raw_result.get("role_breakdown", [])),
            "model_name": generator_name,
        },
    )


def _today_refresh_cutoff():
    """오늘 MARKET_ANALYSIS_REFRESH_HOUR시 기준 datetime 반환."""
    now = timezone.localtime()
    cutoff = now.replace(hour=MARKET_ANALYSIS_REFRESH_HOUR, minute=0, second=0, microsecond=0)
    return cutoff


def get_or_refresh_market_snapshot(force: bool = False) -> JobMarketSnapshot | None:
    import threading

    _CACHE_KEY = "market_snapshot"

    # 캐시에서 먼저 확인 (force가 아닐 때만)
    if not force:
        cached = cache.get(_CACHE_KEY)
        if cached is not None:
            return cached

    latest = JobMarketSnapshot.objects.filter(analysis_key=MARKET_ANALYSIS_KEY).first()
    now = timezone.localtime()
    cutoff = _today_refresh_cutoff()

    # 오늘 12시가 지났고, 스냅샷이 그 이전에 만들어진 경우 갱신
    needs_refresh = (
        force
        or latest is None
        or (now >= cutoff and timezone.localtime(latest.analyzed_at) < cutoff)
    )

    if not needs_refresh:
        cache.set(_CACHE_KEY, latest, 60 * 60)  # 1시간 캐시
        return latest

    jobs = list(
        JobPosting.objects.filter(is_active=True)
        .order_by("-posted_at", "-updated_at", "-id")[:MARKET_ANALYSIS_SAMPLE_LIMIT]
    )
    if not jobs:
        return latest

    current_total_jobs = JobPosting.objects.filter(is_active=True).count()

    if latest is None:
        # 스냅샷이 아예 없으면 동기 실행 (첫 로드)
        _run_market_refresh(jobs, current_total_jobs)
        latest = JobMarketSnapshot.objects.filter(analysis_key=MARKET_ANALYSIS_KEY).first()
        cache.set(_CACHE_KEY, latest, 60 * 60)
        return latest

    # 기존 스냅샷이 있으면 백그라운드에서 갱신, 현재 스냅샷 즉시 반환
    threading.Thread(
        target=_run_market_refresh,
        args=(jobs, current_total_jobs),
        daemon=True,
    ).start()
    cache.set(_CACHE_KEY, latest, 60 * 60)
    return latest
