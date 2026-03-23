from django.urls import path
from .views import index, attendance_list, check_in, check_out, set_location, set_attendance_time, today_status

app_name = "attendance"

urlpatterns = [
    path("", index, name="index"),
    path("list/", attendance_list, name="list"),
    path("check-in/", check_in, name="check-in"),
    path("check-out/", check_out, name="check-out"),
    path("set-location/", set_location, name="set-location"),
    path("set-time/", set_attendance_time, name="set-time"),
    path("today/", today_status, name="today-status"),
]
