import calendar as cal_module
import json as _json
from datetime import date, datetime, timedelta, time as dtime

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from attendance.models import AttendanceRecord, AttendanceTimeSetting, LocationSetting
from planner.models import DailyGoal, DailyTodo, WeeklyGoal
from users.models import User

from .view_helpers import (
    _build_quiz_dashboard,
    _build_student_detail_payload,
    _get_token_user,
    _week_range,
)


@csrf_exempt
@require_GET
def api_student_detail(request, student_id):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    return JsonResponse(_build_student_detail_payload(student))


@csrf_exempt
@require_GET
def api_weekly_attendance(request):
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
    weekdays = ["월", "화", "수", "목", "금"]
    week_dates = [week_start + timedelta(days=i) for i in range(5)]

    attendance_this_week = AttendanceRecord.objects.filter(
        attendance_date__range=(week_start, week_end)
    ).select_related("user")
    att_map = {}
    for record in attendance_this_week:
        att_map.setdefault(record.user_id, {})[record.attendance_date] = record

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}

    result = []
    for student in students_qs:
        records = att_map.get(student.id, {})
        week_cells = []
        for day in week_dates:
            record = records.get(day)
            if record:
                check_in = timezone.localtime(record.check_in_at).strftime("%H:%M") if record.check_in_at else None
                check_out = timezone.localtime(record.check_out_at).strftime("%H:%M") if record.check_out_at else None
                week_cells.append({
                    "label": status_label.get(record.status, record.status),
                    "status": record.status,
                    "check_in_at": check_in,
                    "check_out_at": check_out,
                })
            elif day > today:
                week_cells.append({"label": "-", "status": "future", "check_in_at": None, "check_out_at": None})
            else:
                week_cells.append({"label": "미기록", "status": "none", "check_in_at": None, "check_out_at": None})

        result.append({
            "name": student.name,
            "class_group": student.class_group,
            "grade": student.grade,
            "week": [{"day": weekdays[i], **cell} for i, cell in enumerate(week_cells)],
        })

    return JsonResponse({
        "week_start": week_start.strftime("%m/%d"),
        "week_end": week_end.strftime("%m/%d"),
        "students": result,
    })


@csrf_exempt
@require_POST
def api_bulk_checkin(request):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body) if request.body else {}
        date_str = data.get("date", "")
    except Exception:
        data, date_str = {}, ""

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return JsonResponse({"error": "날짜 형식 오류 (YYYY-MM-DD)"}, status=400)
    else:
        target_date = timezone.localdate()

    check_in_str = data.get("check_in", "09:00")
    try:
        ci_time = datetime.strptime(check_in_str, "%H:%M").time()
    except Exception:
        ci_time = dtime(9, 0, 0)

    existing_user_ids = AttendanceRecord.objects.filter(
        attendance_date=target_date,
    ).values_list("user_id", flat=True)
    students = User.objects.filter(is_staff=False).exclude(id__in=existing_user_ids)
    count = students.count()
    if count == 0:
        return JsonResponse({"status": "ok", "message": f"{target_date.strftime('%m/%d')} 모든 학생이 이미 출결 처리되어 있습니다."})

    tz = timezone.get_current_timezone()
    ci_dt = timezone.make_aware(datetime.combine(target_date, ci_time), tz)
    now = timezone.now()
    student_ids = list(students.values_list("id", flat=True))

    # auto_now_add를 임시 해제하여 지정 날짜로 생성
    auto_fields = []
    for fname in ("attendance_date", "check_in_at", "created_at"):
        f = AttendanceRecord._meta.get_field(fname)
        if f.auto_now_add:
            f.auto_now_add = False
            auto_fields.append(f)
    try:
        records = [
            AttendanceRecord(
                user_id=sid, status="present",
                attendance_date=target_date, check_in_at=ci_dt, created_at=now,
            )
            for sid in student_ids
        ]
        AttendanceRecord.objects.bulk_create(records)
    finally:
        for f in auto_fields:
            f.auto_now_add = True

    return JsonResponse({
        "status": "ok",
        "message": f"{target_date.strftime('%m/%d')} 미출결 {count}명을 출석 처리했습니다.",
        "count": count,
    })


@csrf_exempt
@require_POST
def api_cancel_attendance(request):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body)
        student_name = data.get("name", "").strip()
        date_str = data.get("date", "")
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)

    try:
        att_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return JsonResponse({"error": "날짜 형식 오류"}, status=400)

    try:
        student = User.objects.get(name=student_name, is_staff=False)
    except User.DoesNotExist:
        return JsonResponse({"error": f"{student_name} 학생을 찾을 수 없습니다."}, status=404)
    except User.MultipleObjectsReturned:
        return JsonResponse({"error": "동명이인이 있습니다."}, status=400)

    deleted, _ = AttendanceRecord.objects.filter(
        user=student, attendance_date=att_date,
    ).delete()

    if deleted == 0:
        return JsonResponse({"error": "해당 날짜 출결 기록이 없습니다."}, status=404)

    return JsonResponse({
        "status": "ok",
        "message": f"{student_name} {att_date.strftime('%m/%d')} 출결이 취소되었습니다.",
    })


@csrf_exempt
@require_POST
def api_auto_checkout(request):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body) if request.body else {}
        date_str = data.get("date", "")
        co_str = data.get("check_out", "17:00")
    except Exception:
        data, date_str, co_str = {}, "", "17:00"

    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return JsonResponse({"error": "날짜 형식 오류 (YYYY-MM-DD)"}, status=400)
    else:
        target_date = timezone.localdate() - timedelta(days=1)

    try:
        co_time = datetime.strptime(co_str, "%H:%M").time()
    except Exception:
        co_time = dtime(17, 0, 0)

    records = AttendanceRecord.objects.filter(
        attendance_date=target_date,
        check_out_at__isnull=True,
    )
    count = records.count()
    if count == 0:
        return JsonResponse({"status": "ok", "message": f"{target_date.strftime('%m/%d')} 처리할 미퇴실 기록이 없습니다."})

    tz = timezone.get_current_timezone()
    checkout_time = timezone.make_aware(datetime.combine(target_date, co_time), tz)
    from attendance.services import finalize_checkout
    for r in records:
        finalize_checkout(r, checkout_time)

    return JsonResponse({
        "status": "ok",
        "message": f"{target_date.strftime('%m/%d')} 미퇴실 {count}명을 {co_str}로 처리했습니다.",
        "count": count,
    })


@csrf_exempt
@require_GET
def api_monthly_stats(request):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    today = date.today()
    result = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1)
        month_end = min(month_end, today)

        records = AttendanceRecord.objects.filter(
            attendance_date__gte=month_start,
            attendance_date__lte=month_end,
            user__is_staff=False,
        )
        result.append({
            "month": month_start.strftime("%m월"),
            "present": records.filter(status="present").count(),
            "late": records.filter(status="late").count(),
            "leave": records.filter(status="leave").count(),
            "total": records.count(),
        })

    return JsonResponse({"stats": result})


@csrf_exempt
@require_POST
def api_edit_attendance(request):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body)
        student_name = data.get("name", "").strip()
        att_date_str = data.get("date", "")
        check_in_str = data.get("check_in", "").strip() if data.get("check_in") else ""
        check_out_str = data.get("check_out", "").strip() if data.get("check_out") else ""
        status = data.get("status", "").strip() if data.get("status") else ""
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)

    try:
        att_date = datetime.strptime(att_date_str, "%Y-%m-%d").date()
    except Exception:
        return JsonResponse({"error": "날짜 형식 오류 (YYYY-MM-DD)"}, status=400)

    try:
        student = User.objects.get(name=student_name, is_staff=False)
    except User.DoesNotExist:
        return JsonResponse({"error": f"{student_name} 학생을 찾을 수 없습니다."}, status=404)
    except User.MultipleObjectsReturned:
        return JsonResponse({"error": "동명이인이 있습니다."}, status=400)

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
            check_in = datetime.strptime(check_in_str, "%H:%M").time()
            record.check_in_at = timezone.make_aware(datetime.combine(att_date, check_in), tz)
        except Exception:
            return JsonResponse({"error": "체크인 시간 형식 오류 (HH:MM)"}, status=400)
    new_check_out = None
    if check_out_str:
        try:
            check_out = datetime.strptime(check_out_str, "%H:%M").time()
            new_check_out = timezone.make_aware(datetime.combine(att_date, check_out), tz)
        except Exception:
            return JsonResponse({"error": "체크아웃 시간 형식 오류 (HH:MM)"}, status=400)
    record.save()
    if new_check_out is not None:
        from attendance.services import finalize_checkout
        from farm.services import revoke_attendance_reward
        if record.reward_granted:
            revoke_attendance_reward(record)
            record.refresh_from_db()
        finalize_checkout(record, new_check_out)
        record.refresh_from_db()

    return JsonResponse({
        "status": "ok",
        "label": status_label.get(record.status, record.status),
        "check_in": record.check_in_at.astimezone(tz).strftime("%H:%M") if record.check_in_at else "",
        "check_out": record.check_out_at.astimezone(tz).strftime("%H:%M") if record.check_out_at else "",
    })


@csrf_exempt
@require_GET
def api_monthly_attendance_goals(request):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    month_raw = request.GET.get("month", "")
    today = date.today()
    try:
        month_start = datetime.strptime(month_raw + "-01", "%Y-%m-%d").date() if month_raw else today.replace(day=1)
    except ValueError:
        month_start = today.replace(day=1)
    _, last_day = cal_module.monthrange(month_start.year, month_start.month)
    month_end = month_start.replace(day=last_day)

    grade_filter = request.GET.get("grade", "2")
    class_filter = request.GET.get("class", "")

    students_qs = User.objects.filter(
        is_staff=False, deletion_scheduled_at__isnull=True
    ).order_by("class_group", "name")
    if grade_filter in ("1", "2"):
        students_qs = students_qs.filter(grade=grade_filter)
    if class_filter in ("A", "B"):
        students_qs = students_qs.filter(class_group=class_filter)

    att_records = AttendanceRecord.objects.filter(
        attendance_date__range=(month_start, month_end),
        user__in=students_qs,
    ).select_related("user")
    att_map = {}
    for record in att_records:
        att_map.setdefault(record.user_id, {})[record.attendance_date] = record

    goals_qs = DailyGoal.objects.filter(
        date__range=(month_start, month_end),
        user__in=students_qs,
    ).select_related("user")
    goal_map = {}
    for goal in goals_qs:
        goal_map.setdefault(goal.user_id, {})[goal.date] = goal

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    dates = [month_start + timedelta(days=i) for i in range((month_end - month_start).days + 1)]

    result = []
    for student in students_qs:
        student_att = att_map.get(student.id, {})
        student_goals = goal_map.get(student.id, {})

        att_count = {"present": 0, "late": 0, "leave": 0, "absent": 0}
        goal_total = 0
        goal_achieved = 0
        daily = []

        for day in dates:
            record = student_att.get(day)
            goal = student_goals.get(day)

            if goal:
                goal_total += 1
                if goal.is_achieved:
                    goal_achieved += 1

            if record:
                att_count[record.status] = att_count.get(record.status, 0) + 1
                daily.append({
                    "date": day.isoformat(),
                    "att_status": record.status,
                    "att_label": status_label.get(record.status, record.status),
                    "goal_content": goal.content if goal else None,
                    "goal_achieved": goal.is_achieved if goal else False,
                })

        result.append({
            "name": student.name,
            "class_group": student.class_group,
            "grade": student.grade,
            "att_summary": att_count,
            "goal_total": goal_total,
            "goal_achieved": goal_achieved,
            "goal_rate": round(goal_achieved / goal_total * 100) if goal_total else 0,
            "daily": daily,
        })

    return JsonResponse({
        "month": month_start.strftime("%Y-%m"),
        "students": result,
    })


@csrf_exempt
@require_GET
def api_main(request):
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
    weekdays = ["월", "화", "수", "목", "금"]
    week_dates = [week_start + timedelta(days=i) for i in range(5)]
    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    status_color = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}

    attendance_this_week = AttendanceRecord.objects.filter(
        attendance_date__range=(week_start, week_end)
    ).select_related("user")
    att_map = {}
    for record in attendance_this_week:
        att_map.setdefault(record.user_id, {})[record.attendance_date] = record

    todos_today = DailyTodo.objects.filter(target_date=today).select_related("user")
    todo_map = {}
    for todo in todos_today:
        entry = todo_map.setdefault(todo.user_id, {"total": 0, "done": 0})
        entry["total"] += 1
        if todo.is_completed:
            entry["done"] += 1

    students_data = []
    for student in students_qs:
        records = att_map.get(student.id, {})
        week_cells = []
        for i, day in enumerate(week_dates):
            record = records.get(day)
            if record:
                check_in = timezone.localtime(record.check_in_at).strftime("%H:%M") if record.check_in_at else None
                check_out = timezone.localtime(record.check_out_at).strftime("%H:%M") if record.check_out_at else None
                week_cells.append({
                    "day": weekdays[i],
                    "date_str": day.strftime("%Y-%m-%d"),
                    "label": status_label.get(record.status, record.status),
                    "color": status_color.get(record.status, "gray"),
                    "status": record.status,
                    "check_in": check_in,
                    "check_out": check_out,
                    "editable": True,
                    "rec_id": record.pk,
                })
            elif day > today:
                week_cells.append({
                    "day": weekdays[i],
                    "date_str": day.strftime("%Y-%m-%d"),
                    "label": "-",
                    "color": "gray",
                    "status": "future",
                    "check_in": None,
                    "check_out": None,
                    "editable": False,
                    "rec_id": None,
                })
            else:
                week_cells.append({
                    "day": weekdays[i],
                    "date_str": day.strftime("%Y-%m-%d"),
                    "label": "미기록",
                    "color": "gray",
                    "status": "none",
                    "check_in": None,
                    "check_out": None,
                    "editable": True,
                    "rec_id": None,
                })

        todo_stat = todo_map.get(student.id, {"total": 0, "done": 0})
        students_data.append({
            "name": student.name,
            "student_id": student.student_id,
            "class_group": student.class_group or "",
            "grade": student.grade or "",
            "week": week_cells,
            "todo_total": todo_stat["total"],
            "todo_done": todo_stat["done"],
        })

    pending = User.objects.filter(is_staff=False, deletion_scheduled_at__isnull=False).order_by("deletion_scheduled_at")
    pending_data = [
        {
            "name": pending_user.name,
            "student_id": pending_user.student_id,
            "class_group": pending_user.class_group or "",
            "scheduled_at": pending_user.deletion_scheduled_at.strftime("%Y-%m-%d"),
        }
        for pending_user in pending
    ]

    location_setting = LocationSetting.objects.filter(is_active=True).first()
    loc_data = None
    if location_setting:
        loc_data = {
            "name": location_setting.name,
            "latitude": float(location_setting.latitude),
            "longitude": float(location_setting.longitude),
            "radius": float(location_setting.radius),
        }

    time_setting = AttendanceTimeSetting.objects.first()
    time_data = None
    if time_setting:
        time_data = {
            "check_in_deadline": time_setting.check_in_deadline.strftime("%H:%M"),
            "check_out_minimum": time_setting.check_out_minimum.strftime("%H:%M"),
        }

    show_attendance = grade_filter != "1"
    quiz_data_out = None
    if grade_filter == "1":
        quiz_dashboard = _build_quiz_dashboard(today)
        quiz_week_dates = [day.strftime("%m/%d") for day in quiz_dashboard["quiz_week_dates"]]
        freshman_out = []
        for item in quiz_dashboard["freshman_data"]:
            week_cells_q = [
                {"date": cell["date"].strftime("%Y-%m-%d"), "status": cell["status"]}
                for cell in item["week_cells"]
            ]
            year_cells_q = [
                {"date": cell["date"].strftime("%Y-%m-%d"), "status": cell["status"], "count": cell["count"]}
                for cell in item["year_cells"]
            ]
            week_attempts_out = [
                {
                    "attempted_at": timezone.localtime(attempt.attempted_at).strftime("%m/%d %H:%M"),
                    "title": attempt.quiz.title,
                    "submitted_answer": attempt.submitted_answer,
                    "is_correct": attempt.is_correct,
                    "is_ai_flagged": attempt.is_ai_flagged,
                }
                for attempt in item["week_attempts"]
            ]
            freshman_out.append({
                "name": item["user"].name,
                "student_id": item["user"].student_id,
                "week_cells": week_cells_q,
                "year_cells": year_cells_q,
                "week_attempts": week_attempts_out,
                "week_solved": item["week_solved"],
                "week_correct": item["week_correct"],
            })
        quiz_data_out = {
            "quiz_week_dates": quiz_week_dates,
            "month_labels": quiz_dashboard["month_labels"],
            "freshman_data": freshman_out,
        }

    return JsonResponse({
        "week_start": week_start.strftime("%m/%d"),
        "week_end": week_end.strftime("%m/%d"),
        "today": today.strftime("%Y-%m-%d"),
        "today_weekday": today.weekday(),
        "grade_filter": grade_filter,
        "class_filter": class_filter,
        "show_attendance": show_attendance,
        "students": students_data,
        "pending_deletion": pending_data,
        "location_setting": loc_data,
        "time_setting": time_data,
        "quiz_data": quiz_data_out,
    })


@csrf_exempt
@require_POST
def api_schedule_delete(request, student_id):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = timezone.now() + timedelta(days=3)
    student.save(update_fields=["deletion_scheduled_at"])
    return JsonResponse({"status": "success", "scheduled_at": student.deletion_scheduled_at.strftime("%Y-%m-%d")})


@csrf_exempt
@require_POST
def api_cancel_delete(request, student_id):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    student.deletion_scheduled_at = None
    student.save(update_fields=["deletion_scheduled_at"])
    return JsonResponse({"status": "success"})


@csrf_exempt
@require_POST
def api_confirm_delete(request, student_id):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)
    student = get_object_or_404(User, student_id=student_id, is_staff=False)
    name = student.name
    student.delete()
    return JsonResponse({"status": "success", "message": f"{name} 삭제됨"})


@csrf_exempt
@require_POST
def api_change_student_password(request, student_id):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    student = get_object_or_404(User, student_id=student_id, is_staff=False)

    try:
        data = _json.loads(request.body or "{}")
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)

    new_password = str(data.get("new_password", "") or "")
    new_password_confirm = str(data.get("new_password_confirm", "") or "")

    if not new_password:
        return JsonResponse({"error": "새 비밀번호를 입력해주세요."}, status=400)

    if new_password != new_password_confirm:
        return JsonResponse({"error": "비밀번호가 일치하지 않습니다."}, status=400)

    try:
        validate_password(new_password, student)
    except ValidationError as exc:
        return JsonResponse({"error": " ".join(exc.messages)}, status=400)

    student.set_password(new_password)
    student.save(update_fields=["password"])
    return JsonResponse({"status": "success", "message": f"{student.name} 비밀번호를 변경했습니다."})


@csrf_exempt
@require_POST
def api_set_location(request):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"status": "error", "message": "관리자 권한이 필요합니다."}, status=403)
    try:
        data = _json.loads(request.body)
        latitude = float(data["latitude"])
        longitude = float(data["longitude"])
        name = data.get("name", "연구실")
        radius = float(data.get("radius", 50))
    except Exception:
        return JsonResponse({"status": "error", "message": "잘못된 요청"}, status=400)

    LocationSetting.objects.update_or_create(
        is_active=True,
        defaults={"name": name, "latitude": latitude, "longitude": longitude, "radius": radius},
    )
    cache.delete("attendance_location_setting")
    return JsonResponse({"status": "success", "message": f"위치가 '{name}'으로 설정되었습니다."})


@csrf_exempt
@require_GET
def api_student_monthly_attendance(request, student_id):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    student = get_object_or_404(User, student_id=student_id, is_staff=False)

    month_raw = request.GET.get("month", "")
    today = date.today()
    try:
        month_start = datetime.strptime(month_raw + "-01", "%Y-%m-%d").date() if month_raw else today.replace(day=1)
    except ValueError:
        month_start = today.replace(day=1)

    _, last_day = cal_module.monthrange(month_start.year, month_start.month)
    month_end = month_start.replace(day=last_day)

    records = AttendanceRecord.objects.filter(
        user=student,
        attendance_date__range=(month_start, month_end),
    ).order_by("attendance_date")

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    status_color = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}

    summary = {"present": 0, "late": 0, "absent": 0, "leave": 0}
    record_list = []
    for record in records:
        summary[record.status] = summary.get(record.status, 0) + 1
        record_list.append({
            "date": record.attendance_date.strftime("%Y-%m-%d"),
            "status": record.status,
            "color": status_color.get(record.status, "gray"),
            "label": status_label.get(record.status, record.status),
            "check_out": timezone.localtime(record.check_out_at).strftime("%H:%M") if record.check_out_at else None,
        })

    # DailyGoal: 날짜별 하루 목표
    daily_goals = DailyGoal.objects.filter(
        user=student,
        date__range=(month_start, month_end),
    ).order_by("date")
    daily_goal_map = {}
    for goal in daily_goals:
        daily_goal_map[goal.date.strftime("%Y-%m-%d")] = {
            "content": goal.content,
            "is_achieved": goal.is_achieved,
        }

    # WeeklyGoal: 해당 월에 걸치는 주간목표
    # week_start가 월 범위 내이거나, week_start + 6일이 월 범위에 걸치는 경우
    weekly_goals = WeeklyGoal.objects.filter(
        user=student,
        week_start__range=(month_start - timedelta(days=6), month_end),
    ).order_by("week_start", "weekday")

    weekday_kr = ["일", "월", "화", "수", "목", "금", "토"]
    weeks_map: dict[str, list] = {}
    for goal in weekly_goals:
        ws = goal.week_start.strftime("%Y-%m-%d")
        weeks_map.setdefault(ws, []).append({
            "weekday": goal.weekday,
            "weekday_label": weekday_kr[goal.weekday],
            "content": goal.content,
            "is_completed": goal.is_completed,
            "planned_time": goal.planned_time.strftime("%H:%M") if goal.planned_time else None,
        })

    weekly_goal_list = [
        {"week_start": ws, "goals": goals}
        for ws, goals in weeks_map.items()
    ]

    return JsonResponse({
        "month": month_start.strftime("%Y-%m"),
        "student_name": student.name,
        "records": record_list,
        "summary": summary,
        "daily_goals": daily_goal_map,
        "weekly_goals": weekly_goal_list,
    })


@csrf_exempt
@require_POST
def api_set_time(request):
    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"status": "error", "message": "관리자 권한이 필요합니다."}, status=403)
    try:
        data = _json.loads(request.body)
        check_in = datetime.strptime(data["check_in"], "%H:%M").time()
        check_out = datetime.strptime(data["check_out"], "%H:%M").time()
    except Exception:
        return JsonResponse({"status": "error", "message": "잘못된 시간 형식 (HH:MM)"}, status=400)

    setting = AttendanceTimeSetting.objects.first() or AttendanceTimeSetting()
    setting.check_in_deadline = check_in
    setting.check_out_minimum = check_out
    setting.save()
    return JsonResponse({"status": "success", "message": "시간 기준이 저장되었습니다."})
