from django.urls import path
from . import views

urlpatterns = [
    path("", views.jobs_index, name="jobs-index"),
    path("sync/", views.jobs_sync, name="jobs-sync"),
    path("<int:job_id>/detail/", views.job_detail_api, name="jobs-detail"),
]
