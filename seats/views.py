import hashlib
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.utils import timezone
from .models import Seat

def index(request):
    seats = Seat.objects.all()
    user_seat = None
    if request.user.is_authenticated:
        user_seat = Seat.objects.filter(user=request.user).first()
        
    return render(request, "seats/index.html", {
        "seats": seats,
        "user_seat": user_seat
    })

def seat_status_api(request):
    # 전체 좌석 데이터를 반환 (해시가 변경되었을 때만 호출됨)
    seats = Seat.objects.select_related('user').all()
    data = []
    for seat in seats:
        seat_data = {
            "number": seat.number,
            "is_occupied": seat.is_occupied,
            "user_name": getattr(seat.user, 'name', seat.user.student_id) if seat.user else None,
            "is_mine": seat.user == request.user if request.user.is_authenticated else False,
            "entry_time": seat.entry_time.strftime("%H:%M") if seat.entry_time else None,
            "exit_time": seat.exit_time.strftime("%H:%M") if seat.exit_time else None,
        }
        data.append(seat_data)
    return JsonResponse({"seats": data})

def seat_version_api(request):
    # 좌석 상태의 해시값을 반환 (매우 가벼운 요청)
    seats_data = list(Seat.objects.all().values_list('user_id', 'entry_time', 'exit_time'))
    version_hash = hashlib.md5(str(seats_data).encode()).hexdigest()
    return JsonResponse({"version": version_hash})

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
