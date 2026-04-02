import hashlib
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Seat
from attendance.models import AttendanceRecord


def _ensure_default_seats():
    current_seat_numbers = set(Seat.objects.values_list("number", flat=True))
    if len(current_seat_numbers) != 10 or not all(i in current_seat_numbers for i in range(1, 11)):
        for i in range(1, 11):
            if i not in current_seat_numbers:
                Seat.objects.create(number=i)
        Seat.objects.filter(number__gt=10).delete()


def _attendance_labels_for_user(user, today):
    if not user:
        return []

    if not user.last_login:
        return ["미출첵"]

    last_login = timezone.localtime(user.last_login)
    if last_login.date() != today:
        return ["미출첵"]

    return ["출첵하세요"]


def _build_seat_payload(auth_user):
    _ensure_default_seats()

    today = timezone.localdate()
    seats = Seat.objects.select_related("user").order_by("number")
    attendance_records = {
        record.user_id: record
        for record in AttendanceRecord.objects.filter(attendance_date=today)
    }
    current_user_seat = Seat.objects.filter(user=auth_user).first() if auth_user else None
    data = []

    for seat in seats:
        entry_time = None
        exit_time = None
        attendance_status = "none"
        attendance_labels = []

        if seat.user:
            record = attendance_records.get(seat.user.id)
            if record:
                entry_time = timezone.localtime(record.check_in_at).strftime("%p %I:%M") if record.check_in_at else None
                exit_time = timezone.localtime(record.check_out_at).strftime("%p %I:%M") if record.check_out_at else None
                attendance_status = "checked_out" if exit_time else "present"
            else:
                attendance_status = "absent"
                attendance_labels = _attendance_labels_for_user(seat.user, today)

        data.append({
            "number": seat.number,
            "is_occupied": seat.is_occupied,
            "user_name": getattr(seat.user, "name", seat.user.student_id) if seat.user else None,
            "is_mine": bool(auth_user and seat.user == auth_user),
            "entry_time": entry_time,
            "exit_time": exit_time,
            "attendance_status": attendance_status,
            "attendance_labels": attendance_labels,
        })

    return {
        "seats": data,
        "current_user_seat_number": current_user_seat.number if current_user_seat else None,
        "can_select_empty_seat": bool(auth_user and (auth_user.is_superuser or current_user_seat is None)),
        "is_superuser": bool(auth_user and auth_user.is_superuser),
    }


def _build_seat_version():
    _ensure_default_seats()

    today = timezone.localdate()
    seats_data = list(Seat.objects.order_by("number").values_list("user_id", flat=True))
    attendance_data = list(
        AttendanceRecord.objects.filter(attendance_date=today).values_list("user_id", "check_in_at", "check_out_at")
    )
    return hashlib.md5(str(seats_data + attendance_data).encode()).hexdigest()


class SeatStatusApiView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if getattr(request.user, "is_authenticated", False) else None
        return Response(_build_seat_payload(user))


class SeatVersionApiView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"version": _build_seat_version()})


class RegisterSeatApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, seat_number):
        _ensure_default_seats()
        seat = get_object_or_404(Seat, number=seat_number)

        if not request.user.is_superuser and Seat.objects.filter(user=request.user).exists():
            return Response(
                {"error": "이미 배정된 좌석이 있습니다. 좌석 이동은 관리자에게 문의하세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if seat.user and seat.user != request.user:
            return Response(
                {"error": f"{seat_number}번 좌석은 이미 다른 사용자가 사용 중입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        if request.user.is_superuser:
            existing_seat = Seat.objects.filter(user=request.user).first()
            if existing_seat and existing_seat.number != seat.number:
                existing_seat.user = None
                existing_seat.exit_time = now
                existing_seat.save()

        seat.user = request.user
        seat.entry_time = now
        seat.exit_time = None
        seat.save()

        return Response({
            "message": f"{seat_number}번 좌석으로 등록/이동되었습니다.",
            "seat_number": seat.number,
        })


class AdminClearSeatApiView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, seat_number):
        _ensure_default_seats()
        if not request.user.is_superuser:
            return Response({"error": "관리자 권한이 필요합니다."}, status=status.HTTP_403_FORBIDDEN)

        seat = get_object_or_404(Seat, number=seat_number)
        if not seat.user:
            return Response({"message": "이미 비어 있는 좌석입니다.", "seat_number": seat.number})

        username = getattr(seat.user, "name", seat.user.student_id)
        seat.exit_time = timezone.now()
        seat.user = None
        seat.save()

        return Response({
            "message": f"{seat_number}번 좌석({username})을 초기화했습니다.",
            "seat_number": seat.number,
        })

def index(request):
    # 10자리 고정 보장 (DB에 없으면 생성)
    _ensure_default_seats()

    seats = Seat.objects.select_related('user').all()
    user_seat = None
    if request.user.is_authenticated:
        user_seat = Seat.objects.filter(user=request.user).first()
        
    today = timezone.localdate()
    attendance_records = {
        record.user_id: record 
        for record in AttendanceRecord.objects.filter(attendance_date=today)
    }

    # 좌석에 출결 입퇴실 시간 연동
    for seat in seats:
        if seat.user:
            record = attendance_records.get(seat.user.id)
            if record:
                seat.attendance_entry_time = record.check_in_at
                seat.attendance_exit_time = record.check_out_at
                seat.attendance_labels = []
            else:
                seat.attendance_entry_time = None
                seat.attendance_exit_time = None
                seat.attendance_labels = _attendance_labels_for_user(seat.user, today)

    return render(request, "seats/index.html", {
        "seats": seats,
        "user_seat": user_seat
    })

def seat_status_api(request):
    return JsonResponse(_build_seat_payload(request.user if request.user.is_authenticated else None))

def seat_version_api(request):
    return JsonResponse({"version": _build_seat_version()})

@login_required
def register_seat(request, seat_number):
    if not request.user.is_superuser:
        if Seat.objects.filter(user=request.user).exists():
            messages.error(request, "이미 배정된 좌석이 있습니다. 좌석 이동은 관리자에게 문의하세요.")
            return redirect("seats-index")
    
    seat = get_object_or_404(Seat, number=seat_number)
    if seat.user and seat.user != request.user:
        messages.error(request, f"{seat_number}번 좌석은 이미 다른 사용자가 사용 중입니다.")
        return redirect("seats-index")
    
    now = timezone.now()

    if request.user.is_superuser:
        existing_seat = Seat.objects.filter(user=request.user).first()
        if existing_seat:
            existing_seat.user = None
            existing_seat.exit_time = now
            existing_seat.save()

    seat.user = request.user
    seat.entry_time = now
    seat.exit_time = None
    seat.save()
    messages.success(request, f"{seat_number}번 좌석으로 등록/이동되었습니다.")
    return redirect("seats-index")

@login_required
def admin_clear_seat(request, seat_number):
    if not request.user.is_superuser:
        messages.error(request, "관리자 권한이 필요합니다.")
        return redirect("seats-index")
    
    seat = get_object_or_404(Seat, number=seat_number)
    if seat.user:
        now = timezone.now()
        username = getattr(seat.user, 'name', seat.user.student_id)
        
        # 좌석 퇴실 시간 기록
        seat.exit_time = now
        seat.user = None
        seat.save()
        messages.success(request, f"{seat_number}번 좌석({username})을 초기화했습니다.")
    else:
        messages.info(request, "이미 비어 있는 좌석입니다.")
        
    return redirect("seats-index")
