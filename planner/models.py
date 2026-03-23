from django.conf import settings
from django.db import models


class WeeklyGoal(models.Model):
    """Personal weekly goals for each logged-in user."""

    DAY_CHOICES = [
        (0, "Sun"),
        (1, "Mon"),
        (2, "Tue"),
        (3, "Wed"),
        (4, "Thu"),
        (5, "Fri"),
        (6, "Sat"),
    ]
    COLOR_CHOICES = [
        ("red", "Red"),
        ("blue", "Blue"),
        ("yellow", "Yellow"),
        ("green", "Green"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_goals",
    )
    week_start = models.DateField(help_text="Week start date (Sunday)")
    weekday = models.PositiveSmallIntegerField(choices=DAY_CHOICES)
    planned_time = models.TimeField(null=True, blank=True)
    color = models.CharField(max_length=10, choices=COLOR_CHOICES, default="red")
    content = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    google_event_id = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["weekday", "planned_time", "created_at"]
        indexes = [
            models.Index(fields=["user", "week_start", "weekday"]),
        ]

    def __str__(self):
        return f"{self.user} {self.week_start} ({self.get_weekday_display()}) {self.content}"


class LabWideGoal(models.Model):
    """Shared lab goals visible to everyone."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lab_wide_goals",
    )
    content = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_by}: {self.content}"


class DailyTodo(models.Model):
    """Per-user daily todo items."""
    COLOR_CHOICES = [
        ("red", "Red"),
        ("blue", "Blue"),
        ("yellow", "Yellow"),
        ("green", "Green"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_todos",
    )
    target_date = models.DateField()
    planned_time = models.TimeField(null=True, blank=True)
    color = models.CharField(max_length=10, choices=COLOR_CHOICES, default="red")
    content = models.CharField(max_length=255)
    is_checked = models.BooleanField(default=False)
    is_completed = models.BooleanField(default=False)
    google_event_id = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["planned_time", "created_at"]
        indexes = [
            models.Index(fields=["user", "target_date", "is_completed"]),
        ]

    def __str__(self):
        return f"{self.user} {self.target_date} {self.content}"


class GoogleCalendarCredential(models.Model):
    """Per-user Google Calendar OAuth credentials."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="google_calendar_credential",
    )
    google_email = models.EmailField(blank=True, default="")
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    scope = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} Google Calendar"

