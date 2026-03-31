from django.urls import path
from .auth_views import LoginView, LogoutView, RefreshView, MeView, ProfileView, ProfileGithubView, ProfileResumeView, ProfileAnalyzeView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('profile/', ProfileView.as_view(), name='auth-profile'),
    path('profile/github/', ProfileGithubView.as_view(), name='auth-profile-github'),
    path('profile/resume/', ProfileResumeView.as_view(), name='auth-profile-resume'),
    path('profile/analyze/', ProfileAnalyzeView.as_view(), name='auth-profile-analyze'),
]
