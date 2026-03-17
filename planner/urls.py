from django.urls import path

from .views import (
    add_daily_todo,
    add_goal,
    add_lab_goal,
    delete_daily_todo,
    google_calendar_callback,
    google_calendar_connect,
    google_calendar_disconnect,
    google_calendar_import,
    index,
    toggle_daily_todo,
    toggle_goal,
    update_goal,
)

urlpatterns = [
    path("", index, name="planner-index"),
    path("lab-goals/add/", add_lab_goal, name="planner-lab-goal-add"),
    path("google/connect/", google_calendar_connect, name="planner-google-calendar-connect"),
    path("google/callback/", google_calendar_callback, name="planner-google-calendar-callback"),
    path("google/disconnect/", google_calendar_disconnect, name="planner-google-calendar-disconnect"),
    path("google/import/", google_calendar_import, name="planner-google-calendar-import"),
    path("daily-todos/add/", add_daily_todo, name="planner-daily-todo-add"),
    path("daily-todos/<int:todo_id>/toggle/", toggle_daily_todo, name="planner-daily-todo-toggle"),
    path("daily-todos/<int:todo_id>/delete/", delete_daily_todo, name="planner-daily-todo-delete"),
    path("goals/add/", add_goal, name="planner-goal-add"),
    path("goals/<int:goal_id>/toggle/", toggle_goal, name="planner-goal-toggle"),
    path("goals/<int:goal_id>/update/", update_goal, name="planner-goal-update"),
]
