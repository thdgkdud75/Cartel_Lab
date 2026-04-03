from datetime import date, datetime as dt, timedelta
import json as _json

from django.contrib import messages
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from attendance.models import AttendanceRecord, AttendanceTimeSetting, LocationSetting
from planner.models import DailyTodo, WeeklyGoal
from users.models import User

from .view_helpers import _build_quiz_dashboard, _week_range, staff_required


@staff_required
def dashboard_index(request):
    grade_filter = request.GET.get("grade", "2")
    class_filter = request.GET.get("class", "")
    students_qs = User.objects.filter(is_staff=False, deletion_scheduled_at__isnull=True).order_by("class_group", "name")
    if grade_filter in ("1", "2"):
        students_qs = students_qs.filter(grade=grade_filter)
    if class_filter in ("A", "B"):
        students_qs = students_qs.filter(class_group=class_filter)

    week_start, week_end = _week_range()
    today = date.today()

    attendance_this_week = AttendanceRecord.objects.filter(
        attendance_date__range=(week_start, week_end)
    ).select_related("user")
    att_map = {}
    for record in attendance_this_week:
        att_map.setdefault(record.user_id, []).append(record)

    todos_today = DailyTodo.objects.filter(target_date=today).select_related("user")
    todo_map = {}
    for todo in todos_today:
        entry = todo_map.setdefault(todo.user_id, {"total": 0, "done": 0})
        entry["total"] += 1
        if todo.is_completed:
            entry["done"] += 1

    status_label = {
        "present": "출석",
        "late": "지각",
        "absent": "결석",
        "leave": "조퇴",
    }
    status_color = {
        "present": "green",
        "late": "yellow",
        "absent": "red",
        "leave": "orange",
    }
    weekdays = ["월", "화", "수", "목", "금"]
    week_dates = [week_start + timedelta(days=i) for i in range(5)]

    student_rows = []
    for student in students_qs:
        records = {record.attendance_date: record for record in att_map.get(student.id, [])}
        week_cells = []
        for day in week_dates:
            record = records.get(day)
            if record:
                week_cells.append({
                    "label": status_label.get(record.status, record.status),
                    "color": status_color.get(record.status, "gray"),
                    "check_in_at": record.check_in_at,
                    "check_out_at": record.check_out_at,
                    "rec_id": record.pk,
                    "date_str": day.strftime("%Y-%m-%d"),
                    "editable": True,
                })
            elif day > today:
                week_cells.append({
                    "label": "-",
                    "color": "gray",
                    "check_in_at": None,
                    "check_out_at": None,
                    "rec_id": None,
                    "date_str": day.strftime("%Y-%m-%d"),
                    "editable": False,
                })
            else:
                week_cells.append({
                    "label": "미기록",
                    "color": "gray",
                    "check_in_at": None,
                    "check_out_at": None,
                    "rec_id": None,
                    "date_str": day.strftime("%Y-%m-%d"),
                    "editable": True,
                })

        todo_stat = todo_map.get(student.id, {"total": 0, "done": 0})
        student_rows.append({
            "student": student,
            "week_cells": week_cells,
            "todo_total": todo_stat["total"],
            "todo_done": todo_stat["done"],
        })

    location_setting = LocationSetting.objects.filter(is_active=True).first()
    time_setting = AttendanceTimeSetting.objects.first()
    pending_deletion = User.objects.filter(
        is_staff=False,
        deletion_scheduled_at__isnull=False,
    ).order_by("deletion_scheduled_at")

    quiz_data = _build_quiz_dashboard(today) if grade_filter == "1" else None

    return render(request, "dashboard/index.html", {
        "student_rows": student_rows,
        "week_dates": [day.strftime("%-m/%-d") + f"({weekdays[i]})" for i, day in enumerate(week_dates)],
        "grade_filter": grade_filter,
        "class_filter": class_filter,
        "today": today,
        "location_setting": location_setting,
        "time_setting": time_setting,
        "pending_deletion": pending_deletion,
        "show_attendance": grade_filter != "1",
        "quiz_data": quiz_data,
    })


@staff_required
def dashboard_student(request, student_id):
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    today = date.today()
    week_start, _ = _week_range()

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

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    status_color = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}
    weekday_kr = {0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토"}

    att_rows = [
        {
            "record": record,
            "label": status_label.get(record.status, record.status),
            "color": status_color.get(record.status, "gray"),
        }
        for record in attendance_records
    ]
    goal_rows = [
        {
            "goal": goal,
            "weekday_label": weekday_kr.get(goal.weekday, ""),
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
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = timezone.now() + timedelta(days=3)
    student.save(update_fields=["deletion_scheduled_at"])
    scheduled = student.deletion_scheduled_at.strftime("%Y-%m-%d")
    return JsonResponse({"status": "success", "message": f"{student.name} — {scheduled} 삭제 예정"})


@staff_required
@require_POST
def dashboard_cancel_delete(request, student_id):
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = None
    student.save(update_fields=["deletion_scheduled_at"])
    return JsonResponse({"status": "success", "message": f"{student.name} 삭제 취소됨"})


@staff_required
@require_POST
def dashboard_confirm_delete(request, student_id):
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    name = student.name
    student.delete()
    return JsonResponse({"status": "success", "message": f"{name} 계정이 삭제되었습니다."})


@staff_required
@require_POST
def dashboard_change_password(request, student_id):
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    new_password = str(request.POST.get("new_password", "") or "")
    new_password_confirm = str(request.POST.get("new_password_confirm", "") or "")

    if not new_password:
        messages.error(request, "새 비밀번호를 입력해주세요.")
        return redirect("dashboard-student", student_id=student.student_id)

    if new_password != new_password_confirm:
        messages.error(request, "비밀번호가 일치하지 않습니다.")
        return redirect("dashboard-student", student_id=student.student_id)

    try:
        validate_password(new_password, student)
    except ValidationError as exc:
        messages.error(request, " ".join(exc.messages))
        return redirect("dashboard-student", student_id=student.student_id)

    student.set_password(new_password)
    student.save(update_fields=["password"])
    messages.success(request, f"{student.name} 비밀번호를 변경했습니다.")
    return redirect("dashboard-student", student_id=student.student_id)


@csrf_exempt
@require_POST
def dashboard_edit_attendance(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body)
        student_pk = data.get("student_pk")
        date_str = data.get("date", "")
        check_in_str = data.get("check_in", "").strip()
        check_out_str = data.get("check_out", "").strip()
        status = data.get("status", "").strip()
    except Exception:
        return JsonResponse({"error": "잘못된 요청"}, status=400)

    try:
        att_date = dt.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return JsonResponse({"error": "날짜 형식 오류"}, status=400)

    student = get_object_or_404(User, pk=student_pk, is_staff=False)
    record, _ = AttendanceRecord.objects.get_or_create(
        user=student,
        attendance_date=att_date,
        defaults={"status": status or "present"},
    )

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    tz = timezone.get_current_timezone()

    if status:
        record.status = status
    if check_in_str:
        try:
            check_in = dt.strptime(check_in_str, "%H:%M").time()
            record.check_in_at = timezone.make_aware(dt.combine(att_date, check_in), tz)
        except Exception:
            return JsonResponse({"error": "입실 시간 형식 오류 (HH:MM)"}, status=400)
    if check_out_str:
        try:
            check_out = dt.strptime(check_out_str, "%H:%M").time()
            record.check_out_at = timezone.make_aware(dt.combine(att_date, check_out), tz)
        except Exception:
            return JsonResponse({"error": "퇴실 시간 형식 오류 (HH:MM)"}, status=400)
    record.save()

    return JsonResponse({
        "status": "ok",
        "label": status_label.get(record.status, record.status),
        "check_in": record.check_in_at.astimezone(tz).strftime("%H:%M") if record.check_in_at else "",
        "check_out": record.check_out_at.astimezone(tz).strftime("%H:%M") if record.check_out_at else "",
    })
