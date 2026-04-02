import math
from datetime import date, timedelta
from functools import wraps

from django.shortcuts import redirect
from django.utils import timezone

from attendance.models import AttendanceRecord
from planner.models import DailyGoal, DailyTodo, WeeklyGoal
from quiz.models import QuizAttempt
from users.models import User


def staff_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect(f"/users/login/?next={request.path}")
        if not request.user.is_staff:
            return redirect("/users/")
        return view_func(request, *args, **kwargs)

    return wrapper


def _week_range():
    today = date.today()
    start = today - timedelta(days=today.weekday())
    end = start + timedelta(days=6)
    return start, end


def _build_quiz_dashboard(today):
    week_start = today - timedelta(days=today.weekday())
    quiz_week_dates = [week_start + timedelta(days=i) for i in range(7)]

    raw_start = today - timedelta(days=364)
    pad = raw_start.weekday()
    year_start = raw_start - timedelta(days=pad)
    year_dates = [year_start + timedelta(days=i) for i in range((today - year_start).days + 1)]

    num_cols = math.ceil(len(year_dates) / 7)
    month_labels = [""] * num_cols
    seen = set()
    for i, day in enumerate(year_dates):
        col = i // 7
        key = (day.year, day.month)
        if key not in seen:
            seen.add(key)
            month_labels[col] = f"{day.month}월"

    freshmen = User.objects.filter(grade="1", deletion_scheduled_at__isnull=True).order_by("name")

    week_attempts = (
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=week_start,
            attempted_at__date__lte=week_start + timedelta(days=6),
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )
    year_attempts = (
        QuizAttempt.objects.filter(
            user__grade="1",
            attempted_at__date__gte=year_start,
            attempted_at__date__lte=today,
        )
        .select_related("user", "quiz")
        .order_by("attempted_at")
    )

    def build_date_map(attempts_qs):
        mapping = {}
        for attempt in attempts_qs:
            attempted_day = timezone.localtime(attempt.attempted_at).date()
            mapping.setdefault(attempt.user_id, {}).setdefault(attempted_day, []).append(attempt)
        return mapping

    week_map = build_date_map(week_attempts)
    year_map = build_date_map(year_attempts)

    freshman_data = []
    for user in freshmen:
        week_cells = []
        for day in quiz_week_dates:
            day_attempts = week_map.get(user.pk, {}).get(day, [])
            if day_attempts:
                if any(attempt.is_ai_flagged for attempt in day_attempts):
                    status = "ai"
                elif any(attempt.is_correct for attempt in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            week_cells.append({"date": day, "status": status, "attempts": day_attempts})

        year_cells = []
        for day in year_dates:
            day_attempts = year_map.get(user.pk, {}).get(day, [])
            if day > today:
                status = "future"
            elif day_attempts:
                if any(attempt.is_ai_flagged for attempt in day_attempts):
                    status = "ai"
                elif any(attempt.is_correct for attempt in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            year_cells.append({"date": day, "status": status, "count": len(day_attempts)})

        user_week_attempts = [attempt for attempt in week_attempts if attempt.user_id == user.pk]
        week_solved = sum(1 for cell in week_cells if cell["status"] != "none")
        week_correct = sum(1 for cell in week_cells if cell["status"] == "correct")

        freshman_data.append({
            "user": user,
            "week_cells": week_cells,
            "year_cells": year_cells,
            "week_attempts": user_week_attempts,
            "week_solved": week_solved,
            "week_correct": week_correct,
        })

    return {
        "freshman_data": freshman_data,
        "quiz_week_dates": quiz_week_dates,
        "year_dates": year_dates,
        "month_labels": month_labels,
    }


def _build_student_detail_payload(student, today=None):
    today = today or timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    attendance_records = AttendanceRecord.objects.filter(
        user=student,
        attendance_date__gte=today - timedelta(days=30),
    ).order_by("-attendance_date")

    weekly_goals = WeeklyGoal.objects.filter(
        user=student,
        week_start=week_start,
    ).order_by("weekday", "planned_time")

    daily_todos = DailyTodo.objects.filter(
        user=student,
        target_date=today,
    ).order_by("planned_time", "created_at")

    daily_goals = DailyGoal.objects.filter(
        user=student,
        date__range=(week_start, week_end),
    ).order_by("date")

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    status_color = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}
    weekday_kr = {0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토"}
    daily_goal_map = {goal.date: goal for goal in daily_goals}

    attendance_rows = []
    for record in attendance_records:
        attendance_rows.append({
            "date": record.attendance_date.strftime("%Y-%m-%d"),
            "date_label": record.attendance_date.strftime("%m월 %d일"),
            "weekday_label": ["월", "화", "수", "목", "금", "토", "일"][record.attendance_date.weekday()],
            "label": status_label.get(record.status, record.status),
            "color": status_color.get(record.status, "gray"),
            "check_in": timezone.localtime(record.check_in_at).strftime("%H:%M") if record.check_in_at else None,
            "check_out": timezone.localtime(record.check_out_at).strftime("%H:%M") if record.check_out_at else None,
        })

    weekly_goal_rows = []
    for goal in weekly_goals:
        weekly_goal_rows.append({
            "id": goal.id,
            "weekday": goal.weekday,
            "weekday_label": weekday_kr.get(goal.weekday, ""),
            "content": goal.content,
            "planned_time": goal.planned_time.strftime("%H:%M") if goal.planned_time else None,
            "is_completed": goal.is_completed,
            "color": goal.color,
        })

    daily_todo_rows = []
    for todo in daily_todos:
        daily_todo_rows.append({
            "id": todo.id,
            "content": todo.content,
            "planned_time": todo.planned_time.strftime("%H:%M") if todo.planned_time else None,
            "is_completed": todo.is_completed,
            "color": todo.color,
        })

    achievement_days = []
    achieved_count = 0
    for offset in range(7):
        target_date = week_start + timedelta(days=offset)
        goal = daily_goal_map.get(target_date)
        is_achieved = bool(goal and goal.is_achieved)
        if is_achieved:
            achieved_count += 1
        achievement_days.append({
            "date": target_date.isoformat(),
            "weekday": ["월", "화", "수", "목", "금", "토", "일"][offset],
            "content": goal.content if goal else None,
            "has_goal": goal is not None,
            "is_achieved": is_achieved,
        })

    total_daily_goals = daily_goals.count()
    weekly_goal_total = weekly_goals.count()
    weekly_goal_completed = weekly_goals.filter(is_completed=True).count()
    todo_total = daily_todos.count()
    todo_completed = daily_todos.filter(is_completed=True).count()

    return {
        "student": {
            "name": student.name,
            "student_id": student.student_id,
            "grade": student.grade,
            "class_group": student.class_group or "",
            "github_username": student.github_username or "",
            "profile_analyzed_at": student.profile_analyzed_at.strftime("%Y-%m-%d") if student.profile_analyzed_at else None,
            "has_resume": bool(student.resume_file),
        },
        "today": today.isoformat(),
        "attendance_rows": attendance_rows,
        "daily_todos": daily_todo_rows,
        "weekly_goals": weekly_goal_rows,
        "weekly_goal_summary": {
            "total": weekly_goal_total,
            "completed": weekly_goal_completed,
            "rate": round(weekly_goal_completed / weekly_goal_total * 100) if weekly_goal_total else 0,
        },
        "today_todo_summary": {
            "total": todo_total,
            "completed": todo_completed,
            "rate": round(todo_completed / todo_total * 100) if todo_total else 0,
        },
        "weekly_achievement": {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "total": total_daily_goals,
            "achieved": achieved_count,
            "rate": round(achieved_count / total_daily_goals * 100) if total_daily_goals else 0,
            "days": achievement_days,
        },
    }


def _get_token_user(request):
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if auth.startswith("Bearer "):
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        from rest_framework_simplejwt.tokens import UntypedToken
        from users.models import User as _User

        try:
            token = UntypedToken(auth.split(" ")[1])
            return _User.objects.get(id=token["user_id"])
        except (InvalidToken, TokenError, _User.DoesNotExist):
            pass

    if auth.startswith("Token "):
        from rest_framework.authtoken.models import Token

        try:
            return Token.objects.select_related("user").get(key=auth.split(" ")[1]).user
        except Token.DoesNotExist:
            pass

    return None
