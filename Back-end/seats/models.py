from django.db import models
from django.conf import settings
from django.utils import timezone

class Seat(models.Model):
    number = models.PositiveIntegerField(unique=True, verbose_name="좌석 번호")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="seat",
        verbose_name="사용자"
    )
    is_occupied = models.BooleanField(default=False, verbose_name="사용 중")
    entry_time = models.DateTimeField(null=True, blank=True, verbose_name="입실 시간")
    exit_time = models.DateTimeField(null=True, blank=True, verbose_name="퇴실 시간")

    def __str__(self):
        status = f" ({self.user.name if self.user and hasattr(self.user, 'name') else self.user.student_id})" if self.user else " (비어 있음)"
        return f"좌석 {self.number}{status}"

    class Meta:
        ordering = ['number']

    def save(self, *args, **kwargs):
        # 유저가 할당되면 자동으로 사용 중으로 변경
        self.is_occupied = True if self.user else False
        super().save(*args, **kwargs)
