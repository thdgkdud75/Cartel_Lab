from datetime import date, datetime as dt, timedelta
import json as _json

from django.contrib import messages
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from attendance.models import AttendanceRecord
from users.models import User

from .view_helpers import staff_required


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
    new_check_out = None
    if check_out_str:
        try:
            check_out = dt.strptime(check_out_str, "%H:%M").time()
            new_check_out = timezone.make_aware(dt.combine(att_date, check_out), tz)
        except Exception:
            return JsonResponse({"error": "퇴실 시간 형식 오류 (HH:MM)"}, status=400)
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
