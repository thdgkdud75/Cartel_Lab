from __future__ import annotations

import json
from typing import Any

import requests
from django.conf import settings


OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


def is_openai_configured() -> bool:
    return bool(getattr(settings, "OPENAI_API_KEY", ""))


def _extract_response_text(payload: dict[str, Any]) -> str:
    if payload.get("output_text"):
        return payload["output_text"]

    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                return content["text"]
    return ""


def call_openai_json_schema(
    *,
    model: str,
    schema_name: str,
    schema: dict[str, Any],
    system_prompt: str,
    user_prompt: str,
) -> dict[str, Any]:
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    response = requests.post(
        OPENAI_RESPONSES_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": system_prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_prompt}],
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": schema_name,
                    "schema": schema,
                    "strict": True,
                }
            },
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    raw_text = _extract_response_text(payload)
    if not raw_text:
        raise RuntimeError("OpenAI 응답에서 구조화된 결과를 읽지 못했습니다.")
    return json.loads(raw_text)


def build_profile_prompt(
    *,
    github_summary: str,
    github_languages: str,
    resume_summary: str,
    resume_text: str,
    desired_direction: str,
    market_role_context: dict[str, Any] | None,
) -> str:
    trimmed_resume = (resume_text or "")[:5000]
    role_context_text = "없음"
    if market_role_context:
        role_context_text = (
            f"직무: {market_role_context.get('role', '')}\n"
            f"비율: {market_role_context.get('ratio', 0)}%\n"
            f"주요 요구 기술: {', '.join(market_role_context.get('major_skills', [])) or '없음'}"
        )
    return (
        "학생 프로필을 구조화된 JSON으로 정리하십시오.\n"
        "반드시 입력 텍스트에 근거한 내용만 사용하고, 과장하거나 존재하지 않는 경험을 만들지 마십시오.\n"
        "요약(summary)은 구어체를 사용하지 않는 문어체 한국어로 2~4문장 이내로 작성하십시오.\n"
        "존칭 표현이나 '님은' 같은 표현은 사용하지 말고, 이력서나 GitHub에 직접 드러난 사실만 정리하십시오.\n"
        "이 단계에서는 학생의 전체 프로필 요약과 직무 방향만 정리하십시오.\n\n"
        f"[학생이 선택한 희망 방향]\n{desired_direction or '미선택'}\n\n"
        f"[시장 분석 참고]\n{role_context_text}\n\n"
        f"[GitHub 요약]\n{github_summary or '없음'}\n\n"
        f"[GitHub 주요 언어]\n{github_languages or '없음'}\n\n"
        f"[이력서 요약]\n{resume_summary or '없음'}\n\n"
        f"[이력서 원문 일부]\n{trimmed_resume or '없음'}"
    )


def generate_ai_profile(
    *,
    github_summary: str,
    github_languages: str,
    resume_summary: str,
    resume_text: str,
    desired_direction: str,
    market_role_context: dict[str, Any] | None,
) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "summary": {"type": "string"},
            "target_roles": {"type": "array", "items": {"type": "string"}},
            "core_skills": {"type": "array", "items": {"type": "string"}},
            "project_evidence": {"type": "array", "items": {"type": "string"}},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "gaps": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "부족한 점과 함께, 어떤 프로젝트나 결과물로 보완하면 좋은지 예시를 포함한 문장",
                },
            },
            "study_priorities": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "무엇을 어떤 방식으로 공부하고, 어떤 산출물로 남기면 되는지 예시를 포함한 실행 문장",
                },
            },
        },
        "required": [
            "summary",
            "target_roles",
            "core_skills",
            "project_evidence",
            "strengths",
            "gaps",
            "study_priorities",
        ],
        "additionalProperties": False,
    }
    return call_openai_json_schema(
        model=getattr(settings, "OPENAI_PROFILE_MODEL", "gpt-4.1-mini"),
        schema_name="student_profile_analysis",
        schema=schema,
        system_prompt=(
            "너는 채용 공고 추천 시스템의 프로필 정규화 분석기다. "
            "학생의 이력서와 GitHub 정보를 읽고, 추천에 재사용할 수 있는 구조화 프로필을 만든다. "
            "모든 서술은 문어체 한국어로 작성하고, 구어체, 대화체, 과도한 수식, 인칭 호칭을 사용하지 않는다. "
            "학생이 선택한 희망 방향이 있으면 그 방향을 중심으로 strengths, gaps, study_priorities를 작성한다. "
            "시장 분석 참고가 주어지면 주요 요구 기술을 반영해 보완점을 조정한다. "
            "gaps와 study_priorities는 반드시 실행 예시를 포함해야 하며, "
            "'무엇이 부족하다'에서 끝내지 말고 '어떤 기술로 어떤 프로젝트를 만들어 어떤 식으로 정리할지'까지 제시한다."
        ),
        user_prompt=build_profile_prompt(
            github_summary=github_summary,
            github_languages=github_languages,
            resume_summary=resume_summary,
            resume_text=resume_text,
            desired_direction=desired_direction,
            market_role_context=market_role_context,
        ),
    )


def build_job_prompt(*, ai_profile: dict[str, Any], job_payload: dict[str, Any]) -> str:
    return (
        "학생 프로필과 공고를 비교해 추천 여부를 JSON으로 판단해 주세요.\n"
        "반드시 입력에 있는 근거만 사용하고, 점수는 0~100 정수로 주세요.\n\n"
        f"[학생 프로필]\n{json.dumps(ai_profile, ensure_ascii=False)}\n\n"
        f"[공고 정보]\n{json.dumps(job_payload, ensure_ascii=False)}"
    )


def generate_job_recommendation(*, ai_profile: dict[str, Any], job_payload: dict[str, Any]) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "fit_score": {"type": "integer"},
            "summary": {"type": "string"},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "gaps": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "보완이 필요한 점과 함께, 어떤 프로젝트나 문서로 보완하면 되는지 예시를 포함한 문장",
                },
            },
            "study_plan": {
                "type": "array",
                "items": {
                    "type": "string",
                    "description": "어떤 기술을 어떤 방식으로 학습하고, 어떤 결과물로 증명할지 예시를 포함한 실행 문장",
                },
            },
        },
        "required": ["fit_score", "summary", "strengths", "gaps", "study_plan"],
        "additionalProperties": False,
    }
    return call_openai_json_schema(
        model=getattr(settings, "OPENAI_JOB_MODEL", "gpt-4.1-mini"),
        schema_name="job_fit_analysis",
        schema=schema,
        system_prompt=(
            "너는 학생 맞춤 채용 추천 분석기다. "
            "학생 프로필과 채용 공고를 비교해서 강점, 부족한 부분, 추천 학습 포인트를 정리한다. "
            "반드시 다음 규칙을 따른다.\n"
            "1. strengths는 반드시 '이 공고의 [요구사항 또는 기술]'에 해당하는 학생의 강점만 쓴다. "
            "   공고와 무관한 일반적인 강점은 쓰지 않는다. "
            "   예: '공고에서 요구하는 React를 보유 중이며 관련 프로젝트 경험이 있음' 형식으로 작성한다.\n"
            "2. gaps는 이 공고에서 요구하지만 학생이 부족한 구체적인 기술이나 경험을 지적한다. "
            "   어떤 프로젝트나 결과물로 보완하면 되는지 예시를 포함한다.\n"
            "3. study_plan은 이 공고를 준비하기 위한 실행 가능한 학습 계획을 제시한다. "
            "   어떤 기술을 어떤 방식으로 학습하고, 어떤 결과물로 증명할지 구체적으로 쓴다.\n"
            "4. summary는 이 공고에 대한 전반적인 적합도를 1~2문장으로 요약한다."
        ),
        user_prompt=build_job_prompt(ai_profile=ai_profile, job_payload=job_payload),
    )


def build_portfolio_review_source_prompt(*, github_summary: str, resume_summary: str, resume_text: str) -> str:
    trimmed_resume = (resume_text or "")[:5000]
    return (
        "아래 이력서 및 GitHub 정보에서 실제 리뷰 대상이 되는 프로젝트 설명 문장만 추려내십시오.\n"
        "반드시 프로젝트, 경험, 활동, README 설명처럼 서술형 문장만 고르십시오.\n"
        "기술 스택 목록, 보유 기술 섹션, 연락처, 이름, 이메일, 전화번호, 자격증 목록, 짧은 키워드 나열은 제외하십시오.\n"
        "문장 교정 가치가 있는 설명만 최대 12개까지 반환하십시오.\n\n"
        f"[GitHub 요약]\n{github_summary or '없음'}\n\n"
        f"[이력서 요약]\n{resume_summary or '없음'}\n\n"
        f"[이력서 검토용 원문]\n{trimmed_resume or '없음'}"
    )


def extract_portfolio_review_source(*, github_summary: str, resume_summary: str, resume_text: str) -> list[str]:
    schema = {
        "type": "object",
        "properties": {
            "review_source": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["review_source"],
        "additionalProperties": False,
    }
    result = call_openai_json_schema(
        model=getattr(settings, "OPENAI_PROFILE_MODEL", "gpt-4.1-mini"),
        schema_name="portfolio_review_source",
        schema=schema,
        system_prompt=(
            "너는 소프트웨어 엔지니어 이력서 리뷰를 위한 문장 선별기다. "
            "이 단계에서는 프로젝트 설명, README 설명, 경험 서술처럼 실제로 고칠 가치가 있는 서술형 문장만 추려낸다. "
            "기술 스택 목록이나 상단 보유 기술 섹션은 정상적인 이력서 구성 요소이므로 리뷰 대상으로 뽑지 않는다. "
            "불필요한 지적은 금지하고, 실제 문장 개선에 도움이 되는 항목만 남긴다."
        ),
        user_prompt=build_portfolio_review_source_prompt(
            github_summary=github_summary,
            resume_summary=resume_summary,
            resume_text=resume_text,
        ),
    )
    return [item.strip() for item in result.get("review_source", []) if str(item).strip()]


def build_portfolio_source_prompt(*, github_summary: str, resume_summary: str, review_source_text: str) -> str:
    trimmed_review_source = (review_source_text or "")[:4500]
    return (
        "아래 프로젝트 설명 문장 중 실제 문장 교정이 필요한 약한 문장 후보만 추출하십시오.\n"
        "프로젝트 설명, 경험 서술, README 설명만 대상으로 하십시오.\n"
        "기술 스택 목록, 보유 기술 섹션, 상단 한줄 소개, 연락처는 문제 문장으로 뽑지 마십시오.\n"
        "기능 나열식 설명, 추상적 표현, 성과가 빠진 문장, 역할이 모호한 문장을 우선 추출하십시오.\n"
        "불필요한 지적은 금지하며, 실제로 수정 가치가 있는 문장만 최대 8개까지 추출하십시오.\n\n"
        f"[GitHub 요약]\n{github_summary or '없음'}\n\n"
        f"[이력서 요약]\n{resume_summary or '없음'}\n\n"
        f"[리뷰 대상 프로젝트 설명]\n{trimmed_review_source or '없음'}"
    )


def extract_portfolio_feedback_candidates(*, github_summary: str, resume_summary: str, review_source_text: str) -> list[str]:
    schema = {
        "type": "object",
        "properties": {
            "candidates": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["candidates"],
        "additionalProperties": False,
    }
    result = call_openai_json_schema(
        model=getattr(settings, "OPENAI_PROFILE_MODEL", "gpt-4.1-mini"),
        schema_name="portfolio_feedback_candidates",
        schema=schema,
        system_prompt=(
            "너는 소프트웨어 엔지니어 포트폴리오와 이력서를 리뷰하는 전문가이다. "
            "사용자가 제공한 프로젝트 설명, GitHub README, 이력서 내용을 분석하여 "
            "추상적인 표현, 성과가 드러나지 않는 문장, 기능 나열식 설명을 찾아낸다. "
            "이 단계에서는 수정하지 말고 보완이 필요한 원문 문장 후보만 추출한다. "
            "기술 스택 목록 자체는 문제로 간주하지 말고, 설명 문장만 평가하라."
        ),
        user_prompt=build_portfolio_source_prompt(
            github_summary=github_summary,
            resume_summary=resume_summary,
            review_source_text=review_source_text,
        ),
    )
    return [item.strip() for item in result.get("candidates", []) if str(item).strip()]


def build_portfolio_feedback_prompt(
    *,
    candidate_sentence: str,
    github_summary: str,
    resume_summary: str,
    resume_text: str,
    desired_direction: str,
    market_role_context: dict[str, Any] | None,
) -> str:
    trimmed_resume = (resume_text or "")[:4500]
    role_context_text = "없음"
    if market_role_context:
        role_context_text = (
            f"직무: {market_role_context.get('role', '')}\n"
            f"주요 요구 기술: {', '.join(market_role_context.get('major_skills', [])) or '없음'}"
        )
    return (
        "다음 문장을 실제 이력서와 README에 바로 사용할 수 있게 개선하십시오.\n"
        "출력은 구조화된 JSON으로만 작성하고, 반드시 입력 내용에 근거한 정보만 사용하십시오.\n\n"
        f"[보완 대상 문장]\n{candidate_sentence}\n\n"
        f"[희망 방향]\n{desired_direction or '미선택'}\n\n"
        f"[시장 분석 참고]\n{role_context_text}\n\n"
        f"[GitHub 요약]\n{github_summary or '없음'}\n\n"
        f"[이력서 요약]\n{resume_summary or '없음'}\n\n"
        f"[관련 프로젝트 설명 모음]\n{trimmed_resume or '없음'}"
    )


def generate_portfolio_feedback_item(
    *,
    candidate_sentence: str,
    github_summary: str,
    resume_summary: str,
    resume_text: str,
    desired_direction: str,
    market_role_context: dict[str, Any] | None,
) -> dict[str, Any]:
    schema = {
        "type": "object",
        "properties": {
            "problem_sentence": {"type": "string"},
            "problem_points": {"type": "array", "items": {"type": "string"}},
            "improvement_points": {"type": "array", "items": {"type": "string"}},
            "before_example": {"type": "string"},
            "after_example": {"type": "string"},
        },
        "required": [
            "problem_sentence",
            "problem_points",
            "improvement_points",
            "before_example",
            "after_example",
        ],
        "additionalProperties": False,
    }
    return call_openai_json_schema(
        model=getattr(settings, "OPENAI_PROFILE_MODEL", "gpt-4.1-mini"),
        schema_name="portfolio_feedback_item",
        schema=schema,
        system_prompt=(
            "너는 소프트웨어 엔지니어 포트폴리오와 이력서를 리뷰하는 전문가이다. "
            "사용자가 제공한 프로젝트 설명, GitHub README, 또는 이력서 내용을 분석하여 "
            "추상적인 표현, 성과가 드러나지 않는 문장, 기능 나열식 설명을 찾아내고 "
            "더 설득력 있는 프로젝트 설명으로 수정하는 역할을 수행한다. "
            "기술 스택 목록 자체는 비판하지 말고, 프로젝트 설명 문장만 다뤄라. "
            "다음 규칙을 반드시 따른다. "
            "1. 기능 나열식 설명을 지적한다. "
            "2. 추상적인 표현을 구체적인 기술 설명으로 바꾼다. "
            "3. 가능하면 성능 개선, 비용 절감, 구조 개선 등 결과 중심 문장으로 수정한다. "
            "4. 실제 이력서에 바로 사용할 수 있는 문장 형태로 수정한다. "
            "단순히 '더 구체적으로 작성하세요' 같은 추상적인 조언은 금지한다. "
            "개선 방향은 프롬프트 규칙을 반복하지 말고, 해당 문장에서 추가해야 할 구체 정보만 써라. "
            "개선 방향에는 사용 기술, 맡은 역할, 해결한 문제, 결과 수치 중 빠진 항목을 짚어라. "
            "After 문장은 사용 기술, 해결한 문제, 개선된 결과, 성능/비용/구조 개선 요소를 가능한 범위에서 포함하라."
        ),
        user_prompt=build_portfolio_feedback_prompt(
            candidate_sentence=candidate_sentence,
            github_summary=github_summary,
            resume_summary=resume_summary,
            resume_text=resume_text,
            desired_direction=desired_direction,
            market_role_context=market_role_context,
        ),
    )
