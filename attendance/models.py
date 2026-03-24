from django.conf import settings
from django.db import models
from datetime import time


class AttendanceRecord(models.Model):
    STATUS_CHOICES = [
        ("present", "출석"),
        ("late", "지각"),
        ("absent", "결석"),
        ("leave", "조퇴"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    attendance_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="present")
    check_in_at = models.DateTimeField(auto_now_add=True)
    check_out_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "attendance_date")
        indexes = [
            models.Index(fields=["user", "attendance_date"]),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.attendance_date} ({self.status})"


class LocationSetting(models.Model):
    name = models.CharField("위치 이름", max_length=100, default="연구실")
    latitude = models.FloatField("위도")
    longitude = models.FloatField("경도")
    radius = models.FloatField("허용 반경 (미터)", default=50.0)
    is_active = models.BooleanField("활성 여부", default=True)

    def __str__(self):
        return f"{self.name} ({self.latitude}, {self.longitude})"


class AttendanceTimeSetting(models.Model):
    check_in_deadline = models.TimeField("지각 기준 시간", default=time(10, 0))
    check_out_minimum = models.TimeField("조퇴 기준 시간", default=time(18, 0))

    def __str__(self):
        return f"출결 시간 설정 (지각: {self.check_in_deadline} 이후 / 조퇴: {self.check_out_minimum} 이전)"


class CheckoutRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('approved', '승인됨'),
        ('rejected', '반려됨'),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checkout_requests',
    )
    attendance_date = models.DateField()
    requested_time = models.TimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='approved_checkouts',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'attendance_date')

    def __str__(self):
        return f"{self.user} - {self.attendance_date} {self.requested_time} ({self.status})"
