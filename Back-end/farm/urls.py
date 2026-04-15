from django.urls import path
from farm import views

app_name = "farm"

urlpatterns = [
    path("me", views.me, name="me"),
    path("animals", views.list_animals, name="animals"),
    path("species", views.list_species, name="species"),
    path("eggs/draw", views.draw, name="draw"),
    path("animals/<int:animal_id>/pet", views.pet, name="pet"),
    path("animals/<int:animal_id>/feed", views.feed, name="feed"),
    path("animals/<int:animal_id>", views.update_animal, name="update-animal"),
]
