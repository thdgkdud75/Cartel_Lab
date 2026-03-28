from django.contrib import admin
from .models import AttendanceRecord, LocationSetting

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "attendance_date", "status", "check_in_at")
    list_filter = ("status", "attendance_date")
    search_fields = ("user__name", "user__student_id")

@admin.register(LocationSetting)
class LocationSettingAdmin(admin.ModelAdmin):
    list_display = ("name", "latitude", "longitude", "radius", "is_active")
