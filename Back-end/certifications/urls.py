from django.urls import path

from .views import important_certifications_api, index


urlpatterns = [
    path("", index, name="certifications-index"),
    path("api/important/", important_certifications_api, name="certifications-important-api"),
]
