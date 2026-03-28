from datetime import date, timedelta
from functools import wraps

from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

import math

from attendance.models import AttendanceRecord, AttendanceTimeSetting, LocationSetting
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
                    "rec_id": rec.pk,
                    "date_str": d.strftime("%Y-%m-%d"),
                    "editable": True,
                })
            elif d > today:
                week_cells.append({"label": "-", "color": "gray", "check_in_at": None, "check_out_at": None, "rec_id": None, "date_str": d.strftime("%Y-%m-%d"), "editable": False})
            else:
                week_cells.append({"label": "미기록", "color": "gray", "check_in_at": None, "check_out_at": None, "rec_id": None, "date_str": d.strftime("%Y-%m-%d"), "editable": True})

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
                check_in = timezone.localtime(rec.check_in_at).strftime("%H:%M") if rec.check_in_at else None
                check_out = timezone.localtime(rec.check_out_at).strftime("%H:%M") if rec.check_out_at else None
                week_cells.append({
                    "label": STATUS_LABEL.get(rec.status, rec.status),
                    "status": rec.status,
                    "check_in_at": check_in,
                    "check_out_at": check_out,
                })
            elif d > today:
                week_cells.append({"label": "-", "status": "future", "check_in_at": None, "check_out_at": None})
            else:
                week_cells.append({"label": "미기록", "status": "none", "check_in_at": None, "check_out_at": None})

        result.append({
            "name": student.name,
            "class_group": student.class_group,
            "grade": student.grade,
            "week": [{"day": WEEKDAYS[i], **c} for i, c in enumerate(week_cells)],
        })

    return JsonResponse({
        "week_start": week_start.strftime("%m/%d"),
        "week_end": week_end.strftime("%m/%d"),
        "students": result,
    })


@csrf_exempt
@require_POST
def api_auto_checkout(request):
    """미퇴실 인원 오후 5시로 일괄 처리 (앱/웹 관리자용)"""
    from datetime import datetime, time as dtime

    user = _get_token_user(request)
    # 앱(토큰) 또는 웹(세션) 모두 지원
    if not user:
        if request.user.is_authenticated:
            user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    target_date = timezone.localdate() - timedelta(days=1)
    records = AttendanceRecord.objects.filter(
        attendance_date=target_date,
        check_out_at__isnull=True,
    )
    count = records.count()
    if count == 0:
        return JsonResponse({"status": "ok", "message": "처리할 미퇴실 기록이 없습니다."})

    checkout_time = timezone.make_aware(datetime.combine(target_date, dtime(17, 0, 0)))
    records.update(check_out_at=checkout_time)

    return JsonResponse({
        "status": "ok",
        "message": f"{target_date.strftime('%m/%d')} 미퇴실 {count}명을 오후 5시로 처리했습니다.",
        "count": count,
    })


@csrf_exempt
@require_GET
def api_monthly_stats(request):
    """최근 6개월 출결 통계 (관리자 앱용)"""
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
            "present": records.filter(status='present').count(),
            "late": records.filter(status='late').count(),
            "leave": records.filter(status='leave').count(),
            "total": records.count(),
        })

    return JsonResponse({"stats": result})


@csrf_exempt
@require_POST
def dashboard_edit_attendance(request):
    """웹 대시보드에서 출결 시간 수정 (세션 인증)"""
    import json as _json
    from datetime import datetime as dt

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

    STATUS_LABEL = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}

    tz = timezone.get_current_timezone()
    if status:
        record.status = status
    if check_in_str:
        try:
            ci = dt.strptime(check_in_str, "%H:%M").time()
            record.check_in_at = timezone.make_aware(dt.combine(att_date, ci), tz)
        except Exception:
            return JsonResponse({"error": "입실 시간 형식 오류 (HH:MM)"}, status=400)
    if check_out_str:
        try:
            co = dt.strptime(check_out_str, "%H:%M").time()
            record.check_out_at = timezone.make_aware(dt.combine(att_date, co), tz)
        except Exception:
            return JsonResponse({"error": "퇴실 시간 형식 오류 (HH:MM)"}, status=400)
    record.save()

    return JsonResponse({
        "status": "ok",
        "label": STATUS_LABEL.get(record.status, record.status),
        "check_in": record.check_in_at.astimezone(tz).strftime("%H:%M") if record.check_in_at else "",
        "check_out": record.check_out_at.astimezone(tz).strftime("%H:%M") if record.check_out_at else "",
    })


@csrf_exempt
@require_POST
def api_edit_attendance(request):
    """출결 수동 수정 (관리자 앱용)"""
    import json as _json
    from datetime import datetime as dt

    user = _get_token_user(request)
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    try:
        data = _json.loads(request.body)
        student_name = data.get("name", "").strip()
        att_date_str = data.get("date", "")
        check_in_str = data.get("check_in")
        check_out_str = data.get("check_out")
    except Exception:
        return JsonResponse({"error": "잘못된 요청입니다."}, status=400)

    try:
        att_date = dt.strptime(att_date_str, "%Y-%m-%d").date()
    except Exception:
        return JsonResponse({"error": "날짜 형식 오류 (YYYY-MM-DD)"}, status=400)

    try:
        student = User.objects.get(name=student_name, is_staff=False)
    except User.DoesNotExist:
        return JsonResponse({"error": f"{student_name} 학생을 찾을 수 없습니다."}, status=404)
    except User.MultipleObjectsReturned:
        return JsonResponse({"error": f"동명이인이 있습니다."}, status=400)

    record = AttendanceRecord.objects.filter(user=student, attendance_date=att_date).first()
    if not record:
        return JsonResponse({"error": "해당 날짜 출결 기록이 없습니다."}, status=404)

    tz = timezone.get_current_timezone()
    if check_in_str:
        try:
            ci = dt.strptime(check_in_str, "%H:%M").time()
            record.check_in_at = timezone.make_aware(dt.combine(att_date, ci), tz)
        except Exception:
            return JsonResponse({"error": "체크인 시간 형식 오류 (HH:MM)"}, status=400)
    if check_out_str:
        try:
            co = dt.strptime(check_out_str, "%H:%M").time()
            record.check_out_at = timezone.make_aware(dt.combine(att_date, co), tz)
        except Exception:
            return JsonResponse({"error": "체크아웃 시간 형식 오류 (HH:MM)"}, status=400)
    record.save()

    return JsonResponse({"status": "ok", "message": f"{student_name} {att_date} 출결 수정 완료"})


@csrf_exempt
@require_GET
def api_monthly_attendance_goals(request):
    """월간 출결 + 하루 목표 현황 (관리자용)"""
    user = _get_token_user(request)
    if not user:
        if request.user.is_authenticated:
            user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    import calendar as cal_module
    from datetime import datetime as _dt

    # 월 파라미터: ?month=2026-03 (기본: 이번 달)
    month_raw = request.GET.get("month", "")
    today = date.today()
    try:
        month_start = _dt.strptime(month_raw + "-01", "%Y-%m-%d").date() if month_raw else today.replace(day=1)
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

    # 출결 기록 일괄 조회
    att_records = AttendanceRecord.objects.filter(
        attendance_date__range=(month_start, month_end),
        user__in=students_qs,
    ).select_related("user")
    att_map = {}
    for rec in att_records:
        att_map.setdefault(rec.user_id, {})[rec.attendance_date] = rec

    # 하루 목표 일괄 조회
    goals_qs = DailyGoal.objects.filter(
        date__range=(month_start, month_end),
        user__in=students_qs,
    ).select_related("user")
    goal_map = {}
    for g in goals_qs:
        goal_map.setdefault(g.user_id, {})[g.date] = g

    STATUS_LABEL = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    dates = [month_start + timedelta(days=i) for i in range((month_end - month_start).days + 1)]

    result = []
    for student in students_qs:
        student_att = att_map.get(student.id, {})
        student_goals = goal_map.get(student.id, {})

        att_count = {"present": 0, "late": 0, "leave": 0, "absent": 0}
        goal_total = 0
        goal_achieved = 0
        daily = []

        for d in dates:
            rec = student_att.get(d)
            goal = student_goals.get(d)

            if goal:
                goal_total += 1
                if goal.is_achieved:
                    goal_achieved += 1

            if rec:
                att_count[rec.status] = att_count.get(rec.status, 0) + 1
                daily.append({
                    "date": d.isoformat(),
                    "att_status": rec.status,
                    "att_label": STATUS_LABEL.get(rec.status, rec.status),
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
