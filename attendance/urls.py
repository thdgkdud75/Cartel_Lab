from django.urls import path
from .views import (
    index, attendance_list, check_in, check_out,
    set_location, set_attendance_time, today_status,
    register_push_token,
    submit_checkout_request, list_checkout_requests,
    approve_checkout_request, reject_checkout_request,
)

app_name = "attendance"

urlpatterns = [
    path("", index, name="index"),
    path("list/", attendance_list, name="list"),
    path("check-in/", check_in, name="check-in"),
    path("check-out/", check_out, name="check-out"),
    path("set-location/", set_location, name="set-location"),
    path("set-time/", set_attendance_time, name="set-time"),
    path("today/", today_status, name="today-status"),
    path("register-push-token/", register_push_token, name="register-push-token"),
    path("checkout-request/", submit_checkout_request, name="checkout-request"),
    path("checkout-requests/", list_checkout_requests, name="checkout-requests"),
    path("checkout-request/<int:request_id>/approve/", approve_checkout_request, name="checkout-approve"),
    path("checkout-request/<int:request_id>/reject/", reject_checkout_request, name="checkout-reject"),
]
