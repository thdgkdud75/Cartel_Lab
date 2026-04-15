from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('health/', health_check),
    path('api/auth/', include('users.auth_urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/users/', include('users.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/certifications/', include('certifications.urls')),
    path('api/timetable/', include('timetable.urls')),
    path('api/planner/', include('planner.urls')),
    path('api/seats/', include('seats.api_urls')),
    path('api/quiz/', include('quiz.api_urls')),
    path('api/blog/', include('blog.urls')),
    path('api/contests/', include('contests.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/farm/', include('farm.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
