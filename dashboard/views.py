from datetime import date, timedelta
from functools import wraps

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

import math

from attendance.models import AttendanceRecord, AttendanceTimeSetting, LocationSetting
from planner.models import DailyTodo, WeeklyGoal
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
    start = today - timedelta(days=today.weekday())  # 이번 주 월요일
    end = start + timedelta(days=6)
    return start, end


@staff_required
def dashboard_index(request):
    grade_filter = request.GET.get("grade", "2")  # 기본 2학년
    class_filter = request.GET.get("class", "")
    students_qs = User.objects.filter(is_staff=False, deletion_scheduled_at__isnull=True).order_by("class_group", "name")
    if grade_filter in ("1", "2"):
        students_qs = students_qs.filter(grade=grade_filter)
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
                    "check_in_at": rec.check_in_at,
                    "check_out_at": rec.check_out_at,
                })
            elif d > today:
                week_cells.append({"label": "-", "color": "gray", "check_in_at": None, "check_out_at": None})
            else:
                week_cells.append({"label": "미기록", "color": "gray", "check_in_at": None, "check_out_at": None})

        td = todo_map.get(student.id, {"total": 0, "done": 0})
        student_rows.append({
            "student": student,
            "week_cells": week_cells,
            "todo_total": td["total"],
            "todo_done": td["done"],
        })

    location_setting = LocationSetting.objects.filter(is_active=True).first()
    time_setting = AttendanceTimeSetting.objects.first()

    # 삭제 예약된 인원
    pending_deletion = User.objects.filter(
        is_staff=False,
        deletion_scheduled_at__isnull=False,
    ).order_by("deletion_scheduled_at")

    # 1학년 선택 시 퀴즈 관리자 데이터 조회
    quiz_data = None
    if grade_filter == "1":
        quiz_data = _build_quiz_dashboard(today)

    return render(request, "dashboard/index.html", {
        "student_rows": student_rows,
        "week_dates": [d.strftime("%-m/%-d") + f"({WEEKDAYS[i]})" for i, d in enumerate(week_dates)],
        "grade_filter": grade_filter,
        "class_filter": class_filter,
        "today": today,
        "location_setting": location_setting,
        "time_setting": time_setting,
        "pending_deletion": pending_deletion,
        "show_attendance": grade_filter != "1",
        "quiz_data": quiz_data,
    })


def _build_quiz_dashboard(today):
    """1학년 퀴즈 현황 데이터 빌드 (quiz.views.admin_dashboard 와 동일한 로직)."""
    week_start = today - timedelta(days=today.weekday())
    quiz_week_dates = [week_start + timedelta(days=i) for i in range(7)]

    # 1년 날짜 범위
    raw_start = today - timedelta(days=364)
    pad = raw_start.weekday()
    year_start = raw_start - timedelta(days=pad)
    year_dates = [year_start + timedelta(days=i) for i in range((today - year_start).days + 1)]

    # 월 레이블
    num_cols = math.ceil(len(year_dates) / 7)
    month_labels = [""] * num_cols
    seen = set()
    for i, d in enumerate(year_dates):
        col = i // 7
        key = (d.year, d.month)
        if key not in seen:
            seen.add(key)
            month_labels[col] = f"{d.month}월"

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
        for a in attempts_qs:
            d = timezone.localtime(a.attempted_at).date()
            mapping.setdefault(a.user_id, {}).setdefault(d, []).append(a)
        return mapping

    week_map = build_date_map(week_attempts)
    year_map = build_date_map(year_attempts)

    freshman_data = []
    for user in freshmen:
        week_cells = []
        for d in quiz_week_dates:
            day_attempts = week_map.get(user.pk, {}).get(d, [])
            if day_attempts:
                if any(a.is_ai_flagged for a in day_attempts):
                    status = "ai"
                elif any(a.is_correct for a in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            week_cells.append({"date": d, "status": status, "attempts": day_attempts})

        year_cells = []
        for d in year_dates:
            day_attempts = year_map.get(user.pk, {}).get(d, [])
            if d > today:
                status = "future"
            elif day_attempts:
                if any(a.is_ai_flagged for a in day_attempts):
                    status = "ai"
                elif any(a.is_correct for a in day_attempts):
                    status = "correct"
                else:
                    status = "wrong"
            else:
                status = "none"
            year_cells.append({"date": d, "status": status, "count": len(day_attempts)})

        user_week_attempts = [a for a in week_attempts if a.user_id == user.pk]
        week_solved = sum(1 for c in week_cells if c["status"] != "none")
        week_correct = sum(1 for c in week_cells if c["status"] == "correct")

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


@staff_required
@require_POST
def dashboard_schedule_delete(request, student_id):
    """삭제 예약 — 3일 뒤 삭제 예정으로 표시"""
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = timezone.now() + timedelta(days=3)
    student.save(update_fields=["deletion_scheduled_at"])
    scheduled = student.deletion_scheduled_at.strftime("%Y-%m-%d")
    return JsonResponse({"status": "success", "message": f"{student.name} — {scheduled} 삭제 예정"})


@staff_required
@require_POST
def dashboard_cancel_delete(request, student_id):
    """삭제 예약 취소"""
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = None
    student.save(update_fields=["deletion_scheduled_at"])
    return JsonResponse({"status": "success", "message": f"{student.name} 삭제 취소됨"})


@staff_required
@require_POST
def dashboard_confirm_delete(request, student_id):
    """즉시 삭제 (삭제 예정 목록에서 완전 삭제)"""
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    name = student.name
    student.delete()
    return JsonResponse({"status": "success", "message": f"{name} 계정이 삭제되었습니다."})


def _get_token_user(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Token '):
        from rest_framework.authtoken.models import Token
        try:
            return Token.objects.select_related('user').get(key=auth.split(' ')[1]).user
        except Token.DoesNotExist:
            pass
    return None


@csrf_exempt
@require_GET
def api_weekly_attendance(request):
    """이번 주 학생별 출결 요약 (앱 관리자용)"""
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    grade_filter = request.GET.get("grade", "2")
    class_filter = request.GET.get("class", "")

    students_qs = User.objects.filter(
        is_staff=False, deletion_scheduled_at__isnull=True
    ).order_by("class_group", "name")
    if grade_filter in ("1", "2"):
        students_qs = students_qs.filter(grade=grade_filter)
    if class_filter in ("A", "B"):
        students_qs = students_qs.filter(class_group=class_filter)

    week_start, week_end = _week_range()
    today = date.today()
    WEEKDAYS = ["월", "화", "수", "목", "금"]
    week_dates = [week_start + timedelta(days=i) for i in range(5)]

    attendance_this_week = AttendanceRecord.objects.filter(
        attendance_date__range=(week_start, week_end)
    ).select_related("user")
    att_map = {}
    for rec in attendance_this_week:
        att_map.setdefault(rec.user_id, {})[rec.attendance_date] = rec

    STATUS_LABEL = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}

    result = []
    for student in students_qs:
        records = att_map.get(student.id, {})
        week_cells = []
        for d in week_dates:
            rec = records.get(d)
            if rec:
                week_cells.append({"label": STATUS_LABEL.get(rec.status, rec.status), "status": rec.status})
            elif d > today:
                week_cells.append({"label": "-", "status": "future"})
            else:
                week_cells.append({"label": "미기록", "status": "none"})

        result.append({
            "name": student.name,
            "class_group": student.class_group,
            "grade": student.grade,
            "week": [{"day": WEEKDAYS[i], "label": c["label"], "status": c["status"]} for i, c in enumerate(week_cells)],
        })

    return JsonResponse({
        "week_start": week_start.strftime("%m/%d"),
        "week_end": week_end.strftime("%m/%d"),
        "students": result,
    })
