from django.urls import path

from .views import edit_basic_info, index, login_view, logout_view, signup

urlpatterns = [
    path("", index, name="users-index"),
    path("edit/", edit_basic_info, name="users-edit-basic"),
    path("signup/", signup, name="users-signup"),
    path("login/", login_view, name="users-login"),
    path("logout/", logout_view, name="users-logout"),
]
