import re
from django.contrib import messages
from django.contrib.auth import login, logout
from django.shortcuts import redirect, render

from .forms import LoginForm, SignupForm

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import BasicInfoForm, LoginForm, ProfileUpdateForm, SignupForm
from .services import build_profile_analysis
from planner.services.market_analysis import (
    get_direction_choices,
    get_market_role_context,
    get_or_refresh_market_snapshot,
)


def format_github_summary_text(summary):
    cleaned = (summary or "").strip()
    if not cleaned:
        return ""

    parts = [part.strip() for part in cleaned.split(" / ") if part.strip()]
    if not parts:
        return cleaned

    formatted = []
    for part in parts:
        if part.startswith("공개 저장소 "):
            formatted.append(part.replace("공개 저장소 ", "공개 저장소는 ") + "입니다.")
        elif part.startswith("주요 언어 "):
            formatted.append(part.replace("주요 언어 ", "주요 사용 언어는 ") + "입니다.")
        elif part.startswith("최근 프로젝트 키워드 "):
            formatted.append(part.replace("최근 프로젝트 키워드 ", "최근 저장소 설명에서 확인된 핵심 주제는 ") + "입니다.")
        else:
            if not part.endswith(("다.", "니다.", ".")):
                part = part + "."
            formatted.append(part)
    return " ".join(formatted)


def format_ai_profile_summary_text(summary, user_name):
    cleaned = (summary or "").strip()
    if not cleaned:
        return ""

    cleaned = re.sub(rf"^{re.escape(user_name)}\s*님은\s*", "이 프로필은 ", cleaned)
    cleaned = re.sub(r"^\S+\s*님은\s*", "이 프로필은 ", cleaned)
    return cleaned


def _normalize_profile_token(value):
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def build_recommended_direction_rows(user, market_snapshot):
    if not market_snapshot:
        return []

    ai_roles = [
        _normalize_profile_token(role)
        for role in (user.ai_profile_payload.get("target_roles", []) if user.ai_profile_payload else [])
        if _normalize_profile_token(role)
    ]
    ai_skills = [
        _normalize_profile_token(skill)
        for skill in (user.ai_profile_payload.get("core_skills", []) if user.ai_profile_payload else [])
        if _normalize_profile_token(skill)
    ]
    profile_text = _normalize_profile_token(
        " ".join(
            filter(
                None,
                [
                    user.resume_extracted_text,
                    user.resume_analysis_summary,
                    user.github_profile_summary,
                    user.ai_profile_summary,
                    user.github_top_languages,
                ],
            )
        )
    )

    recommended = []
    for row in market_snapshot.role_breakdown:
        row_role = row.get("role", "")
        normalized_role = _normalize_profile_token(row_role)
        row_skills = row.get("major_skills", [])
        score = 0
        reasons = []

        if any(target in normalized_role or normalized_role in target for target in ai_roles):
            score += 5
            reasons.append("기존 분석에서 이 방향과 유사한 직무가 확인되었습니다.")

        matched_skills = []
        for skill in row_skills:
            normalized_skill = _normalize_profile_token(skill)
            if normalized_skill and (normalized_skill in profile_text or normalized_skill in ai_skills):
                matched_skills.append(skill)

        if matched_skills:
            score += len(matched_skills) * 2
            reasons.append("보유 기술과 겹치는 요구 기술: " + ", ".join(matched_skills[:3]))

        if score <= 0:
            continue

        recommended.append(
            {
                "role": row_role,
                "ratio": row.get("ratio", 0),
                "major_skills": row_skills,
                "reason": " ".join(reasons),
                "score": score,
            }
        )

    recommended.sort(key=lambda item: (-item["score"], -item["ratio"], item["role"]))
    return recommended[:3]


def parse_analysis_recommendation_blocks(text):
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    blocks = []
    raw_blocks = [chunk.strip() for chunk in re.split(r"-{8,}", cleaned) if chunk.strip()]
    section_names = ["문제 문장", "문제점", "개선 방향", "수정 예시"]
    for raw_block in raw_blocks:
        positions = []
        for name in section_names:
            match = re.search(rf"(^|\n){re.escape(name)}\n", raw_block)
            if match:
                positions.append((match.start(), match.end(), name))
        positions.sort()

        parsed = {
            "problem_sentence": "",
            "problem_points": [],
            "improvement_points": [],
            "before_example": "",
            "after_example": "",
        }
        if not positions:
            parsed["problem_sentence"] = raw_block
            blocks.append(parsed)
            continue

        for index, (start, content_start, name) in enumerate(positions):
            end = positions[index + 1][0] if index + 1 < len(positions) else len(raw_block)
            content = raw_block[content_start:end].strip()
            if name == "문제 문장":
                parsed["problem_sentence"] = content
            elif name == "문제점":
                parsed["problem_points"] = [line.strip(" -") for line in content.splitlines() if line.strip()]
            elif name == "개선 방향":
                parsed["improvement_points"] = [line.strip(" -") for line in content.splitlines() if line.strip()]
            elif name == "수정 예시":
                before_match = re.search(r"Before\n(.+?)(?:\n\nAfter\n|\nAfter\n|$)", content, re.S)
                after_match = re.search(r"After\n(.+)$", content, re.S)
                if before_match:
                    parsed["before_example"] = before_match.group(1).strip()
                if after_match:
                    parsed["after_example"] = after_match.group(1).strip()
        blocks.append(parsed)
    return blocks


def build_analysis_summary_cards(user, recommended_direction_rows):
    cards = []
    if user.get_selected_job_direction():
        cards.append(
            {
                "title": "기준 방향",
                "body": user.get_selected_job_direction(),
            }
        )
    if recommended_direction_rows:
        cards.append(
            {
                "title": "추천 직무",
                "body": recommended_direction_rows[0]["role"],
                "caption": recommended_direction_rows[0]["reason"],
            }
        )
    ai_skills = user.ai_profile_payload.get("core_skills", []) if user.ai_profile_payload else []
    if ai_skills:
        cards.append(
            {
                "title": "핵심 기술",
                "body": ", ".join(ai_skills[:4]),
            }
        )
    elif user.github_top_languages:
        cards.append(
            {
                "title": "주요 언어",
                "body": ", ".join([item.strip() for item in user.github_top_languages.split(",") if item.strip()][:4]),
            }
        )
    return cards[:3]


def reset_profile_analysis(user):
    user.github_username = ""
    user.github_profile_summary = ""
    user.github_top_languages = ""
    user.github_connected_at = None
    user.resume_extracted_text = ""
    user.resume_analysis_summary = ""
    user.analysis_recommendation = ""
    user.ai_profile_summary = ""
    user.ai_profile_payload = {}
    user.ai_profile_error = ""
    user.profile_analyzed_at = None


@login_required
def index(request):
    user = request.user
    market_snapshot = get_or_refresh_market_snapshot()
    role_choices = get_direction_choices(market_snapshot)
    has_profile_sources = bool(user.github_url or user.resume_file)
    original_direction = user.desired_job_direction
    original_direction_other = user.desired_job_direction_other

    if request.method == "POST":
        form = ProfileUpdateForm(request.POST, request.FILES, instance=user, role_choices=role_choices)
        if form.is_valid():
            action = request.POST.get("action", "save")
            user = form.save(commit=False)
            selected_choice = form.cleaned_data.get("job_direction_choice", "")
            selected_other = (form.cleaned_data.get("desired_job_direction_other") or "").strip()
            if selected_choice == "__other__":
                user.desired_job_direction = selected_other
                user.desired_job_direction_other = selected_other
            else:
                user.desired_job_direction = selected_choice
                user.desired_job_direction_other = ""
            source_fields = {"github_url", "resume_file"}
            direction_changed = (
                original_direction != user.desired_job_direction
                or original_direction_other != user.desired_job_direction_other
            )
            if source_fields.intersection(set(form.changed_data)) or direction_changed:
                reset_profile_analysis(user)
            user.save()

            if action == "analyze":
                try:
                    analysis = build_profile_analysis(
                        user.github_url,
                        user.resume_file,
                        desired_direction=user.get_selected_job_direction(),
                        market_role_context=get_market_role_context(
                            market_snapshot,
                            user.get_selected_job_direction(),
                        ),
                    )
                    user.github_username = analysis["github_username"]
                    user.github_profile_summary = analysis["github_profile_summary"]
                    user.github_top_languages = analysis["github_top_languages"]
                    user.resume_extracted_text = analysis["resume_extracted_text"]
                    user.resume_analysis_summary = analysis["resume_analysis_summary"]
                    user.analysis_recommendation = analysis["analysis_recommendation"]
                    user.ai_profile_summary = analysis.get("ai_profile_summary", "")
                    user.ai_profile_payload = analysis.get("ai_profile_payload", {})
                    user.ai_profile_error = analysis.get("ai_profile_error", "")
                    if user.github_url:
                        user.mark_github_connected()
                    user.mark_profile_analyzed()
                    user.save()
                    messages.success(request, "분석 결과를 적용했습니다.")
                    return redirect("users-index")
                except Exception as exc:
                    messages.error(request, f"분석 중 오류가 발생했습니다: {exc}")
            else:
                messages.success(request, "프로필 정보를 저장했습니다.")
                return redirect("users-index")
        else:
            messages.error(request, "입력값을 다시 확인해 주세요.")
    else:
        form = ProfileUpdateForm(instance=user, role_choices=role_choices)

    edit_mode = request.method == "POST" or request.GET.get("edit") == "1" or not has_profile_sources
    saved_direction_choice_value = ""
    saved_direction_other_value = ""
    if user.desired_job_direction_other:
        saved_direction_choice_value = "__other__"
        saved_direction_other_value = user.desired_job_direction_other
    elif user.desired_job_direction:
        saved_direction_choice_value = user.desired_job_direction if any(
            value == user.desired_job_direction for value, _label in role_choices
        ) else "__other__"
        if saved_direction_choice_value == "__other__":
            saved_direction_other_value = user.desired_job_direction

    recommended_direction_rows = build_recommended_direction_rows(user, market_snapshot)
    default_direction_choice_value = saved_direction_choice_value
    if not default_direction_choice_value and recommended_direction_rows:
        default_direction_choice_value = recommended_direction_rows[0]["role"]
    recommendation_blocks = parse_analysis_recommendation_blocks(user.analysis_recommendation)
    analysis_summary_cards = build_analysis_summary_cards(user, recommended_direction_rows)

    context = {
        "form": form,
        "edit_mode": edit_mode,
        "has_profile_sources": has_profile_sources,
        "selected_job_direction": user.get_selected_job_direction(),
        "saved_direction_choice_value": saved_direction_choice_value,
        "saved_direction_other_value": saved_direction_other_value,
        "default_direction_choice_value": default_direction_choice_value,
        "recommended_direction_rows": recommended_direction_rows,
        "recommendation_blocks": recommendation_blocks,
        "analysis_summary_cards": analysis_summary_cards,
        "formatted_github_summary": format_github_summary_text(user.github_profile_summary),
        "formatted_ai_profile_summary": format_ai_profile_summary_text(user.ai_profile_summary, user.name),
        "resume_points": [line for line in user.resume_analysis_summary.split(" / ") if line],
        "ai_target_roles": user.ai_profile_payload.get("target_roles", []) if user.ai_profile_payload else [],
        "ai_core_skills": user.ai_profile_payload.get("core_skills", []) if user.ai_profile_payload else [],
        "ai_project_evidence": user.ai_profile_payload.get("project_evidence", []) if user.ai_profile_payload else [],
        "ai_strengths": user.ai_profile_payload.get("strengths", []) if user.ai_profile_payload else [],
        "ai_gaps": user.ai_profile_payload.get("gaps", []) if user.ai_profile_payload else [],
        "ai_study_priorities": user.ai_profile_payload.get("study_priorities", []) if user.ai_profile_payload else [],
        "market_snapshot_summary": market_snapshot.analysis_summary if market_snapshot else "",
        "market_breakdown_rows": market_snapshot.role_breakdown if market_snapshot else [],
    }
    return render(request, "users/index.html", context)

@login_required
def edit_basic_info(request):
    if request.method == "POST":
        form = BasicInfoForm(request.POST, instance=request.user)
        if form.is_valid():
            user = form.save()
            pw = form.cleaned_data.get("new_password1")
            if pw:
                user.set_password(pw)
                user.save()
                login(request, user)
            messages.success(request, "정보가 수정되었습니다.")
            return redirect("users-edit-basic")
    else:
        form = BasicInfoForm(instance=request.user)
    return render(request, "users/edit_basic_info.html", {"form": form})


def signup(request):
    if request.user.is_authenticated:
        return redirect("users-index")

    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "회원가입이 완료되었습니다.")
            return redirect("users-index")
    else:
        form = SignupForm()

    return render(request, "users/signup.html", {"form": form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect("users-index")

    if request.method == "POST":
        form = LoginForm(request, request.POST)
        if form.is_valid():
            login(request, form.get_user())
            messages.success(request, "로그인되었습니다.")
            return redirect("users-index")
    else:
        form = LoginForm(request)

    return render(request, "users/login.html", {"form": form})


def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        messages.success(request, "로그아웃되었습니다.")
    return redirect("home")
