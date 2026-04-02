from django.urls import path
from . import views

app_name = 'contests'

urlpatterns = [
    path('', views.contest_list, name='list'),
    path('<int:contest_id>/preview/', views.contest_preview, name='preview'),
]
