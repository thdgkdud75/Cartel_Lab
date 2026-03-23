import re
import threading

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone

from jobs.models import JobPosting
from jobs.services.job_detail import fetch_job_detail
from jobs.services.recommendation import (
    can_score_user,
    detect_profile_roles,
    extract_profile_skills,
    normalize_text,
    score_job_for_user,
)
from users.ai_services import generate_job_recommendation, is_openai_configured


def build_company_mark(name):
    normalized = re.sub(r"[\(\)\[\]\s]|주식회사|㈜|\(주\)", "", name or "")
    if not normalized:
        return "TL"
    if re.search(r"[A-Za-z]", normalized):
        letters = "".join(ch for ch in normalized if ch.isalpha())
        return (letters[:2] or normalized[:2]).upper()
    return normalized[:2]


def build_job_tags(job):
    raw = job.required_skills or job.job_role or job.summary_text or ""
    tags = []
    for item in re.split(r"[,/]", raw):
        cleaned = re.sub(r"\s+", " ", item).strip()
        if cleaned and cleaned not in tags:
            tags.append(cleaned)
        if len(tags) == 3:
            break
    if not tags and job.location:
        tags.append(job.location)
    if not tags and job.company_name:
        tags.append(job.company_name)
    return [f"#{tag}" for tag in tags[:3]]


def build_deadline_label(job):
    if not job.deadline_at:
        return ""
    today = timezone.localdate()
    deadline = timezone.localtime(job.deadline_at).date()
    delta = (deadline - today).days
    if delta < 0:
        return "마감"
    if delta == 0:
        return "D-Day"
    return f"D-{delta}"


def split_detail_lines(value):
    lines = []
    for raw in (value or "").splitlines():
        cleaned = re.sub(r"\s+", " ", raw).strip(" -•·\t")
        if not cleaned:
            continue
        lines.append(cleaned)
    return lines


def build_main_task_preview(job):
    tasks = split_detail_lines(job.detail_main_tasks)
    if tasks:
        return tasks[:3]
    if job.summary_text:
        return [re.sub(r"\s+", " ", job.summary_text).strip()]
    return []


def jobs_index(request):
    jobs = list(
        JobPosting.objects.filter(is_active=True).order_by("-posted_at", "-updated_at", "-id")[:100]
    )
    scoring_enabled = can_score_user(request.user)
    if scoring_enabled:
        _profile_skills = extract_profile_skills(request.user)
        _profile_roles = detect_profile_roles(request.user)
        _selected_direction = normalize_text(request.user.get_selected_job_direction())
    else:
        _profile_skills = _profile_roles = _selected_direction = None

    for job in jobs:
        job.ui_company_mark = build_company_mark(job.company_name)
        job.ui_deadline_label = build_deadline_label(job)
        job.ui_tags = build_job_tags(job)
        job.ui_main_tasks = build_main_task_preview(job)
        recommendation = score_job_for_user(
            request.user, job,
            profile_skills=_profile_skills,
            profile_roles=_profile_roles,
            selected_direction=_selected_direction,
        )
        job.ui_recommendation_score = recommendation["score"]
        job.ui_recommendation_reasons = recommendation["reasons"]

    jobs.sort(
        key=lambda job: (
            0 if job.source == "wanted" else 1,
            -(job.ui_recommendation_score or -1) if scoring_enabled else 0,
            -(job.posted_at.timestamp() if job.posted_at else 0),
            -job.id,
        )
    )
    return render(request, "jobs/index.html", {"jobs": jobs, "scoring_enabled": scoring_enabled})


def jobs_sync(request):
    from django.core.management import call_command
    if not request.user.is_authenticated:
        return redirect('/users/login/')

    def run_sync():
        try:
            call_command('sync_job_sources')
        except Exception:
            pass

    threading.Thread(target=run_sync, daemon=True).start()
    messages.success(request, "공고 수집을 시작했습니다. 잠시 후 새로고침하면 표시됩니다.")
    return redirect('jobs-index')


def job_detail_api(request, job_id):
    from django.shortcuts import get_object_or_404
    job = get_object_or_404(JobPosting, pk=job_id, is_active=True)
    detail = fetch_job_detail(job)
    recommendation = score_job_for_user(request.user, job)
    detail["recommendation_score"] = recommendation["score"]
    detail["recommendation_reasons"] = recommendation["reasons"]
    if (
        is_openai_configured()
        and getattr(request.user, "is_authenticated", False)
        and getattr(request.user, "ai_profile_payload", None)
    ):
        try:
            ai_result = generate_job_recommendation(
                ai_profile=request.user.ai_profile_payload,
                job_payload={
                    "title": detail.get("title", ""),
                    "company_name": detail.get("company_name", ""),
                    "job_role": detail.get("job_role", ""),
                    "overview": detail.get("overview", ""),
                    "main_tasks": detail.get("main_tasks", []),
                    "requirements": detail.get("requirements", []),
                    "preferred_points": detail.get("preferred_points", []),
                    "required_skills": detail.get("required_skills", []),
                },
            )
            detail["ai_recommendation"] = ai_result
        except Exception as exc:
            detail["ai_recommendation_error"] = str(exc)
    return JsonResponse(detail)
