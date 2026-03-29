from django.db import models

class Contest(models.Model):
    """Collected contest information for AI and Development fields."""

    SOURCE_CHOICES = [
        ("wevity", "Wevity"),
        ("dacon", "Dacon"),
        ("linkareer", "Linkareer"),
    ]

    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    external_id = models.CharField(max_length=120, blank=True, default="")
    external_url = models.URLField(max_length=500)

    title = models.CharField(max_length=255)
    host = models.CharField("주최사", max_length=255)
    category = models.CharField("분야", max_length=100) # AI, 개발 등
    reward = models.CharField("시상규모", max_length=100, blank=True, default="")
    
    content_summary = models.TextField("내용 요약", blank=True, default="")
    tags = models.CharField("태그", max_length=255, blank=True, default="")
    
    posted_at = models.DateField(null=True, blank=True)
    deadline_at = models.DateField("마감일", null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contests_contest"
        ordering = ["deadline_at", "-created_at"]
        indexes = [
            models.Index(fields=["source", "external_id"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["deadline_at"]),
        ]

    def __str__(self):
        return f"[{self.source}] {self.title} ({self.host})"

    @property
    def d_day(self):
        """Returns the number of days remaining until the deadline."""
        if self.deadline_at:
            from django.utils import timezone
            delta = self.deadline_at - timezone.now().date()
            return delta.days
        return None
