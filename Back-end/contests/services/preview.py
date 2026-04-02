import re
from html import unescape
from typing import Any

import requests
from bs4 import BeautifulSoup
from django.core.cache import cache

from contests.models import Contest
from users.ai_services import call_openai_json_schema, is_openai_configured

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
)
_ONE_DAY = 60 * 60 * 24


def fetch_contest_page_context(url: str) -> dict[str, str]:
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=15,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    page_title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    meta_description = ""
    meta = soup.select_one('meta[name="description"]') or soup.select_one('meta[property="og:description"]')
    if meta and meta.get("content"):
        meta_description = meta["content"].strip()

    heading_lines = [
        re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()
        for node in soup.select("h1, h2, h3")[:8]
        if node.get_text(" ", strip=True)
    ]

    return {
        "page_title": page_title[:300],
        "meta_description": meta_description[:800],
        "heading_excerpt": "\n".join(heading_lines[:8])[:1200],
    }


def parse_detail_sections(description: str) -> list[dict[str, Any]]:
    text = unescape(description or "")
    text = text.replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []

    chunks = [chunk.strip() for chunk in text.split("■") if chunk.strip()]
    sections: list[dict[str, Any]] = []

    for chunk in chunks[:8]:
        lines = [line.strip(" -•·") for line in re.split(r"(?=- )|(?=※)|(?=· )", chunk) if line.strip()]
        if not lines:
            continue

        head = lines[0]
        label, _, first_value = head.partition(":")
        if not _:
            label, _, first_value = head.partition("-")

        label = re.sub(r"\s+", " ", label).strip()
        values: list[str] = []

        if first_value.strip():
            values.append(first_value.strip())

        for line in lines[1:]:
            cleaned = re.sub(r"\s+", " ", line).strip()
            cleaned = cleaned.lstrip("-•·").strip()
            if cleaned:
                values.append(cleaned)

        if not label:
            continue

        normalized_label = label[:24]
        if not values:
            continue
        if normalized_label == "문의처":
            continue

        sections.append({
            "label": normalized_label,
            "items": values[:4],
        })

    return sections[:6]


def _build_highlights(contest: Contest) -> list[str]:
    return [
        f"주최: {contest.host}",
        f"분야: {contest.category}",
        f"마감: {contest.deadline_at.strftime('%Y.%m.%d') if contest.deadline_at else '상시'}",
    ]


def _fallback_preview(contest: Contest, page_context: dict[str, str] | None = None) -> dict[str, Any]:
    summary_source = contest.content_summary or (page_context or {}).get("meta_description") or ""
    if summary_source:
        summary = re.sub(r"\s+", " ", summary_source).strip()[:220]
    else:
        summary = (
            f"{contest.host}에서 진행하는 {contest.category} 분야 공모전입니다. "
            f"마감은 {contest.deadline_at.strftime('%Y.%m.%d') if contest.deadline_at else '상시'}입니다."
        )

    return {
        "summary": summary,
        "highlights": _build_highlights(contest),
        "detail_sections": parse_detail_sections((page_context or {}).get("meta_description", "")),
        "action_hint": "지원 자격, 제출 형식, 시상 내역은 상세 페이지에서 최종 확인하세요.",
        "generated_by": "fallback",
    }


def generate_contest_preview(contest: Contest, page_context: dict[str, str]) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "action_hint": {"type": "string"},
        },
        "required": ["summary", "action_hint"],
        "additionalProperties": False,
    }

    result = call_openai_json_schema(
        model="gpt-4.1-mini",
        schema_name="contest_preview",
        schema=schema,
        system_prompt=(
            "너는 공모전 카드에서 보여줄 아주 짧은 소개 문장을 정리하는 도우미다. "
            "입력으로 주어진 필드에 있는 사실만 사용한다. "
            "지원 혜택, 상금, 활동기간, 모집 대상, 우대사항은 입력에 명시적으로 없으면 절대 쓰지 않는다. "
            "summary는 1~2문장으로 작성하고, 주최·분야·마감 정도의 범위에서만 설명한다. "
            "추측, 보완, 일반론, 홍보 문구를 넣지 않는다. "
            "action_hint는 상세 페이지 확인이 필요하다는 짧은 안내로 작성한다."
        ),
        user_prompt=(
            f"[공모전 제목]\n{contest.title}\n\n"
            f"[주최]\n{contest.host}\n\n"
            f"[분야]\n{contest.category}\n\n"
            f"[마감]\n{contest.deadline_at.strftime('%Y.%m.%d') if contest.deadline_at else '상시'}\n\n"
            f"[기존 요약]\n{contest.content_summary or '없음'}\n\n"
            f"[페이지 제목]\n{page_context.get('page_title', '') or '없음'}\n\n"
            f"[메타 설명]\n{page_context.get('meta_description', '') or '없음'}\n\n"
            f"[제목 추출]\n{page_context.get('heading_excerpt', '') or '없음'}"
        ),
    )

    return {
        "summary": result["summary"].strip(),
        "highlights": _build_highlights(contest),
        "detail_sections": parse_detail_sections(page_context.get("meta_description", "")),
        "action_hint": result["action_hint"].strip(),
        "generated_by": "ai",
    }


def get_contest_preview(contest: Contest) -> dict[str, Any]:
    version = int(contest.updated_at.timestamp()) if contest.updated_at else 0
    cache_key = f"contest_preview_v2_{contest.id}_{version}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    page_context: dict[str, str] | None = None

    try:
        page_context = fetch_contest_page_context(contest.external_url)
    except Exception:
        page_context = None

    if is_openai_configured() and page_context:
        try:
            payload = generate_contest_preview(contest, page_context)
        except Exception:
            payload = _fallback_preview(contest, page_context)
    else:
        payload = _fallback_preview(contest, page_context)

    payload = {
        **payload,
        "contest_id": contest.id,
        "title": contest.title,
        "external_url": contest.external_url,
    }

    cache.set(cache_key, payload, timeout=_ONE_DAY)
    return payload
