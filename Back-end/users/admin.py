from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    ordering = ("student_id",)
    list_display = ("student_id", "name", "desired_job_direction", "github_username", "profile_analyzed_at", "is_staff", "is_active")
    search_fields = ("student_id", "name", "desired_job_direction", "github_username")
    fieldsets = (
        (None, {"fields": ("student_id", "password")}),
        (
            "개인정보",
            {
                "fields": (
                    "name",
                    "github_url",
                    "desired_job_direction",
                    "desired_job_direction_other",
                    "github_username",
                    "github_profile_summary",
                    "github_top_languages",
                    "github_connected_at",
                    "resume_file",
                    "resume_analysis_summary",
                    "analysis_recommendation",
                    "ai_profile_summary",
                    "ai_profile_payload",
                    "ai_profile_error",
                    "profile_analyzed_at",
                )
            },
        ),
        ("권한", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("중요 일시", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("student_id", "name", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )
