from django.conf import settings
from django.db import models


class JobPosting(models.Model):
    """Collected job posting normalized for filtering and analysis."""

    SOURCE_CHOICES = [
        ("saramin", "Saramin"),
        ("wanted", "Wanted"),
        ("crawler", "Crawler"),
    ]

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    external_id = models.CharField(max_length=120, blank=True, default="")
    external_url = models.URLField(max_length=500)

    title = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    location = models.CharField(max_length=120, blank=True, default="")
    job_role = models.CharField(max_length=120, blank=True, default="")
    employment_type = models.CharField(max_length=50, blank=True, default="")

    experience_label = models.CharField(max_length=50, blank=True, default="")
    experience_min = models.PositiveSmallIntegerField(default=0)
    experience_max = models.PositiveSmallIntegerField(default=0)
    education_level = models.CharField(max_length=50, blank=True, default="")

    # 2-year college / junior friendly indicator for filtering
    is_junior_friendly = models.BooleanField(default=False)

    required_skills = models.TextField(blank=True, default="")
    preferred_skills = models.TextField(blank=True, default="")
    summary_text = models.TextField(blank=True, default="")
    detail_overview = models.TextField(blank=True, default="")
    detail_main_tasks = models.TextField(blank=True, default="")
    detail_requirements = models.TextField(blank=True, default="")
    detail_preferred_points = models.TextField(blank=True, default="")
    detail_benefits = models.TextField(blank=True, default="")
    detail_required_skills = models.TextField(blank=True, default="")

    posted_at = models.DateTimeField(null=True, blank=True)
    deadline_at = models.DateTimeField(null=True, blank=True)
    collected_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["source", "external_id"]),
            models.Index(fields=["job_role", "is_junior_friendly"]),
            models.Index(fields=["is_active", "posted_at"]),
            models.Index(fields=["company_name", "location"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "external_id", "external_url"],
                name="uq_jobposting_source_external",
            )
        ]

    def __str__(self):
        return f"[{self.source}] {self.title} - {self.company_name}"


class JobMarketSnapshot(models.Model):
    """Cached market analysis result (role breakdown + skills)."""

    analysis_key = models.CharField(max_length=100, unique=True)
    total_jobs = models.PositiveIntegerField(default=0)
    sampled_job_count = models.PositiveIntegerField(default=0)
    analysis_summary = models.TextField(blank=True, default="")
    role_breakdown = models.JSONField(default=list)
    model_name = models.CharField(max_length=100, blank=True, default="")
    analyzed_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-analyzed_at"]

    def __str__(self):
        return f"MarketSnapshot({self.analysis_key}) @ {self.analyzed_at:%Y-%m-%d %H:%M}"


class JobSyncLog(models.Model):
    """Daily sync execution log."""

    source = models.CharField(max_length=20)
    run_at = models.DateTimeField(auto_now_add=True)
    fetched_count = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    deactivated_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, default="success")
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-run_at"]

    def __str__(self):
        return f"{self.source} sync ({self.status}) @ {self.run_at:%Y-%m-%d %H:%M}"


class JuniorRequirementStat(models.Model):
    """Daily aggregated requirement stats to analyze junior hiring trends."""

    stat_date = models.DateField()
    role = models.CharField(max_length=120)
    skill = models.CharField(max_length=120)
    demand_count = models.PositiveIntegerField(default=0)
    demand_ratio = models.FloatField(default=0.0)
    source_count = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["stat_date", "role", "skill"], name="uq_junior_req_stat"
            )
        ]
        indexes = [
            models.Index(fields=["stat_date", "role"]),
            models.Index(fields=["skill"]),
        ]

    def __str__(self):
        return f"{self.stat_date} {self.role} {self.skill} ({self.demand_count})"


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

