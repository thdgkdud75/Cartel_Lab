import calendar
import re
import secrets
from datetime import date, datetime, time, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from .google_calendar import (
    GoogleCalendarError,
    GOOGLE_EVENT_COLOR_IDS,
    build_authorization_url,
    create_goal_event,
    create_todo_event,
    delete_event,
    exchange_code_for_token,
    fetch_google_email,
    is_configured,
    list_events,
    token_expiry_from_seconds,
    update_goal_event,
)
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import DailyGoal, DailyTodo, GoogleCalendarCredential, LabWideGoal, WeeklyGoal


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


def _monday_week_start(target_date):
    return target_date - timedelta(days=target_date.weekday())


def _time_from_input(raw_time):
    if not raw_time:
        return None
    try:
        return timezone.datetime.strptime(raw_time, "%H:%M").time()
    except ValueError:
        return None


def _planned_time_from_request(request):
    direct_time = _time_from_input(request.POST.get("planned_time"))
    if direct_time is not None:
        return direct_time

    period_raw = (request.POST.get("planned_time_period") or "").strip().upper()
    hour_raw = (request.POST.get("planned_time_hour") or "").strip()
    minute_raw = (request.POST.get("planned_time_minute") or "").strip()
    if not period_raw and not hour_raw and not minute_raw:
        return None
    if hour_raw == "" or minute_raw == "":
        return None

    try:
        hour = int(hour_raw)
        minute = int(minute_raw)
    except (TypeError, ValueError):
        return None

    if period_raw in {"AM", "PM"}:
        if hour < 1 or hour > 12:
            return None
        if minute < 0 or minute > 59:
            return None
        if period_raw == "AM":
            hour = 0 if hour == 12 else hour
        else:
            hour = 12 if hour == 12 else hour + 12
        return time(hour=hour, minute=minute)

    try:
        return time(hour=hour, minute=minute)
    except ValueError:
        return None


def _duration_days_from_input(raw_days, default=1):
    try:
        parsed = int(raw_days)
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(parsed, 60))


def _color_from_input(raw_color):
    if raw_color in {"red", "blue", "yellow", "green"}:
        return raw_color
    return "red"


def _find_contiguous_goal_ids(user, anchor_date, content, planned_time):
    """Find contiguous same-schedule goals around anchor date."""
    ids = set()

    same_day = WeeklyGoal.objects.filter(
        user=user,
        week_start=_week_start_from_input(anchor_date.isoformat()),
        weekday=(anchor_date - _week_start_from_input(anchor_date.isoformat())).days,
        content=content,
        planned_time=planned_time,
    ).values_list("id", flat=True)
    ids.update(same_day)

    step = 1
    while True:
        probe_date = anchor_date - timedelta(days=step)
        probe_week_start = _week_start_from_input(probe_date.isoformat())
        probe_weekday = (probe_date - probe_week_start).days
        matches = list(
            WeeklyGoal.objects.filter(
                user=user,
                week_start=probe_week_start,
                weekday=probe_weekday,
                content=content,
                planned_time=planned_time,
            ).values_list("id", flat=True)
        )
        if not matches:
            break
        ids.update(matches)
        step += 1

    step = 1
    while True:
        probe_date = anchor_date + timedelta(days=step)
        probe_week_start = _week_start_from_input(probe_date.isoformat())
        probe_weekday = (probe_date - probe_week_start).days
        matches = list(
            WeeklyGoal.objects.filter(
                user=user,
                week_start=probe_week_start,
                weekday=probe_weekday,
                content=content,
                planned_time=planned_time,
            ).values_list("id", flat=True)
        )
        if not matches:
            break
        ids.update(matches)
        step += 1

    return ids


def _planner_plan_redirect_for_date(target_date):
    return redirect(_planner_plan_url_for_date(target_date))


def _planner_plan_url_for_date(target_date):
    month = target_date.strftime("%Y-%m")
    return f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"


def _normalize_certification_goal_text(value):
    text = (value or "").strip()
    if not text:
        return ""

    replacements = {
        "?쒗뿕": "시험",
        "?꾧린": "필기",
        "?ㅺ린": "실기",
        "?묒닔": "접수",
    }

    for source, target in replacements.items():
        text = text.replace(source, target)

    if text == "SQL 개발자":
        return "SQLD"
    if text.startswith("SQL 개발자 |"):
        return text.replace("SQL 개발자 |", "SQLD |", 1)

    return text


def _goal_content_from_certification(name, label):
    normalized_name = _normalize_certification_goal_text(name)
    normalized_label = _normalize_certification_goal_text(label)
    content = " | ".join([value for value in [normalized_name, normalized_label] if value])
    content = content or "자격증 일정"
    return content[:255]


def _save_goal_from_certification(user, target_date_raw, cert_name, schedule_label, color):
    if not target_date_raw:
        return {"message": "추가할 시험 날짜가 필요합니다."}, status.HTTP_400_BAD_REQUEST

    try:
        target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        return {"message": "시험 날짜 형식이 올바르지 않습니다."}, status.HTTP_400_BAD_REQUEST

    content = _goal_content_from_certification(cert_name, schedule_label)
    week_start = _week_start_from_input(target_date.isoformat())
    weekday = (target_date - week_start).days
    goal = WeeklyGoal.objects.filter(
        user=user,
        week_start=week_start,
        weekday=weekday,
        content=content,
    ).order_by("created_at").first()
    created = goal is None

    if created:
        goal = WeeklyGoal.objects.create(
            user=user,
            week_start=week_start,
            weekday=weekday,
            planned_time=None,
            content=content,
            color=color,
        )

    if goal.color != color:
        goal.color = color
        goal.save(update_fields=["color", "updated_at"])

    return (
        {
            "created": created,
            "message": (
                "오늘의 계획에 추가되었습니다."
                if created
                else "이미 오늘의 계획에 추가된 일정입니다."
            ),
            "planner_url": _planner_plan_url_for_date(target_date),
            "target_date": target_date.isoformat(),
            "content": goal.content,
        },
        status.HTTP_200_OK,
    )


def _sync_daily_todo_create(todo):
    credential = getattr(todo.user, "google_calendar_credential", None)
    if not credential:
        return None

    event_id = create_todo_event(credential, todo)
    if not event_id:
        raise GoogleCalendarError("Google Calendar에서 이벤트 ID를 받지 못했습니다.")

    todo.google_event_id = event_id
    todo.save(update_fields=["google_event_id", "updated_at"])
    return event_id


def _sync_weekly_goal_create(goal, goal_date):
    credential = getattr(goal.user, "google_calendar_credential", None)
    if not credential:
        return None

    event_id = create_goal_event(credential, goal, goal_date)
    if not event_id:
        raise GoogleCalendarError("Google Calendar에서 목표 이벤트 ID를 받지 못했습니다.")

    goal.google_event_id = event_id
    goal.save(update_fields=["google_event_id", "updated_at"])
    return event_id


def _sync_weekly_goal_update(goal, goal_date):
    credential = getattr(goal.user, "google_calendar_credential", None)
    if not credential or not goal.google_event_id:
        return None

    update_goal_event(credential, goal.google_event_id, goal, goal_date)
    return goal.google_event_id


def _create_weekly_goal_from_todo(todo, request=None):
    week_start = _week_start_from_input(todo.target_date.isoformat())
    weekday = (todo.target_date - week_start).days

    goal = WeeklyGoal.objects.filter(
        user=todo.user,
        week_start=week_start,
        weekday=weekday,
        content=todo.content,
        planned_time=todo.planned_time,
        color=todo.color,
    ).first()

    if not goal:
        goal = WeeklyGoal.objects.create(
            user=todo.user,
            week_start=week_start,
            weekday=weekday,
            planned_time=todo.planned_time,
            color=todo.color,
            content=todo.content,
        )

    if hasattr(todo.user, "google_calendar_credential") and not goal.google_event_id:
        try:
            _sync_weekly_goal_create(goal, todo.target_date)
        except GoogleCalendarError as exc:
            if request is not None:
                messages.warning(
                    request,
                    f"체크된 투두는 등록됐지만 Google Calendar 동기화에는 실패했습니다: {exc}",
                )

    return goal


def _delete_google_event_for_user(user, event_id, request=None):
    if not event_id:
        return

    credential = getattr(user, "google_calendar_credential", None)
    if not credential:
        return

    try:
        delete_event(credential, event_id)
    except GoogleCalendarError as exc:
        if request is not None:
            messages.warning(request, f"Google Calendar 일정 삭제에 실패했습니다: {exc}")


def _parse_google_datetime(raw_value):
    if not raw_value:
        return None

    normalized = raw_value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return timezone.localtime(parsed)


def _color_from_google_event(event, default="red"):
    color_id = str(event.get("colorId") or "").strip()
    if not color_id:
        return default

    for color, mapped_id in GOOGLE_EVENT_COLOR_IDS.items():
        if mapped_id == color_id:
            return color
    return default


def _todo_fields_from_google_event(event):
    summary = (event.get("summary") or "").strip()
    start = event.get("start") or {}

    if start.get("dateTime"):
        start_dt = _parse_google_datetime(start["dateTime"])
        if not start_dt:
            return None, None, summary
        return start_dt.date(), start_dt.time().replace(second=0, microsecond=0), summary

    if start.get("date"):
        try:
            return date.fromisoformat(start["date"]), None, summary
        except ValueError:
            return None, None, summary

    return None, None, summary


def _sync_google_events_for_range(user, start_date, end_date):
    credential = getattr(user, "google_calendar_credential", None)
    if not credential:
        return {"created": 0, "updated": 0, "deleted": 0}

    tz = timezone.get_current_timezone()
    range_start = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    range_end = timezone.make_aware(datetime.combine(end_date + timedelta(days=1), time.min), tz)
    events = list_events(credential, range_start, range_end)

    created = 0
    updated = 0
    deleted = 0
    seen_event_ids = set()

    for event in events:
        google_event_id = event.get("id", "")
        if not google_event_id:
            continue
        seen_event_ids.add(google_event_id)

        todo_qs = DailyTodo.objects.filter(user=user, google_event_id=google_event_id)
        goal_qs = WeeklyGoal.objects.filter(user=user, google_event_id=google_event_id)
        status = event.get("status", "")
        if status == "cancelled":
            deleted += todo_qs.count()
            deleted += goal_qs.count()
            todo_qs.delete()
            goal_qs.delete()
            continue

        target_date, planned_time, content = _todo_fields_from_google_event(event)
        if not target_date or not content:
            continue

        week_start = _week_start_from_input(target_date.isoformat())
        weekday = (target_date - week_start).days
        goal = goal_qs.first()
        migrated_todo = todo_qs.first()
        goal_color = _color_from_google_event(event, default=migrated_todo.color if migrated_todo else "red")

        if goal:
            changed = False
            if goal.week_start != week_start:
                goal.week_start = week_start
                changed = True
            if goal.weekday != weekday:
                goal.weekday = weekday
                changed = True
            if goal.planned_time != planned_time:
                goal.planned_time = planned_time
                changed = True
            if goal.content != content:
                goal.content = content
                changed = True
            if goal.color != goal_color:
                goal.color = goal_color
                changed = True
            if goal.is_completed:
                goal.is_completed = False
                changed = True
            if changed:
                goal.save(
                    update_fields=[
                        "week_start",
                        "weekday",
                        "planned_time",
                        "content",
                        "color",
                        "is_completed",
                        "updated_at",
                    ]
                )
                updated += 1
        else:
            WeeklyGoal.objects.create(
                user=user,
                week_start=week_start,
                weekday=weekday,
                planned_time=planned_time,
                color=goal_color,
                content=content,
                is_completed=False,
                google_event_id=google_event_id,
            )
            created += 1

        if todo_qs.exists():
            deleted += todo_qs.count()
            todo_qs.delete()

    tracked_goal_ids = []
    for goal in WeeklyGoal.objects.filter(user=user).exclude(google_event_id=""):
        goal_date = _goal_date(goal)
        if start_date <= goal_date <= end_date and goal.google_event_id not in seen_event_ids:
            tracked_goal_ids.append(goal.id)

    if tracked_goal_ids:
        deleted += len(tracked_goal_ids)
        WeeklyGoal.objects.filter(id__in=tracked_goal_ids).delete()

    stale_todo_qs = DailyTodo.objects.filter(
        user=user,
        target_date__gte=start_date,
        target_date__lte=end_date,
    ).exclude(google_event_id="").exclude(google_event_id__in=seen_event_ids)
    stale_todo_count = stale_todo_qs.count()
    if stale_todo_count:
        deleted += stale_todo_count
        stale_todo_qs.delete()

    return {"created": created, "updated": updated, "deleted": deleted}


def index(request):
    planner_view = request.GET.get("view", "goal")
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
    # monthrange: Monday=0 ... Sunday=6
    leading_days = (first_weekday + 1) % 7
    calendar_start = current_month - timedelta(days=leading_days)
    calendar_end = calendar_start + timedelta(days=41)

    if request.user.is_authenticated:
        # Legacy registered todos should not remain in the todo list.
        DailyTodo.objects.filter(user=request.user, is_completed=True).delete()
        goals = WeeklyGoal.objects.filter(
            user=request.user,
            week_start__gte=calendar_start - timedelta(days=6),
            week_start__lte=calendar_end,
        ).order_by("week_start", "weekday", "created_at")
    else:
        goals = WeeklyGoal.objects.none()

    goals_by_date = {}
    for goal in goals:
        goal.display_content = _normalize_certification_goal_text(goal.content)
        goal_date = _goal_date(goal)
        if calendar_start <= goal_date <= calendar_end:
            goals_by_date.setdefault(goal_date, []).append(goal)

    weeks = []
    cursor = calendar_start
    for _ in range(6):
        week_days = []
        for _ in range(7):
            day_goals = goals_by_date.get(cursor, [])
            preview_goals = []
            previous_day_goals = goals_by_date.get(cursor - timedelta(days=1), [])
            next_day_goals = goals_by_date.get(cursor + timedelta(days=1), [])
            for goal in day_goals[:2]:
                same_prev = any(
                    prev_goal.content == goal.content and prev_goal.planned_time == goal.planned_time
                    for prev_goal in previous_day_goals
                )
                same_next = any(
                    next_goal.content == goal.content and next_goal.planned_time == goal.planned_time
                    for next_goal in next_day_goals
                )
                preview_goals.append(
                    {
                        "goal": goal,
                        "continued_prev": same_prev,
                        "continued_next": same_next,
                    }
                )
            week_days.append(
                {
                    "date": cursor,
                    "is_current_month": cursor.month == current_month.month,
                    "is_selected": cursor == selected_date,
                    "is_today": cursor == today,
                    "preview_goals": preview_goals,
                    "more_count": max(len(day_goals) - 2, 0),
                }
            )
            cursor += timedelta(days=1)
        weeks.append(week_days)

    selected_goals = goals_by_date.get(selected_date, [])
    prev_month = (current_month.replace(day=1) - timedelta(days=1)).replace(day=1)
    next_month = (current_month.replace(day=28) + timedelta(days=4)).replace(day=1)
    daily_todos = (
        DailyTodo.objects.filter(user=request.user, target_date=selected_date, is_completed=False)
        if request.user.is_authenticated
        else DailyTodo.objects.none()
    )
    daily_goal = (
        DailyGoal.objects.filter(user=request.user, date=selected_date).first()
        if request.user.is_authenticated
        else None
    )
    current_lab_week_start = _monday_week_start(today)
    current_lab_week_end = current_lab_week_start + timedelta(days=6)
    current_lab_week_goals = list(
        LabWideGoal.objects.select_related("created_by").filter(week_start=current_lab_week_start)
    )
    previous_lab_weeks = []
    for offset in range(1, 5):
        week_start = current_lab_week_start - timedelta(days=7 * offset)
        goals_in_week = list(
            LabWideGoal.objects.select_related("created_by").filter(week_start=week_start)
        )
        if goals_in_week:
            previous_lab_weeks.append(
                {
                    "week_start": week_start,
                    "week_end": week_start + timedelta(days=6),
                    "goals": goals_in_week,
                }
            )

    context = {
        "planner_view": planner_view,
        "current_month": current_month,
        "selected_date": selected_date,
        "prev_month": prev_month,
        "next_month": next_month,
        "weeks": weeks,
        "selected_goals": selected_goals,
        "current_lab_week_start": current_lab_week_start,
        "current_lab_week_end": current_lab_week_end,
        "current_lab_week_goals": current_lab_week_goals,
        "previous_lab_weeks": previous_lab_weeks,
        "daily_todos": daily_todos,
        "daily_todos_checked_count": daily_todos.filter(is_checked=True).count()
        if request.user.is_authenticated
        else 0,
        "daily_todos_total_count": daily_todos.count() if request.user.is_authenticated else 0,
        "daily_goal": daily_goal,
        "daily_todos_all_checked": (
            request.user.is_authenticated
            and daily_todos.exists()
            and not daily_todos.filter(is_checked=False).exists()
        ),
        "google_calendar_enabled": is_configured(),
        "google_calendar_connected": (
            request.user.is_authenticated
            and hasattr(request.user, "google_calendar_credential")
        ),
        "google_calendar_email": (
            request.user.google_calendar_credential.google_email
            if request.user.is_authenticated
            and hasattr(request.user, "google_calendar_credential")
            else ""
        ),
    }
    return render(request, "planner/index.html", context)


@login_required
def add_goal(request):
    if request.method != "POST":
        return redirect("planner-index")

    content = request.POST.get("content", "").strip()
    start_date_raw = request.POST.get("start_date")
    duration_raw = request.POST.get("duration_days", "1")
    start_date_raw = request.POST.get("start_date") or request.POST.get("target_date")
    duration_raw = request.POST.get("duration_days", "1")
    planned_time = _planned_time_from_request(request)
    color = _color_from_input(request.POST.get("color"))
    start_date = None

    duration_days = _duration_days_from_input(duration_raw, default=1)

    if start_date_raw:
        try:
            start_date = date.fromisoformat(start_date_raw)
        except ValueError:
            start_date = None

    if content and start_date:
        for offset in range(duration_days):
            target_date = start_date + timedelta(days=offset)
            goal, created = WeeklyGoal.objects.get_or_create(
                user=request.user,
                week_start=_week_start_from_input(target_date.isoformat()),
                weekday=(target_date - _week_start_from_input(target_date.isoformat())).days,
                planned_time=planned_time,
                content=content,
                defaults={"color": color},
            )
            if not created and goal.color != color:
                goal.color = color
                goal.save(update_fields=["color", "updated_at"])
            if hasattr(request.user, "google_calendar_credential") and not goal.google_event_id:
                try:
                    _sync_weekly_goal_create(goal, target_date)
                except GoogleCalendarError as exc:
                    messages.warning(request, f"일정은 저장됐지만 Google Calendar 동기화에 실패했습니다: {exc}")
                    break
    if start_date:
        try:
            selected_date = start_date
            month_key = selected_date.strftime("%Y-%m")
            return redirect(
                f"{reverse('planner-index')}?view=plan&month={month_key}&date={selected_date.isoformat()}"
            )
        except ValueError:
            pass
    return redirect(f"{reverse('planner-index')}?view=plan")


def add_goal_from_certification(request):
    if request.method != "POST":
        return JsonResponse({"message": "POST method required."}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "message": "로그인 후 오늘의 계획에 추가할 수 있습니다.",
                "login_url": reverse("users-login"),
            },
            status=401,
        )

    payload, status_code = _save_goal_from_certification(
        user=request.user,
        target_date_raw=(request.POST.get("target_date") or "").strip(),
        cert_name=(request.POST.get("certification_name") or "").strip(),
        schedule_label=(request.POST.get("schedule_label") or "").strip(),
        color=_color_from_input(request.POST.get("color")) or "yellow",
    )
    return JsonResponse(payload, status=status_code)


class AddGoalFromCertificationApiView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response(
                {
                    "message": "로그인 후 오늘의 계획에 추가할 수 있습니다.",
                    "login_url": reverse("users-login"),
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload, status_code = _save_goal_from_certification(
            user=request.user,
            target_date_raw=(request.data.get("target_date") or "").strip(),
            cert_name=(request.data.get("certification_name") or "").strip(),
            schedule_label=(request.data.get("schedule_label") or "").strip(),
            color=_color_from_input(request.data.get("color")) or "yellow",
        )
        return Response(payload, status=status_code)


@login_required
def toggle_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    goal_date = _goal_date(goal)
    goal.is_completed = not goal.is_completed
    goal.save(update_fields=["is_completed", "updated_at"])
    return _planner_plan_redirect_for_date(goal_date)


@login_required
def delete_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    goal_date = _goal_date(goal)
    google_event_id = goal.google_event_id
    should_delete_google_event = bool(google_event_id)
    goal.delete()
    if should_delete_google_event:
        _delete_google_event_for_user(request.user, google_event_id, request=request)
    return _planner_plan_redirect_for_date(goal_date)


@login_required
def update_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    original_goal_date = _goal_date(goal)
    original_content = goal.content
    original_planned_time = goal.planned_time
    original_color = goal.color
    content = request.POST.get("content", "").strip()
    planned_time = _planned_time_from_request(request)
    color = _color_from_input(request.POST.get("color"))
    start_date_raw = request.POST.get("start_date", "")
    duration_days = _duration_days_from_input(request.POST.get("duration_days", "1"), default=1)

    goal_date = _goal_date(goal)
    if start_date_raw:
        try:
            goal_date = date.fromisoformat(start_date_raw)
        except ValueError:
            pass

    if content:
        contiguous_ids = _find_contiguous_goal_ids(
            request.user,
            original_goal_date,
            original_content,
            original_planned_time,
        )

        if color != original_color and contiguous_ids:
            WeeklyGoal.objects.filter(id__in=contiguous_ids).update(
                color=color,
                updated_at=timezone.now(),
            )
            if hasattr(request.user, "google_calendar_credential"):
                for sibling_goal in WeeklyGoal.objects.filter(id__in=contiguous_ids):
                    sibling_goal.color = color
                    try:
                        _sync_weekly_goal_update(sibling_goal, _goal_date(sibling_goal))
                    except GoogleCalendarError as exc:
                        messages.warning(request, f"Google Calendar 일정 색상 동기화에 실패했습니다: {exc}")
                        break

        first_week_start = _week_start_from_input(goal_date.isoformat())
        first_weekday = (goal_date - first_week_start).days
        goal.week_start = first_week_start
        goal.weekday = first_weekday
        goal.content = content
        goal.planned_time = planned_time
        goal.color = color
        goal.save(update_fields=["week_start", "weekday", "content", "planned_time", "color", "updated_at"])
        if hasattr(request.user, "google_calendar_credential") and goal.google_event_id:
            try:
                _sync_weekly_goal_update(goal, goal_date)
            except GoogleCalendarError as exc:
                messages.warning(request, f"Google Calendar 일정 수정에 실패했습니다: {exc}")

        for offset in range(1, duration_days):
            target_date = goal_date + timedelta(days=offset)
            target_week_start = _week_start_from_input(target_date.isoformat())
            target_weekday = (target_date - target_week_start).days
            exists = WeeklyGoal.objects.filter(
                user=request.user,
                week_start=target_week_start,
                weekday=target_weekday,
                content=content,
                planned_time=planned_time,
                color=color,
            ).exists()
            if exists:
                continue

            WeeklyGoal.objects.create(
                user=request.user,
                week_start=target_week_start,
                weekday=target_weekday,
                planned_time=planned_time,
                color=color,
                content=content,
            )

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
        LabWideGoal.objects.create(
            created_by=request.user,
            week_start=_monday_week_start(timezone.localdate()),
            content=content,
        )
    return redirect(f"{reverse('planner-index')}?view=goal")


@login_required
def delete_lab_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(LabWideGoal, id=goal_id, created_by=request.user)
    goal.delete()
    return redirect(f"{reverse('planner-index')}?view=goal")


@login_required
def delete_lab_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(LabWideGoal, id=goal_id, created_by=request.user)
    goal.delete()
    return redirect(f"{reverse('planner-index')}?view=goal")


@login_required
def add_daily_todo(request):
    if request.method != "POST":
        return redirect("planner-index")

    contents = [c.strip() for c in request.POST.getlist("content") if c.strip()]
    start_date_raw = request.POST.get("target_date") or request.POST.get("start_date")
    duration_days = _duration_days_from_input(request.POST.get("duration_days", "1"), default=1)
    planned_time = _planned_time_from_request(request)
    color = _color_from_input(request.POST.get("color"))
    month_raw = request.POST.get("month")
    target_date = timezone.localdate()
    try:
        if start_date_raw:
            target_date = date.fromisoformat(start_date_raw)
    except ValueError:
        pass

    for content in contents:
        for offset in range(duration_days):
            todo = DailyTodo.objects.create(
                user=request.user,
                target_date=target_date + timedelta(days=offset),
                planned_time=planned_time,
                color=color,
                content=content,
            )
            _create_weekly_goal_from_todo(todo)

    month = month_raw or target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


@login_required
def toggle_daily_todo(request, todo_id):
    if request.method != "POST":
        return redirect("planner-index")

    todo = get_object_or_404(DailyTodo, id=todo_id, user=request.user)
    target_date = todo.target_date
    todo.is_checked = not todo.is_checked
    todo.save(update_fields=["is_checked", "updated_at"])
    return _planner_plan_redirect_for_date(target_date)


@login_required
def set_daily_todos_checked(request):
    if request.method != "POST":
        return redirect("planner-index")

    target_date_raw = request.POST.get("target_date")
    month_raw = request.POST.get("month")
    checked_value = request.POST.get("checked") == "1"
    target_date = timezone.localdate()
    try:
        if target_date_raw:
            target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        pass

    DailyTodo.objects.filter(
        user=request.user,
        target_date=target_date,
        is_completed=False,
    ).update(is_checked=checked_value, updated_at=timezone.now())

    month = month_raw or target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


@login_required
def register_daily_todos(request):
    if request.method != "POST":
        return redirect("planner-index")

    target_date_raw = request.POST.get("target_date")
    month_raw = request.POST.get("month")
    target_date = timezone.localdate()
    try:
        if target_date_raw:
            target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        pass

    todos = list(DailyTodo.objects.filter(
        user=request.user,
        target_date=target_date,
        is_completed=False,
        is_checked=True,
    ).order_by("planned_time", "created_at"))
    todo_count = len(todos)
    todo_ids = [todo.id for todo in todos]

    for todo in todos:
        _create_weekly_goal_from_todo(todo, request=request)

    if todo_ids:
        for todo in todos:
            _delete_google_event_for_user(request.user, todo.google_event_id, request=request)
        DailyTodo.objects.filter(id__in=todo_ids).delete()

    if todo_count == 0:
        messages.info(request, "등록할 체크된 투두가 없습니다.")

    month = month_raw or target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


@login_required
def delete_daily_todos(request):
    if request.method != "POST":
        return redirect("planner-index")

    target_date_raw = request.POST.get("target_date")
    month_raw = request.POST.get("month")
    target_date = timezone.localdate()
    try:
        if target_date_raw:
            target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        pass

    todos = list(DailyTodo.objects.filter(
        user=request.user,
        target_date=target_date,
        is_completed=False,
        is_checked=True,
    ))
    deleted_count = len(todos)

    if deleted_count:
        DailyTodo.objects.filter(id__in=[todo.id for todo in todos]).delete()

    if deleted_count == 0:
        messages.info(request, "삭제할 체크된 투두가 없습니다.")

    month = month_raw or target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


@login_required
def delete_daily_todo(request, todo_id):
    if request.method != "POST":
        return redirect("planner-index")

    todo = get_object_or_404(DailyTodo, id=todo_id, user=request.user)
    target_date = todo.target_date

    todo.delete()
    return _planner_plan_redirect_for_date(target_date)


@login_required
def google_calendar_import(request):
    if request.method != "POST":
        return redirect("planner-index")

    if not hasattr(request.user, "google_calendar_credential"):
        messages.error(request, "Google Calendar 연결 후에만 가져오기를 사용할 수 있습니다.")
        return _planner_plan_redirect_for_date(timezone.localdate())

    target_raw = request.POST.get("target_date", "")
    month_raw = request.POST.get("month", "")
    try:
        target_date = date.fromisoformat(target_raw) if target_raw else timezone.localdate()
    except ValueError:
        target_date = timezone.localdate()

    if request.POST.get("scope") == "month":
        try:
            month_date = date.fromisoformat(f"{month_raw}-01") if month_raw else target_date.replace(day=1)
        except ValueError:
            month_date = target_date.replace(day=1)
        _, month_days = calendar.monthrange(month_date.year, month_date.month)
        range_start = month_date
        range_end = month_date.replace(day=month_days)
    else:
        range_start = target_date
        range_end = target_date

    try:
        result = _sync_google_events_for_range(request.user, range_start, range_end)
        messages.success(
            request,
            f"구글 일정 가져오기 완료: 생성 {result['created']}건, 업데이트 {result['updated']}건, 삭제 {result['deleted']}건",
        )
    except GoogleCalendarError as exc:
        messages.error(request, f"Google 일정 가져오기에 실패했습니다: {exc}")

    return _planner_plan_redirect_for_date(target_date)


@login_required
def google_calendar_connect(request):
    if not is_configured():
        messages.error(request, "Google Calendar 설정이 비어 있습니다. .env 값을 먼저 입력해 주세요.")
        return redirect("planner-index")

    state = secrets.token_urlsafe(24)
    request.session["google_oauth_state"] = state
    return redirect(build_authorization_url(request, state))


@login_required
def google_calendar_callback(request):
    if not is_configured():
        messages.error(request, "Google Calendar 설정이 비어 있습니다.")
        return redirect("planner-index")

    expected_state = request.session.pop("google_oauth_state", "")
    received_state = request.GET.get("state", "")
    if not expected_state or expected_state != received_state:
        messages.error(request, "Google 로그인 검증(state)에 실패했습니다. 다시 시도해 주세요.")
        return redirect("planner-index")

    oauth_error = request.GET.get("error")
    if oauth_error:
        messages.error(request, f"Google 연결이 취소되었거나 실패했습니다: {oauth_error}")
        return redirect("planner-index")

    code = request.GET.get("code", "")
    if not code:
        messages.error(request, "Google 인증 코드가 없어 연결을 완료할 수 없습니다.")
        return redirect("planner-index")

    try:
        token_data = exchange_code_for_token(request, code)
        google_email = fetch_google_email(token_data["access_token"])
    except GoogleCalendarError as exc:
        messages.error(request, f"Google 계정 연결에 실패했습니다: {exc}")
        return redirect("planner-index")

    credential, created = GoogleCalendarCredential.objects.get_or_create(
        user=request.user,
        defaults={
            "google_email": google_email,
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "token_expires_at": token_expiry_from_seconds(token_data.get("expires_in")),
            "scope": token_data.get("scope", ""),
        },
    )

    if not created:
        credential.google_email = google_email
        credential.access_token = token_data["access_token"]
        if token_data.get("refresh_token"):
            credential.refresh_token = token_data["refresh_token"]
        credential.token_expires_at = token_expiry_from_seconds(token_data.get("expires_in"))
        credential.scope = token_data.get("scope", credential.scope)
        credential.save(
            update_fields=[
                "google_email",
                "access_token",
                "refresh_token",
                "token_expires_at",
                "scope",
                "updated_at",
            ]
        )

    today = timezone.localdate()
    messages.success(request, "Google Calendar 연결이 완료되었습니다.")
    return _planner_plan_redirect_for_date(today)


@login_required
def google_calendar_disconnect(request):
    if request.method != "POST":
        return redirect("planner-index")

    GoogleCalendarCredential.objects.filter(user=request.user).delete()
    messages.success(request, "Google Calendar 연결이 해제되었습니다.")
    return _planner_plan_redirect_for_date(timezone.localdate())


@login_required
def daily_goal_save(request):
    """웹에서 하루 목표 등록/수정 (form POST)"""
    if request.method != "POST":
        return redirect("planner-index")
    content = request.POST.get("content", "").strip()
    selected_date_raw = request.POST.get("date")
    month_raw = request.POST.get("month")
    try:
        goal_date = date.fromisoformat(selected_date_raw) if selected_date_raw else timezone.localdate()
    except ValueError:
        goal_date = timezone.localdate()
    if content:
        DailyGoal.objects.update_or_create(
            user=request.user,
            date=goal_date,
            defaults={"content": content},
        )
    month = month_raw or goal_date.strftime("%Y-%m")
    return redirect(f"{reverse('planner-index')}?view=plan&month={month}&date={goal_date.isoformat()}")


@login_required
def daily_goal_delete(request, goal_id):
    """웹에서 하루 목표 삭제"""
    if request.method != "POST":
        return redirect("planner-index")
    goal = get_object_or_404(DailyGoal, id=goal_id, user=request.user)
    goal_date = goal.date
    goal.delete()
    month_raw = request.POST.get("month")
    month = month_raw or goal_date.strftime("%Y-%m")
    return redirect(f"{reverse('planner-index')}?view=plan&month={month}&date={goal_date.isoformat()}")


@login_required
def daily_goal_achieve(request, goal_id):
    """웹에서 하루 목표 달성 토글 (form POST)"""
    if request.method != "POST":
        return redirect("planner-index")
    goal = get_object_or_404(DailyGoal, id=goal_id, user=request.user)
    goal.is_achieved = not goal.is_achieved
    goal.save(update_fields=["is_achieved"])
    month_raw = request.POST.get("month")
    month = month_raw or goal.date.strftime("%Y-%m")
    return redirect(f"{reverse('planner-index')}?view=plan&month={month}&date={goal.date.isoformat()}")


def _get_planner_user(request):
    """세션 또는 Token 인증 모두 지원"""
    if request.user.is_authenticated:
        return request.user
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Token '):
        from rest_framework.authtoken.models import Token
        try:
            return Token.objects.select_related('user').get(key=auth.split(' ')[1]).user
        except Token.DoesNotExist:
            pass
    return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_daily_goal(request):
    """오늘 하루 목표 조회/등록 (앱+웹 공용)"""
    import json as _json
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()

    if request.method == "GET":
        goal = DailyGoal.objects.filter(user=user, date=today).first()
        if goal:
            return JsonResponse({
                "id": goal.id,
                "date": goal.date.isoformat(),
                "content": goal.content,
                "is_achieved": goal.is_achieved,
            })
        return JsonResponse({"id": None, "date": today.isoformat(), "content": None, "is_achieved": False})

    # POST
    try:
        data = _json.loads(request.body)
        content = (data.get("content") or "").strip()
    except Exception:
        content = (request.POST.get("content") or "").strip()

    if not content:
        return JsonResponse({"error": "목표 내용을 입력해주세요."}, status=400)

    goal, created = DailyGoal.objects.update_or_create(
        user=user,
        date=today,
        defaults={"content": content},
    )
    return JsonResponse({
        "id": goal.id,
        "date": goal.date.isoformat(),
        "content": goal.content,
        "is_achieved": goal.is_achieved,
        "created": created,
    })


@csrf_exempt
@require_http_methods(["POST"])
def api_daily_goal_achieve(request):
    """하루 목표 달성 토글 (앱+웹 공용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()
    goal = DailyGoal.objects.filter(user=user, date=today).first()
    if not goal:
        return JsonResponse({"error": "오늘 목표가 없습니다."}, status=404)

    goal.is_achieved = not goal.is_achieved
    goal.save(update_fields=["is_achieved"])
    return JsonResponse({"is_achieved": goal.is_achieved})


@csrf_exempt
def api_weekly_achievement(request):
    """주간 달성률 조회 (앱+웹 공용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()
    # 이번 주 월요일
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    goals = DailyGoal.objects.filter(user=user, date__range=(week_start, week_end))
    total = goals.count()
    achieved = goals.filter(is_achieved=True).count()

    days = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        g = goals.filter(date=d).first()
        days.append({
            "date": d.isoformat(),
            "weekday": ["월", "화", "수", "목", "금", "토", "일"][i],
            "content": g.content if g else None,
            "is_achieved": g.is_achieved if g else False,
            "has_goal": g is not None,
        })

    return JsonResponse({
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "total": total,
        "achieved": achieved,
        "rate": round(achieved / total * 100) if total else 0,
        "days": days,
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def api_daily_todos(request):
    """오늘 할 일 목록 조회/추가 (앱용)"""
    import json as _json
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()

    if request.method == "GET":
        todos = DailyTodo.objects.filter(
            user=user, target_date=today, is_completed=False
        ).order_by("planned_time", "created_at")
        return JsonResponse({
            "todos": [
                {"id": t.id, "content": t.content, "is_checked": t.is_checked}
                for t in todos
            ]
        })

    try:
        data = _json.loads(request.body)
        content = (data.get("content") or "").strip()
    except Exception:
        content = (request.POST.get("content") or "").strip()

    if not content:
        return JsonResponse({"error": "내용을 입력해주세요."}, status=400)

    todo = DailyTodo.objects.create(user=user, target_date=today, content=content)
    _create_weekly_goal_from_todo(todo)
    return JsonResponse({"id": todo.id, "content": todo.content, "is_checked": todo.is_checked})


@csrf_exempt
@require_http_methods(["POST"])
def api_daily_todo_toggle(request, todo_id):
    """할 일 체크 토글 (앱용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    todo = get_object_or_404(DailyTodo, id=todo_id, user=user)
    todo.is_checked = not todo.is_checked
    todo.save(update_fields=["is_checked", "updated_at"])
    return JsonResponse({"id": todo.id, "is_checked": todo.is_checked})


@csrf_exempt
@require_http_methods(["POST"])
def api_daily_todo_update(request, todo_id):
    """할 일 내용 수정 (앱용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    todo = get_object_or_404(DailyTodo, id=todo_id, user=user)
    try:
        data = json.loads(request.body)
    except Exception:
        data = {}
    content = data.get("content", "").strip()
    if not content:
        return JsonResponse({"error": "내용을 입력해주세요."}, status=400)
    todo.content = content
    todo.save(update_fields=["content", "updated_at"])
    return JsonResponse({"id": todo.id, "content": todo.content})


@csrf_exempt
@require_http_methods(["POST"])
def api_daily_todo_delete(request, todo_id):
    """할 일 삭제 (앱용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    todo = get_object_or_404(DailyTodo, id=todo_id, user=user)
    todo.delete()
    return JsonResponse({"status": "ok"})


@csrf_exempt
def api_lab_goals(request):
    """이번 주 랩실 전체목표 조회 (앱용)"""
    user = _get_planner_user(request)
    if not user:
        return JsonResponse({"error": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()
    week_start = _monday_week_start(today)

    goals = LabWideGoal.objects.filter(week_start=week_start).select_related("created_by").order_by("created_at")
    return JsonResponse({
        "week_start": week_start.isoformat(),
        "goals": [
            {"id": g.id, "content": g.content, "created_by": g.created_by.name}
            for g in goals
        ],
    })
