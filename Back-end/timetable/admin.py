from django.contrib import admin
from .models import Timetable


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = ("class_group", "get_weekday_display", "subject", "start_time", "end_time")
    list_filter = ("class_group", "weekday")
    ordering = ("class_group", "weekday", "start_time")
