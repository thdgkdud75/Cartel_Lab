from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.utils import timezone
from .models import Seat

@receiver(user_logged_in)
def record_entry_time(sender, request, user, **kwargs):
    # 로그인한 유저의 좌석이 있다면 입실 시간 기록
    seat = Seat.objects.filter(user=user).first()
    if seat:
        seat.entry_time = timezone.now()
        seat.exit_time = None  # 새 세션 시작 시 퇴실 시간 초기화
        seat.save()

@receiver(user_logged_out)
def record_exit_time(sender, request, user, **kwargs):
    # 로그아웃한 유저의 좌석이 있다면 퇴실 시간 기록
    seat = Seat.objects.filter(user=user).first()
    if seat:
        seat.exit_time = timezone.now()
        seat.save()
