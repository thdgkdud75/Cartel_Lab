from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='quiz-index'),
    path('admin/', views.admin_dashboard, name='quiz-admin'),
    path('create/', views.create_quiz, name='quiz-create'),
    path('<int:quiz_id>/edit/', views.edit_quiz, name='quiz-edit'),
    path('<int:quiz_id>/delete/', views.delete_quiz, name='quiz-delete'),
    path('<int:quiz_id>/submit/', views.submit_answer, name='quiz-submit'),
]
