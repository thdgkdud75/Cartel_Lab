"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from planner.views import job_detail_api, jobs_index, jobs_sync

urlpatterns = [
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    path('jobs/', jobs_index, name='jobs-index'),
    path('jobs/sync/', jobs_sync, name='jobs-sync'),
    path('jobs/<int:job_id>/detail/', job_detail_api, name='jobs-detail'),
    path('auth/admin/', include('dashboard.urls')),
    path('django-admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('attendance/', include('attendance.urls')),
    path('planner/', include('planner.urls')),
    path('seats/', include('seats.urls')),
    path('quiz/', include('quiz.urls')),
    path('blog/', include('blog.urls')),
    path('privacy/', TemplateView.as_view(template_name='privacy.html')),
    path('terms/', TemplateView.as_view(template_name='terms.html'))
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
