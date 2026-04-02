from django.urls import path

from .views import AdminClearSeatApiView, RegisterSeatApiView, SeatStatusApiView, SeatVersionApiView

urlpatterns = [
    path("", SeatStatusApiView.as_view(), name="seat-status-api"),
    path("status/", SeatStatusApiView.as_view(), name="seat-status-api-legacy"),
    path("version/", SeatVersionApiView.as_view(), name="seat-version-api"),
    path("<int:seat_number>/register/", RegisterSeatApiView.as_view(), name="seat-register-api"),
    path("<int:seat_number>/clear/", AdminClearSeatApiView.as_view(), name="seat-admin-clear-api"),
]
