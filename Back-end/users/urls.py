from django.urls import path

from .views import api_login, api_members, api_profile_image, api_profile_image_web, edit_basic_info, github_callback, github_connect, github_disconnect, index, login_view, logout_view, signup

urlpatterns = [
    path("", index, name="users-index"),
    path("edit/", edit_basic_info, name="users-edit-basic"),
    path("github/connect/", github_connect, name="users-github-connect"),
    path("github/callback/", github_callback, name="users-github-callback"),
    path("github/disconnect/", github_disconnect, name="users-github-disconnect"),
    path("signup/", signup, name="users-signup"),
    path("login/", login_view, name="users-login"),
    path("logout/", logout_view, name="users-logout"),
    path("api/login/", api_login, name="users-api-login"),
    path("api/members/", api_members, name="users-api-members"),
    path("api/profile-image/", api_profile_image, name="users-api-profile-image"),
    path("api/profile-image-web/", api_profile_image_web, name="users-api-profile-image-web"),
]
