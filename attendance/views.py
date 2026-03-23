import json
import math
from datetime import timedelta
from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from .models import AttendanceRecord, LocationSetting, AttendanceTimeSetting


_ONE_DAY = 60 * 60 * 24


def _get_user(request):
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


def _get_time_setting():
    setting = cache.get("attendance_time_setting")
    if setting is None:
        setting = AttendanceTimeSetting.objects.first()
        cache.set("attendance_time_setting", setting, _ONE_DAY)
    return setting


def _get_location_setting():
    location = cache.get("attendance_location_setting")
    if location is None:
        location = LocationSetting.objects.filter(is_active=True).first()
        cache.set("attendance_location_setting", location, _ONE_DAY)
    return location


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    두 좌표 사이의 직선 거리를 계산 (미터 단위)
    """
    R = 6371000  # 지구 반지름 (미터)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


@login_required
def index(request):
    """
    출결 메인 페이지
    """
    today = timezone.localdate()
    today_record = AttendanceRecord.objects.filter(
        user=request.user, attendance_date=today
    ).first()
    
    # 올해 1월 1일부터 오늘까지의 출결 현황
    first_day_of_year = today.replace(month=1, day=1)
    yearly_records = AttendanceRecord.objects.filter(
        user=request.user,
        attendance_date__gte=first_day_of_year
    )
    
    heatmap_data = {}
    time_setting = _get_time_setting()

    for record in yearly_records:
        date_str = record.attendance_date.strftime('%Y-%m-%d')
        
        in_status = "present"
        out_status = "present"
        
        # 지각 여부 (입실 기록 기준)
        if time_setting and record.check_in_at:
            in_time = timezone.localtime(record.check_in_at).time()
            if in_time > time_setting.check_in_deadline:
                in_status = "late"
                
        # 조퇴 여부 (퇴실 기록 기준)
        if time_setting:
            if record.check_out_at:
                out_time = timezone.localtime(record.check_out_at).time()
                if out_time < time_setting.check_out_minimum:
                    out_status = "leave"
            else:
                out_status = "none" # 아직 퇴실 전이거나 퇴실 기록이 없는 경우
                
        heatmap_data[date_str] = {
            "status": record.status, # 기존 호환성용
            "in": in_status,
            "out": out_status
        }

    return render(request, "attendance/index.html", {
        "today_record": today_record,
        "heatmap_data": json.dumps(heatmap_data),
        "time_setting": time_setting
    })


def attendance_list(request):
    """
    HTMX 폴링을 위한 실시간 출결 목록 (부분 템플릿)
    """
    today = timezone.localdate()
    qs = AttendanceRecord.objects.filter(attendance_date=today)\
        .select_related('user')\
        .exclude(user__is_staff=True)\
        .exclude(user__is_superuser=True)\
        .order_by("-check_in_at")
    if request.user.is_authenticated:
        qs = qs.exclude(user=request.user)
    records = qs
    return render(request, "attendance/partial_list.html", {"records": records})


@csrf_exempt
@require_POST
def check_in(request):
    """
    사용자 위치를 기반으로 출석 처리
    """
    user = _get_user(request)
    if not user:
        return JsonResponse({"status": "error", "message": "인증이 필요합니다."}, status=401)

    try:
        data = json.loads(request.body)
        user_lat = float(data.get("latitude"))
        user_lon = float(data.get("longitude"))
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"status": "error", "message": "잘못된 위치 정보입니다."}, status=400)

    location = _get_location_setting()
    if not location:
        return JsonResponse({"status": "error", "message": "설정된 출결 위치가 없습니다. 관리자에게 문의하세요."}, status=400)

    distance = haversine_distance(user_lat, user_lon, location.latitude, location.longitude)

    if distance > location.radius:
        return JsonResponse({
            "status": "error",
            "message": f"위치 범위를 벗어났습니다. (현재 약 {int(distance)}m 거리)"
        }, status=403)

    today = timezone.localdate()
    now_time = timezone.localtime().time()

    time_setting = _get_time_setting()
    status = "present"
    if time_setting and now_time > time_setting.check_in_deadline:
        status = "late"

    record, created = AttendanceRecord.objects.get_or_create(
        user=user,
        attendance_date=today,
        defaults={"status": status}
    )

    if not created:
        return JsonResponse({"status": "info", "message": "이미 오늘 출석 완료되었습니다."})

    if status == "present":
        msg = f"{location.name}에 출석 완료되었습니다!"
    else:
        deadline_str = time_setting.check_in_deadline.strftime('%H:%M') if time_setting else ""
        msg = f"지각 처리되었습니다. (기준: {deadline_str})"
    return JsonResponse({"status": "success", "message": msg})


@csrf_exempt
@require_POST
def check_out(request):
    """
    위치에 상관 없이 퇴실 처리
    """
    user = _get_user(request)
    if not user:
        return JsonResponse({"status": "error", "message": "인증이 필요합니다."}, status=401)

    try:
        data = json.loads(request.body)
        user_lat = float(data.get("latitude"))
        user_lon = float(data.get("longitude"))
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"status": "error", "message": "잘못된 위치 정보입니다."}, status=400)

    location = _get_location_setting()
    if not location:
        return JsonResponse({"status": "error", "message": "설정된 위치 정보가 없습니다."}, status=400)

    distance = haversine_distance(user_lat, user_lon, location.latitude, location.longitude)

    if distance > location.radius:
        return JsonResponse({
            "status": "error",
            "message": f"위치 범위를 벗어났습니다. (현재 약 {int(distance)}m 거리)"
        }, status=403)

    today = timezone.localdate()
    try:
        record = AttendanceRecord.objects.get(user=user, attendance_date=today)
        if record.check_out_at:
            return JsonResponse({"status": "info", "message": "이미 퇴실 처리가 완료되었습니다."})

        now_time = timezone.localtime().time()
        time_setting = _get_time_setting()

        if time_setting and now_time < time_setting.check_out_minimum:
            if record.status == "present":
                record.status = "leave"

        record.check_out_at = timezone.now()
        record.save()

        if record.status == "leave" and time_setting:
            msg = f"조퇴 처리되었습니다. (기준: {time_setting.check_out_minimum.strftime('%H:%M')})"
        else:
            msg = "퇴실 처리가 완료되었습니다. 수고하셨습니다!"

        return JsonResponse({"status": "success", "message": msg})
    except AttendanceRecord.DoesNotExist:
        return JsonResponse({"status": "error", "message": "오늘 출석 기록이 없습니다. 먼저 출석체크를 해주세요."}, status=400)


@login_required
@require_POST
def set_location(request):
    """
    관리자가 현재 자신의 위치를 출결 허용 위치로 설정함
    """
    if not request.user.is_staff:
        return JsonResponse({"status": "error", "message": "권한이 없습니다."}, status=403)

    try:
        import json
        data = json.loads(request.body)
        lat = float(data.get("latitude"))
        lon = float(data.get("longitude"))
        name = data.get("name", "연구실")
        radius = float(data.get("radius", 50.0))
    except (ValueError, TypeError, json.JSONDecodeError):
        return JsonResponse({"status": "error", "message": "잘못된 위치 정보입니다."}, status=400)

    # 기존 활성 위치를 업데이트하거나 새로 생성
    location, created = LocationSetting.objects.update_or_create(
        is_active=True,
        defaults={
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "radius": radius,
        }
    )
    cache.delete("attendance_location_setting")  # 위치 변경 시 캐시 무효화

    return JsonResponse({
        "status": "success",
        "message": f"현재 위치({lat}, {lon})가 '{name}'(으)로 설정되었습니다."
    })


@login_required
@require_POST
def set_attendance_time(request):
    """
    관리자가 지각/조퇴 기준 시간을 설정함
    """
    if not request.user.is_staff:
        return JsonResponse({"status": "error", "message": "권한이 없습니다."}, status=403)

    try:
        import json
        from datetime import datetime
        data = json.loads(request.body)
        check_in_str = data.get("check_in")
        check_out_str = data.get("check_out")
        
        check_in_time = datetime.strptime(check_in_str, "%H:%M").time()
        check_out_time = datetime.strptime(check_out_str, "%H:%M").time()
    except Exception:
        return JsonResponse({"status": "error", "message": "잘못된 시간 형식입니다. (HH:MM)"}, status=400)

    setting = AttendanceTimeSetting.objects.first()
    if not setting:
        setting = AttendanceTimeSetting()
    
    setting.check_in_deadline = check_in_time
    setting.check_out_minimum = check_out_time
    setting.save()
    cache.delete("attendance_time_setting")

    return JsonResponse({
        "status": "success",
        "message": f"출결 시간이 설정되었습니다. (입실: ~{check_in_str} / 퇴실: {check_out_str}~)"
    })


@csrf_exempt
@require_GET
def today_status(request):
    """오늘 출결 상태 조회 API (앱용)"""
    user = _get_user(request)
    if not user:
        return JsonResponse({"status": "error", "message": "인증이 필요합니다."}, status=401)

    today = timezone.localdate()
    record = AttendanceRecord.objects.filter(user=user, attendance_date=today).first()
    if not record:
        return JsonResponse({"attendance": "none"})
    return JsonResponse({
        "attendance": "checked_out" if record.check_out_at else "checked_in",
        "status": record.status,
        "check_in_at": timezone.localtime(record.check_in_at).strftime("%H:%M") if record.check_in_at else None,
        "check_out_at": timezone.localtime(record.check_out_at).strftime("%H:%M") if record.check_out_at else None,
    })
