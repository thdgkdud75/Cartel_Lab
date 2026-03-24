from django.urls import path

from .views import (
    api_auto_checkout,
    api_edit_attendance,
    api_monthly_stats,
    api_weekly_attendance,
    dashboard_cancel_delete,
    dashboard_confirm_delete,
    dashboard_index,
    dashboard_schedule_delete,
    dashboard_student,
)

urlpatterns = [
    path("", dashboard_index, name="dashboard-index"),
    path("student/<str:student_id>/", dashboard_student, name="dashboard-student"),
    path("student/<str:student_id>/schedule-delete/", dashboard_schedule_delete, name="dashboard-schedule-delete"),
    path("student/<str:student_id>/cancel-delete/", dashboard_cancel_delete, name="dashboard-cancel-delete"),
    path("student/<str:student_id>/confirm-delete/", dashboard_confirm_delete, name="dashboard-confirm-delete"),
    path("api/weekly/", api_weekly_attendance, name="dashboard-api-weekly"),
    path("api/auto-checkout/", api_auto_checkout, name="dashboard-api-auto-checkout"),
    path("api/monthly/", api_monthly_stats, name="dashboard-api-monthly"),
    path("api/edit-attendance/", api_edit_attendance, name="dashboard-api-edit-attendance"),
]
