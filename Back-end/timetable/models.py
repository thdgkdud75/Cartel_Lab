from django.db import models


class Timetable(models.Model):
    CLASS_CHOICES = [
        ("A", "A반"),
        ("B", "B반"),
    ]
    DAY_CHOICES = [
        (0, "월"),
        (1, "화"),
        (2, "수"),
        (3, "목"),
        (4, "금"),
    ]

    class_group = models.CharField("반", max_length=1, choices=CLASS_CHOICES)
    weekday = models.PositiveSmallIntegerField("요일", choices=DAY_CHOICES)
    subject = models.CharField("수업명", max_length=100)
    start_time = models.TimeField("시작시간")
    end_time = models.TimeField("종료시간")

    class Meta:
        ordering = ["class_group", "weekday", "start_time"]

    def __str__(self):
        return f"[{self.class_group}반] {self.get_weekday_display()} {self.start_time.strftime('%H:%M')} {self.subject}"
