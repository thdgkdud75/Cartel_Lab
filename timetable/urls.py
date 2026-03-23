from django.urls import path
from .views import timetable_api

app_name = "timetable"

urlpatterns = [
    path("api/", timetable_api, name="api"),
]
