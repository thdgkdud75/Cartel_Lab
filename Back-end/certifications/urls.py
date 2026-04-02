from django.urls import path

from .views import ImportantCertificationsApiView


urlpatterns = [
    path("", ImportantCertificationsApiView.as_view(), name="certifications-feed-api"),
    path("important/", ImportantCertificationsApiView.as_view(), name="certifications-important-api"),
    path("api/important/", ImportantCertificationsApiView.as_view(), name="certifications-important-legacy-api"),
]
