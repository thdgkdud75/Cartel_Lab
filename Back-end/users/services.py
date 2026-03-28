from __future__ import annotations

import re
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from django.conf import settings

from .ai_services import (
    extract_portfolio_review_source,
    extract_portfolio_feedback_candidates,
    generate_ai_profile,
    generate_portfolio_feedback_item,
    is_openai_configured,
)


GITHUB_API_BASE = "https://api.github.com"
PROFILE_SKILL_KEYWORDS = (
    "python",
    "django",
    "fastapi",
    "flask",
    "java",
    "spring",
    "kotlin",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "vue",
    "node",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "git",
    "linux",
    "html",
    "css",
)

ROLE_GUIDE_KEYWORDS = {
    "frontend": ("frontend", "프론트", "react", "vue", "typescript", "javascript", "html", "css"),
    "backend": ("backend", "백엔드", "server", "api", "django", "spring", "fastapi", "flask", "java"),
    "ai": ("ai", "ml", "머신러닝", "딥러닝", "llm", "vision", "nlp", "data scientist"),
    "devops": ("devops", "infra", "cloud", "docker", "kubernetes", "ci/cd", "sre"),
    "mobile": ("mobile", "앱", "android", "ios", "flutter", "swift", "kotlin"),
    "data": ("data", "데이터", "etl", "pipeline", "분석", "warehouse", "sql"),
}

REVIEW_SECTION_EXCLUDE_KEYWORDS = (
    "기술 스택",
    "보유 기술",
    "tech stack",
    "skills",
    "skill",
    "사용 기술",
    "핵심 기술",
    "language",
    "languages",
    "연락처",
    "이메일",
    "email",
    "phone",
    "전화번호",
    "자격증",
    "certificate",
)
REVIEW_SECTION_INCLUDE_KEYWORDS = (
    "프로젝트",
    "경험",
    "활동",
    "readme",
    "설명",
    "담당",
    "성과",
    "개선",
    "구현",
    "개발",
    "운영",
    "설계",
    "구축",
    "도입",
    "최적화",
    "배포",
)
REVIEW_VERB_KEYWORDS = (
    "구현",
    "개발",
    "개선",
    "운영",
    "설계",
    "구축",
    "도입",
    "최적화",
    "배포",
    "적용",
    "연동",
    "관리",
    "분석",
)


def extract_github_username(value: str) -> str:
    cleaned = (value or "").strip().rstrip("/")
    if not cleaned:
        return ""
    if "github.com" not in cleaned:
        return cleaned.lstrip("@")
    parsed = urlparse(cleaned)
    parts = [part for part in parsed.path.split("/") if part]
    return parts[0] if parts else ""


def fetch_github_analysis(github_url: str) -> dict[str, Any]:
    username = extract_github_username(github_url)
    if not username:
        return {
            "username": "",
            "summary": "",
            "top_languages": [],
        }

    headers = {"Accept": "application/vnd.github+json"}
    token = getattr(settings, "GITHUB_API_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    user_response = requests.get(
        f"{GITHUB_API_BASE}/users/{username}",
        headers=headers,
        timeout=15,
    )
    user_response.raise_for_status()
    user_payload = user_response.json()

    repo_response = requests.get(
        f"{GITHUB_API_BASE}/users/{username}/repos",
        headers=headers,
        params={"sort": "updated", "per_page": 100},
        timeout=15,
    )
    repo_response.raise_for_status()
    repos = repo_response.json()

    language_counter = Counter()
    repo_descriptions = []
    for repo in repos:
        language = (repo.get("language") or "").strip()
        if language:
            language_counter.update([language])
        description = (repo.get("description") or "").strip()
        if description:
            repo_descriptions.append(description)

    top_languages = [name for name, _ in language_counter.most_common(5)]
    summary_parts = []
    if user_payload.get("public_repos") is not None:
        summary_parts.append(f"공개 저장소는 {user_payload['public_repos']}개입니다.")
    if top_languages:
        summary_parts.append(f"주요 사용 언어는 {', '.join(top_languages[:3])}입니다.")
    if repo_descriptions:
        summary_parts.append(f"최근 저장소 설명에서 확인된 핵심 주제는 {repo_descriptions[0][:80]}입니다.")

    return {
        "username": username,
        "summary": " ".join(summary_parts),
        "top_languages": top_languages,
    }


def extract_resume_text(file_field) -> str:
    if not file_field:
        return ""

    suffix = Path(file_field.name).suffix.lower()
    file_field.open("rb")
    try:
        if suffix == ".txt":
            return file_field.read().decode("utf-8", errors="ignore").strip()

        if suffix == ".pdf":
            from pypdf import PdfReader

            reader = PdfReader(file_field)
            return "\n".join((page.extract_text() or "") for page in reader.pages).strip()

        return ""
    finally:
        file_field.close()


def _looks_like_contact_line(line: str) -> bool:
    return bool(
        re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", line)
        or re.search(r"\b01[0-9]-?\d{3,4}-?\d{4}\b", line)
        or "github.com/" in line.lower()
        or "http://" in line.lower()
        or "https://" in line.lower()
    )


def _looks_like_skill_list_line(line: str) -> bool:
    normalized = re.sub(r"[(){}\[\]]", " ", line)
    tokens = [token.strip().lower() for token in re.split(r"[,/|·]+|\s{2,}", normalized) if token.strip()]
    if len(tokens) < 3:
        return False
    alpha_like_tokens = [token for token in tokens if re.search(r"[a-zA-Z+#.]", token)]
    if len(alpha_like_tokens) >= max(3, len(tokens) - 1):
        return True
    known_skill_hits = sum(1 for token in tokens if token in PROFILE_SKILL_KEYWORDS or token.replace(" ", "") in PROFILE_SKILL_KEYWORDS)
    return known_skill_hits >= 3


def build_portfolio_review_input(text: str) -> str:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    if not lines:
        return ""

    filtered_lines: list[str] = []
    in_excluded_section = False

    for line in lines:
        lowered = line.lower()
        compact = re.sub(r"\s+", " ", lowered)

        if _looks_like_contact_line(line):
            continue

        if any(keyword in compact for keyword in REVIEW_SECTION_EXCLUDE_KEYWORDS):
            in_excluded_section = True
            continue

        if in_excluded_section:
            if any(keyword in compact for keyword in REVIEW_SECTION_INCLUDE_KEYWORDS):
                in_excluded_section = False
            elif _looks_like_skill_list_line(line) or len(line) <= 40:
                continue
            else:
                in_excluded_section = False

        if _looks_like_skill_list_line(line):
            continue

        if len(line) < 14 and not any(keyword in compact for keyword in REVIEW_SECTION_INCLUDE_KEYWORDS):
            continue

        if not any(keyword in compact for keyword in REVIEW_SECTION_INCLUDE_KEYWORDS + REVIEW_VERB_KEYWORDS) and len(line) < 28:
            continue

        filtered_lines.append(line)

    if not filtered_lines:
        fallback_lines = [
            line
            for line in lines
            if not _looks_like_contact_line(line) and not _looks_like_skill_list_line(line)
        ]
        return "\n".join(fallback_lines[:40])

    return "\n".join(filtered_lines[:50])


def _detect_role_bucket(desired_direction: str) -> str:
    lowered = (desired_direction or "").lower()
    for role, keywords in ROLE_GUIDE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return role
    return ""


def analyze_resume_text(text: str, desired_direction: str = "", market_role_context: dict[str, Any] | None = None) -> dict[str, Any]:
    normalized = (text or "").strip()
    if not normalized:
        return {
            "summary": "",
            "skills": [],
            "recommendation": "",
        }

    lowered = normalized.lower()
    found_skills = [keyword for keyword in PROFILE_SKILL_KEYWORDS if keyword in lowered]
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    summary = " / ".join(lines[:3])[:320]

    recommendations = []
    role_bucket = _detect_role_bucket(desired_direction)
    market_skills = ", ".join((market_role_context or {}).get("major_skills", [])[:4])

    if role_bucket == "frontend" and not any(skill in found_skills for skill in ("react", "typescript", "html", "css")):
        recommendations.append(
            "프론트엔드 방향을 선택했으므로 React와 TypeScript 기반 서비스 화면을 직접 구현한 근거가 필요합니다. "
            "예를 들어 대시보드나 예약 관리 화면을 만들고, 컴포넌트 구조와 상태 관리 방식, 반응형 대응 방식을 README에 정리하십시오."
        )
    if role_bucket == "backend" and not any(skill in found_skills for skill in ("django", "spring", "fastapi", "sql")):
        recommendations.append(
            "백엔드 방향을 선택했으므로 API 설계와 데이터 처리 경험을 보강할 필요가 있습니다. "
            "예를 들어 로그인, 권한, CRUD가 포함된 REST API 프로젝트를 만들고 ERD, API 명세, 예외 처리 방식을 문서화하십시오."
        )
    if role_bucket == "ai" and not any(skill in found_skills for skill in ("python", "sql")):
        recommendations.append(
            "AI·데이터 방향을 선택했으므로 Python 기반 데이터 처리 근거가 필요합니다. "
            "예를 들어 추천, 분류, 요약 기능 중 하나를 구현하고 데이터 전처리 과정과 모델 평가 지표를 포트폴리오에 정리하십시오."
        )
    if role_bucket == "devops" and not any(skill in found_skills for skill in ("aws", "docker", "linux")):
        recommendations.append(
            "DevOps 방향을 선택했으므로 배포 자동화와 운영 경험을 보여줄 필요가 있습니다. "
            "예를 들어 Docker와 GitHub Actions로 배포 자동화 파이프라인을 만들고, 배포 순서와 장애 대응 포인트를 README에 남기십시오."
        )

    if "aws" not in found_skills and "docker" not in found_skills:
        recommendations.append("배포 경험이 부족합니다. Django 또는 Spring 기반 프로젝트를 AWS EC2나 Docker로 배포하고, README에 배포 구조와 실행 방법을 정리한 예시를 추가하십시오.")
    if "sql" not in found_skills and "mysql" not in found_skills:
        recommendations.append("데이터베이스 활용 근거가 약합니다. MySQL 또는 PostgreSQL로 게시판, 예약, 일정 관리와 같은 CRUD 프로젝트를 만들고 테이블 설계 이유와 주요 SQL 예시를 함께 정리하십시오.")
    if "git" not in found_skills:
        recommendations.append("협업 경험이 약하게 보입니다. Git 브랜치 전략, Pull Request, 코드 리뷰 기록이 남는 팀 프로젝트를 진행하고 협업 과정과 역할 분담을 포트폴리오에 명시하십시오.")
    if not recommendations:
        recommendations.append("프로젝트 설명을 더 구체화할 필요가 있습니다. 기능 구현 목록만 적지 말고, 예를 들어 응답 속도 개선, 비용 절감, 사용자 수 변화처럼 수치가 드러나는 성과를 함께 작성하십시오.")
    elif market_skills:
        recommendations.append(
            f"현재 선택한 방향의 최근 공고에서는 {market_skills} 요구가 자주 확인됩니다. "
            "관련 기술을 사용한 결과물을 하나 이상 준비하고, 사용 이유와 적용 범위를 포트폴리오에 명시하십시오."
        )

    return {
        "summary": summary,
        "skills": found_skills[:10],
        "recommendation": " ".join(recommendations),
    }


def format_portfolio_feedback(feedback_items: list[dict[str, Any]]) -> str:
    sections = []
    for item in feedback_items:
        problem_sentence = (item.get("problem_sentence") or "").strip()
        problem_points = [point.strip() for point in item.get("problem_points", []) if str(point).strip()]
        improvement_points = [point.strip() for point in item.get("improvement_points", []) if str(point).strip()]
        before_example = (item.get("before_example") or "").strip()
        after_example = (item.get("after_example") or "").strip()
        if not any([problem_sentence, problem_points, improvement_points, before_example, after_example]):
            continue

        section_lines = ["문제 문장"]
        section_lines.append(problem_sentence or before_example or "입력 문장에서 보완 대상이 확인되었습니다.")
        section_lines.append("")
        section_lines.append("문제점")
        for point in problem_points or ["성과나 기술 근거가 부족합니다."]:
            section_lines.append(f"- {point}")
        section_lines.append("")
        section_lines.append("개선 방향")
        for point in improvement_points or ["사용 기술, 해결한 문제, 결과를 함께 드러내도록 수정합니다."]:
            section_lines.append(f"- {point}")
        section_lines.append("")
        section_lines.append("수정 예시")
        section_lines.append("Before")
        section_lines.append(before_example or problem_sentence or "기존 문장이 제공되지 않았습니다.")
        section_lines.append("")
        section_lines.append("After")
        section_lines.append(after_example or "수정 예시를 생성하지 못했습니다.")
        sections.append("\n".join(section_lines))

    return "\n\n--------------------------------\n\n".join(sections)


def build_profile_analysis(
    github_url: str,
    resume_file,
    desired_direction: str = "",
    market_role_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    github_analysis = fetch_github_analysis(github_url) if github_url else {
        "username": "",
        "summary": "",
        "top_languages": [],
    }
    resume_text = extract_resume_text(resume_file) if resume_file else ""
    resume_analysis = analyze_resume_text(
        resume_text,
        desired_direction=desired_direction,
        market_role_context=market_role_context,
    )

    stored_payload = {
        "github_username": github_analysis["username"],
        "github_profile_summary": github_analysis["summary"],
        "github_top_languages": ", ".join(github_analysis["top_languages"]),
        "resume_extracted_text": resume_text,
        "resume_analysis_summary": resume_analysis["summary"],
        "analysis_recommendation": resume_analysis["recommendation"],
        "ai_profile_summary": "",
        "ai_profile_payload": {},
        "ai_profile_error": "",
    }

    if is_openai_configured() and (resume_text or github_analysis["summary"]):
        try:
            ai_profile = generate_ai_profile(
                github_summary=github_analysis["summary"],
                github_languages=", ".join(github_analysis["top_languages"]),
                resume_summary=resume_analysis["summary"],
                resume_text=resume_text,
                desired_direction=desired_direction,
                market_role_context=market_role_context,
            )
            stored_payload["ai_profile_summary"] = ai_profile.get("summary", "")
            stored_payload["ai_profile_payload"] = ai_profile
            portfolio_review_input = build_portfolio_review_input(resume_text)
            review_source_lines = extract_portfolio_review_source(
                github_summary=github_analysis["summary"],
                resume_summary=resume_analysis["summary"],
                resume_text=portfolio_review_input,
            )
            review_source_text = "\n".join(review_source_lines) or portfolio_review_input or resume_text
            feedback_candidates = extract_portfolio_feedback_candidates(
                github_summary=github_analysis["summary"],
                resume_summary=resume_analysis["summary"],
                review_source_text=review_source_text,
            )
            feedback_items = []
            for candidate in feedback_candidates:
                feedback_items.append(
                    generate_portfolio_feedback_item(
                        candidate_sentence=candidate,
                        github_summary=github_analysis["summary"],
                        resume_summary=resume_analysis["summary"],
                        resume_text=review_source_text,
                        desired_direction=desired_direction,
                        market_role_context=market_role_context,
                    )
                )
            portfolio_feedback = format_portfolio_feedback(feedback_items)
            if portfolio_feedback:
                stored_payload["analysis_recommendation"] = portfolio_feedback
        except Exception as exc:
            stored_payload["ai_profile_error"] = str(exc)

    return stored_payload
