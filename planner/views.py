import calendar
import secrets
from datetime import date, datetime, time, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone

from .google_calendar import (
    GoogleCalendarError,
    build_authorization_url,
    create_goal_event,
    create_todo_event,
    exchange_code_for_token,
    fetch_google_email,
    is_configured,
    list_events,
    token_expiry_from_seconds,
)
from .models import DailyTodo, GoogleCalendarCredential, LabWideGoal, WeeklyGoal


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


def _duration_days_from_input(raw_days, default=1):
    try:
        parsed = int(raw_days)
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(parsed, 60))


def _color_from_input(raw_color):
    if raw_color in {"red", "blue", "yellow"}:
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
    month = target_date.strftime("%Y-%m")
    return redirect(
        f"{reverse('planner-index')}?view=plan&month={month}&date={target_date.isoformat()}"
    )


def _sync_daily_todo_create(todo):
    credential = getattr(todo.user, "google_calendar_credential", None)
    if not credential:
        return None

    event_id = create_todo_event(credential, todo)
    if not event_id:
        raise GoogleCalendarError("구글 캘린더에서 이벤트 ID를 받지 못했습니다.")

    todo.google_event_id = event_id
    todo.save(update_fields=["google_event_id", "updated_at"])
    return event_id


def _sync_weekly_goal_create(goal, goal_date):
    credential = getattr(goal.user, "google_calendar_credential", None)
    if not credential:
        return None

    event_id = create_goal_event(credential, goal, goal_date)
    if not event_id:
        raise GoogleCalendarError("구글 캘린더에서 목표 이벤트 ID를 받지 못했습니다.")

    goal.google_event_id = event_id
    goal.save(update_fields=["google_event_id", "updated_at"])
    return event_id


def _parse_google_datetime(raw_value):
    if not raw_value:
        return None

    normalized = raw_value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return timezone.localtime(parsed)


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

    for event in events:
        google_event_id = event.get("id", "")
        if not google_event_id:
            continue

        todo_qs = DailyTodo.objects.filter(user=user, google_event_id=google_event_id)
        status = event.get("status", "")
        if status == "cancelled":
            deleted += todo_qs.count()
            todo_qs.delete()
            continue

        target_date, planned_time, content = _todo_fields_from_google_event(event)
        if not target_date or not content:
            continue

        todo = todo_qs.first()
        if todo:
            changed = False
            if todo.target_date != target_date:
                todo.target_date = target_date
                changed = True
            if todo.planned_time != planned_time:
                todo.planned_time = planned_time
                changed = True
            if todo.content != content:
                todo.content = content
                changed = True
            if changed:
                todo.save(update_fields=["target_date", "planned_time", "content", "updated_at"])
                updated += 1
            continue

        DailyTodo.objects.create(
            user=user,
            target_date=target_date,
            planned_time=planned_time,
            content=content,
            google_event_id=google_event_id,
        )
        created += 1

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

    if (
        request.user.is_authenticated
        and planner_view == "plan"
        and hasattr(request.user, "google_calendar_credential")
    ):
        try:
            _sync_google_events_for_range(request.user, calendar_start, calendar_end)
        except GoogleCalendarError as exc:
            messages.warning(request, f"구글 캘린더 자동 동기화에 실패했습니다: {exc}")

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
            DailyTodo.objects.filter(user=request.user, target_date=selected_date, is_completed=False)
            if request.user.is_authenticated
            else DailyTodo.objects.none()
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
    planned_time = _time_from_input(request.POST.get("planned_time"))
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
            todo, created = DailyTodo.objects.get_or_create(
                user=request.user,
                target_date=target_date,
                planned_time=planned_time,
                content=content,
                defaults={"is_completed": False, "color": color},
            )
            if not created and todo.color != color:
                todo.color = color
                todo.save(update_fields=["color", "updated_at"])
            if created and hasattr(request.user, "google_calendar_credential"):
                try:
                    _sync_daily_todo_create(todo)
                except GoogleCalendarError as exc:
                    messages.warning(request, f"투두는 생성됐지만 Google Calendar 동기화에 실패했습니다: {exc}")

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


@login_required
def toggle_goal(request, goal_id):
    if request.method != "POST":
        return redirect("planner-index")

    goal = get_object_or_404(WeeklyGoal, id=goal_id, user=request.user)
    goal_date = _goal_date(goal)

    existing_todo = DailyTodo.objects.filter(
        user=request.user,
        target_date=goal_date,
        planned_time=goal.planned_time,
        content=goal.content,
        color=goal.color,
        is_completed=False,
    ).exists()
    if not existing_todo:
        DailyTodo.objects.create(
            user=request.user,
            target_date=goal_date,
            planned_time=goal.planned_time,
            color=goal.color,
            content=goal.content,
            google_event_id=goal.google_event_id,
            is_completed=False,
        )

    goal.delete()
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
    planned_time = _time_from_input(request.POST.get("planned_time"))
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

        first_week_start = _week_start_from_input(goal_date.isoformat())
        first_weekday = (goal_date - first_week_start).days
        goal.week_start = first_week_start
        goal.weekday = first_weekday
        goal.content = content
        goal.planned_time = planned_time
        goal.color = color
        goal.save(update_fields=["week_start", "weekday", "content", "planned_time", "color", "updated_at"])

        created_goals_with_dates = []
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

            new_goal = WeeklyGoal.objects.create(
                user=request.user,
                week_start=target_week_start,
                weekday=target_weekday,
                planned_time=planned_time,
                color=color,
                content=content,
            )
            created_goals_with_dates.append((new_goal, target_date))

        if hasattr(request.user, "google_calendar_credential"):
            for new_goal, target_date in created_goals_with_dates:
                try:
                    _sync_weekly_goal_create(new_goal, target_date)
                except GoogleCalendarError:
                    messages.warning(request, "수정된 기간 일정 중 일부 Google Calendar 동기화에 실패했습니다.")
                    break

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
    color = _color_from_input(request.POST.get("color"))
    target_date_raw = request.POST.get("target_date")
    month_raw = request.POST.get("month")
    target_date = timezone.localdate()
    try:
        if target_date_raw:
            target_date = date.fromisoformat(target_date_raw)
    except ValueError:
        pass

    if content:
        todo = DailyTodo.objects.create(
            user=request.user,
            target_date=target_date,
            planned_time=planned_time,
            color=color,
            content=content,
        )
        if hasattr(request.user, "google_calendar_credential"):
            try:
                _sync_daily_todo_create(todo)
            except GoogleCalendarError as exc:
                messages.warning(request, f"투두는 저장됐지만 구글 캘린더 동기화에 실패했습니다: {exc}")

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
    week_start = _week_start_from_input(target_date.isoformat())
    weekday = (target_date - week_start).days

    already_exists = WeeklyGoal.objects.filter(
        user=request.user,
        week_start=week_start,
        weekday=weekday,
        content=todo.content,
        planned_time=todo.planned_time,
        color=todo.color,
    ).exists()
    if not already_exists:
        WeeklyGoal.objects.create(
            user=request.user,
            week_start=week_start,
            weekday=weekday,
            planned_time=todo.planned_time,
            color=todo.color,
            content=todo.content,
        )

    todo.is_completed = True
    todo.save(update_fields=["is_completed", "updated_at"])
    return _planner_plan_redirect_for_date(target_date)


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
        messages.error(request, "Google Calendar 연결 후 가져오기를 사용할 수 있습니다.")
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
        messages.error(request, f"구글 일정 가져오기에 실패했습니다: {exc}")

    return _planner_plan_redirect_for_date(target_date)


@login_required
def google_calendar_connect(request):
    if not is_configured():
        messages.error(request, "Google Calendar 설정이 비어 있습니다. .env 값을 먼저 입력하세요.")
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
        messages.error(request, "구글 로그인 검증(state)에 실패했습니다. 다시 시도하세요.")
        return redirect("planner-index")

    oauth_error = request.GET.get("error")
    if oauth_error:
        messages.error(request, f"구글 연결이 취소되었거나 실패했습니다: {oauth_error}")
        return redirect("planner-index")

    code = request.GET.get("code", "")
    if not code:
        messages.error(request, "구글 인증 코드가 없어 연결할 수 없습니다.")
        return redirect("planner-index")

    try:
        token_data = exchange_code_for_token(request, code)
        google_email = fetch_google_email(token_data["access_token"])
    except GoogleCalendarError as exc:
        messages.error(request, f"구글 계정 연결에 실패했습니다: {exc}")
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
    month_start = today.replace(day=1)
    _, month_days = calendar.monthrange(today.year, today.month)
    month_end = today.replace(day=month_days)
    try:
        _sync_google_events_for_range(request.user, month_start, month_end)
    except GoogleCalendarError:
        pass

    messages.success(request, "Google Calendar 연결이 완료되었습니다.")
    return _planner_plan_redirect_for_date(today)


@login_required
def google_calendar_disconnect(request):
    if request.method != "POST":
        return redirect("planner-index")

    GoogleCalendarCredential.objects.filter(user=request.user).delete()
    messages.success(request, "Google Calendar 연결을 해제했습니다.")
    return _planner_plan_redirect_for_date(timezone.localdate())
