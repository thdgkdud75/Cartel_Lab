import calendar
from datetime import date, timedelta
import re

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone

from users.ai_services import generate_job_recommendation, is_openai_configured

from .models import DailyTodo, JobPosting, LabWideGoal, WeeklyGoal
from .services.job_detail import fetch_job_detail
from .services.recommendation import can_score_user, score_job_for_user


def _week_start_from_input(raw_date):
    """Return week start (Sunday) from an iso date string."""
    if raw_date:
        try:
            target_date = date.fromisoformat(raw_date)
        except ValueError:
            target_date = timezone.localdate()
    else:
        target_date = timezone.localdate()

    # Python weekday: Monday=0 ... Sunday=6
    days_from_sunday = (target_date.weekday() + 1) % 7
    return target_date - timedelta(days=days_from_sunday)


def _goal_date(goal):
    return goal.week_start + timedelta(days=goal.weekday)


def _time_from_input(raw_time):
    if not raw_time:
        return None
    try:
        return timezone.datetime.strptime(raw_time, "%H:%M").time()
    except ValueError:
        return None


def index(request):
    planner_view = request.GET.get("view")
    if not planner_view:
        planner_view = "plan" if request.GET.get("month") or request.GET.get("date") else "goal"
    if planner_view not in {"goal", "plan"}:
        planner_view = "goal"

    today = timezone.localdate()
    month_raw = request.GET.get("month")
    try:
        current_month = date.fromisoformat(f"{month_raw}-01") if month_raw else today.replace(day=1)
    except ValueError:
        current_month = today.replace(day=1)

    selected_date_raw = request.GET.get("date")
    try:
        selected_date = date.fromisoformat(selected_date_raw) if selected_date_raw else today
    except ValueError:
        selected_date = today

    if selected_date.month != current_month.month or selected_date.year != current_month.year:
        selected_date = current_month

    first_weekday, _ = calendar.monthrange(current_month.year, current_month.month)
    leading_days = (first_weekday + 1) % 7
    calendar_start = current_month - timedelta(days=leading_days)
    calendar_end = calendar_start + timedelta(days=41)

    if request.user.is_authenticated:
        goals = WeeklyGoal.objects.filter(
            user=request.user,
            week_start__gte=calendar_start - timedelta(days=6),
            week_start__lte=calendar_end,
        ).order_by("week_start", "weekday", "created_at")
    else:
        goals = WeeklyGoal.objects.none()

    goals_by_date = {}
    for goal in goals:
        goal_date = _goal_date(goal)
        if calendar_start <= goal_date <= calendar_end:
            goals_by_date.setdefault(goal_date, []).append(goal)

    weeks = []
    cursor = calendar_start
    for _ in range(6):
        week_days = []
        for _ in range(7):
            day_goals = goals_by_date.get(cursor, [])
            week_days.append(
                {
                    "date": cursor,
                    "is_current_month": cursor.month == current_month.month,
                    "is_selected": cursor == selected_date,
                    "is_today": cursor == today,
                    "preview_goals": day_goals[:2],
                    "more_count": max(len(day_goals) - 2, 0),
                }
            )
            cursor += timedelta(days=1)
        weeks.append(week_days)

    selected_goals = goals_by_date.get(selected_date, [])
    prev_month = (current_month.replace(day=1) - timedelta(days=1)).replace(day=1)
    next_month = (current_month.replace(day=28) + timedelta(days=4)).replace(day=1)

    context = {
        "planner_view": planner_view,
        "current_month": current_month,
        "selected_date": selected_date,
        "prev_month": prev_month,
        "next_month": next_month,
        "weeks": weeks,
        "selected_goals": selected_goals,
        "lab_wide_goals": LabWideGoal.objects.select_related("created_by")[:8],
        "daily_todos": (
            DailyTodo.objects.filter(user=request.user, target_date=selected_date)
            if request.user.is_authenticated
            else DailyTodo.objects.none()
        ),
    }
    return render(request, "planner/index.html", context)


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
        JobPosting.objects.filter(is_active=True).order_by(
        "-posted_at", "-updated_at", "-id"
        )[:100]
    )
    scoring_enabled = can_score_user(request.user)
    for job in jobs:
        job.ui_company_mark = build_company_mark(job.company_name)
        job.ui_deadline_label = build_deadline_label(job)
        job.ui_tags = build_job_tags(job)
        job.ui_main_tasks = build_main_task_preview(job)
        recommendation = score_job_for_user(request.user, job)
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


def job_detail_api(request, job_id):
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


@login_required
def add_goal(request):
    if request.method != "POST":
        return redirect("planner-index")

    week_start = _week_start_from_input(request.POST.get("week_start"))
    weekday_raw = request.POST.get("weekday", "")
    content = request.POST.get("content", "").strip()
    target_date_raw = request.POST.get("target_date")
    planned_time = _time_from_input(request.POST.get("planned_time"))

    if target_date_raw:
        try:
            target_date = date.fromisoformat(target_date_raw)
            week_start = _week_start_from_input(target_date.isoformat())
            weekday_raw = str((target_date - week_start).days)
        except ValueError:
            pass

    if weekday_raw.isdigit() and content:
        weekday = int(weekday_raw)
        if 0 <= weekday <= 6:
            WeeklyGoal.objects.create(
                user=request.user,
                week_start=week_start,
                weekday=weekday,
                planned_time=planned_time,
                content=content,
            )

    target_date = request.POST.get("target_date")
    if target_date:
        try:
            selected_date = date.fromisoformat(target_date)
            month_key = selected_date.strftime("%Y-%m")
            return redirect(
                f"{reverse('planner-index')}?view=plan&month={month_key}&date={selected_date.isoformat()}"
            )
        except ValueError:
            pass
    return redirect(f"{reverse('planner-index')}?view=plan")


@login_required
def toggle_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    goal.is_completed = not goal.is_completed
    goal.save(update_fields=["is_completed", "updated_at"])

    goal_date = _goal_date(goal)
    month_key = goal_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month_key}&date={goal_date.isoformat()}"
    )


@login_required
def update_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    content = request.POST.get("content", "").strip()
    planned_time = _time_from_input(request.POST.get("planned_time"))
    if content:
        goal.content = content
        goal.planned_time = planned_time
        goal.save(update_fields=["content", "planned_time", "updated_at"])

    goal_date = _goal_date(goal)
    month_key = goal_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month_key}&date={goal_date.isoformat()}"
    )


@login_required
def add_lab_goal(request):
    if request.method != "POST":
        return redirect("planner-index")

    content = request.POST.get("content", "").strip()
    if content:
        LabWideGoal.objects.create(created_by=request.user, content=content)
    return redirect(f"{reverse('planner-index')}?view=goal")


@login_required
def add_daily_todo(request):
    if request.method != "POST":
        return redirect("planner-index")

    content = request.POST.get("content", "").strip()
    planned_time = _time_from_input(request.POST.get("planned_time"))
    target_date_raw = request.POST.get("target_date")
    month_raw = request.POST.get("month")
    target_date = timezone.localdate()
    try:
        if target_date_raw:
            target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        pass

    if content:
        DailyTodo.objects.create(
            user=request.user,
            target_date=target_date,
            planned_time=planned_time,
            content=content,
        )

    month = month_raw or target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


@login_required
def toggle_daily_todo(request, todo_id):
    if request.method != "POST":
        return redirect("planner-index")

    todo = get_object_or_404(DailyTodo, id=todo_id, user=request.user)
    todo.is_completed = not todo.is_completed
    todo.save(update_fields=["is_completed", "updated_at"])

    month = todo.target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={todo.target_date.isoformat()}"
    )
