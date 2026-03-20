from django.contrib import admin

from .models import Quiz, QuizAttempt


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "created_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["title", "created_by__name"]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ["quiz", "user", "submitted_answer", "is_correct", "attempted_at"]
    list_filter = ["is_correct", "attempted_at"]
