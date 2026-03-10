from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    ordering = ("student_id",)
    list_display = ("student_id", "name", "is_staff", "is_active")
    search_fields = ("student_id", "name")
    fieldsets = (
        (None, {"fields": ("student_id", "password")}),
        ("개인정보", {"fields": ("name",)}),
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
