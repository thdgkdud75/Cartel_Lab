from datetime import date, timedelta
from functools import wraps

from django.shortcuts import get_object_or_404, redirect, render

from attendance.models import AttendanceRecord, AttendanceTimeSetting, LocationSetting
from planner.models import DailyTodo, WeeklyGoal
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
    start = today - timedelta(days=today.weekday())  # 이번 주 월요일
    end = start + timedelta(days=6)
    return start, end


@staff_required
def dashboard_index(request):
    class_filter = request.GET.get("class", "")
    students_qs = User.objects.filter(is_staff=False).order_by("class_group", "name")
    if class_filter in ("A", "B"):
        students_qs = students_qs.filter(class_group=class_filter)

    week_start, week_end = _week_range()
    today = date.today()

    # 이번 주 출결 전체 조회 (N+1 방지)
    attendance_this_week = AttendanceRecord.objects.filter(
        attendance_date__range=(week_start, week_end)
    ).select_related("user")
    att_map = {}  # {user_id: [record, ...]}
    for rec in attendance_this_week:
        att_map.setdefault(rec.user_id, []).append(rec)

    # 오늘 할 일 완료율 (N+1 방지)
    todos_today = DailyTodo.objects.filter(target_date=today).select_related("user")
    todo_map = {}  # {user_id: {"total": n, "done": n}}
    for todo in todos_today:
        entry = todo_map.setdefault(todo.user_id, {"total": 0, "done": 0})
        entry["total"] += 1
        if todo.is_completed:
            entry["done"] += 1

    STATUS_LABEL = {
        "present": "출석",
        "late": "지각",
        "absent": "결석",
        "leave": "조퇴",
    }
    STATUS_COLOR = {
        "present": "green",
        "late": "yellow",
        "absent": "red",
        "leave": "orange",
    }
    WEEKDAYS = ["월", "화", "수", "목", "금"]
    week_dates = [week_start + timedelta(days=i) for i in range(5)]  # 월~금

    student_rows = []
    for student in students_qs:
        records = {r.attendance_date: r for r in att_map.get(student.id, [])}
        week_cells = []
        for d in week_dates:
            rec = records.get(d)
            if rec:
                week_cells.append({
                    "label": STATUS_LABEL.get(rec.status, rec.status),
                    "color": STATUS_COLOR.get(rec.status, "gray"),
                    "check_out_at": rec.check_out_at,
                })
            elif d > today:
                week_cells.append({"label": "-", "color": "gray", "check_out_at": None})
            else:
                week_cells.append({"label": "미기록", "color": "gray", "check_out_at": None})

        td = todo_map.get(student.id, {"total": 0, "done": 0})
        student_rows.append({
            "student": student,
            "week_cells": week_cells,
            "todo_total": td["total"],
            "todo_done": td["done"],
        })

    location_setting = LocationSetting.objects.filter(is_active=True).first()
    time_setting = AttendanceTimeSetting.objects.first()

    return render(request, "dashboard/index.html", {
        "student_rows": student_rows,
        "week_dates": [d.strftime("%-m/%-d") + f"({WEEKDAYS[i]})" for i, d in enumerate(week_dates)],
        "class_filter": class_filter,
        "today": today,
        "location_setting": location_setting,
        "time_setting": time_setting,
    })


@staff_required
def dashboard_student(request, student_id):
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    today = date.today()
    week_start, week_end = _week_range()

    # 최근 30일 출결
    attendance_records = AttendanceRecord.objects.filter(
        user=student,
        attendance_date__gte=today - timedelta(days=30),
    ).order_by("-attendance_date")

    # 이번 주 주간 목표
    weekly_goals = WeeklyGoal.objects.filter(
        user=student,
        week_start=week_start,
    ).order_by("weekday", "planned_time")

    # 오늘 할 일
    daily_todos = DailyTodo.objects.filter(
        user=student,
        target_date=today,
    ).order_by("planned_time", "created_at")

    STATUS_LABEL = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    STATUS_COLOR = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}
    WEEKDAY_KR = {0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토"}

    att_rows = [
        {
            "record": rec,
            "label": STATUS_LABEL.get(rec.status, rec.status),
            "color": STATUS_COLOR.get(rec.status, "gray"),
        }
        for rec in attendance_records
    ]

    goal_rows = [
        {
            "goal": goal,
            "weekday_label": WEEKDAY_KR.get(goal.weekday, ""),
        }
        for goal in weekly_goals
    ]

    return render(request, "dashboard/student.html", {
        "student": student,
        "att_rows": att_rows,
        "goal_rows": goal_rows,
        "daily_todos": daily_todos,
        "today": today,
    })
