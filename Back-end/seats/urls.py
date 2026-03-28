from django.urls import path
from .views import index, register_seat, admin_clear_seat, seat_status_api, seat_version_api

urlpatterns = [
    path("", index, name="seats-index"),
    path("api/status/", seat_status_api, name="seat-status-api"),
    path("api/version/", seat_version_api, name="seat-version-api"),
    path("register/<int:seat_number>/", register_seat, name="seats-register"),
    path("admin-clear/<int:seat_number>/", admin_clear_seat, name="seats-admin-clear"),
]
