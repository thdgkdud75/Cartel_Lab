from datetime import date

from django.test import TestCase
from django.urls import reverse

from users.models import User

from .models import DailyTodo, LabWideGoal, WeeklyGoal


class WeeklyPlannerTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            student_id="20260001",
            name="User One",
            password="pass-1234-abcd",
        )
        self.user2 = User.objects.create_user(
            student_id="20260002",
            name="User Two",
            password="pass-1234-abcd",
        )
        self.week_start = date(2026, 3, 8)

    def test_planner_is_public_and_shows_lab_goal(self):
        LabWideGoal.objects.create(created_by=self.user1, content="shared goal")
        response = self.client.get(reverse("planner-index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "랩실 전체 목표")
        self.assertContains(response, "shared goal")

    def test_only_own_goals_are_visible(self):
        WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=0,
            content="my goal",
        )
        WeeklyGoal.objects.create(
            user=self.user2,
            week_start=self.week_start,
            weekday=0,
            content="other goal",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.get(
            f"{reverse('planner-index')}?month=2026-03&date={self.week_start.isoformat()}"
        )

        self.assertContains(response, "my goal")
        self.assertNotContains(response, "other goal")

    def test_add_goal_creates_goal_for_logged_in_user(self):
        self.client.login(student_id="20260001", password="pass-1234-abcd")

        response = self.client.post(
            reverse("planner-goal-add"),
            {
                "week_start": self.week_start.isoformat(),
                "weekday": "2",
                "planned_time": "09:30",
                "content": "new weekly goal",
            },
        )

        self.assertEqual(response.status_code, 302)
        goal = WeeklyGoal.objects.get(content="new weekly goal")
        self.assertEqual(goal.user, self.user1)
        self.assertEqual(goal.weekday, 2)
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "09:30")

    def test_toggle_goal_only_for_owner(self):
        goal = WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=3,
            content="toggle me",
        )

        self.client.login(student_id="20260002", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-goal-toggle", args=[goal.id]),
            {"week_start": self.week_start.isoformat()},
        )
        self.assertEqual(response.status_code, 404)

        self.client.logout()
        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-goal-toggle", args=[goal.id]),
            {"week_start": self.week_start.isoformat()},
        )
        self.assertEqual(response.status_code, 302)

        goal.refresh_from_db()
        self.assertTrue(goal.is_completed)

    def test_update_goal_only_for_owner(self):
        goal = WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=4,
            content="before edit",
        )

        self.client.login(student_id="20260002", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-goal-update", args=[goal.id]),
            {"week_start": self.week_start.isoformat(), "content": "hacked"},
        )
        self.assertEqual(response.status_code, 404)
        goal.refresh_from_db()
        self.assertEqual(goal.content, "before edit")

        self.client.logout()
        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-goal-update", args=[goal.id]),
            {
                "week_start": self.week_start.isoformat(),
                "planned_time": "14:15",
                "content": "after edit",
            },
        )
        self.assertEqual(response.status_code, 302)
        goal.refresh_from_db()
        self.assertEqual(goal.content, "after edit")
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "14:15")

    def test_add_lab_goal_requires_login(self):
        response = self.client.post(
            reverse("planner-lab-goal-add"),
            {"content": "lab mission"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("/users/login/", response.url)
        self.assertFalse(LabWideGoal.objects.filter(content="lab mission").exists())

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-lab-goal-add"),
            {"content": "lab mission"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(LabWideGoal.objects.filter(content="lab mission").exists())

    def test_add_daily_todo_requires_login(self):
        response = self.client.post(
            reverse("planner-daily-todo-add"),
            {"target_date": self.week_start.isoformat(), "content": "todo"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("/users/login/", response.url)
        self.assertFalse(DailyTodo.objects.filter(content="todo").exists())

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-add"),
            {"target_date": self.week_start.isoformat(), "planned_time": "08:40", "content": "todo"},
        )
        self.assertEqual(response.status_code, 302)
        todo = DailyTodo.objects.get(user=self.user1, target_date=self.week_start, content="todo")
        self.assertEqual(todo.planned_time.strftime("%H:%M"), "08:40")

    def test_toggle_daily_todo_only_for_owner(self):
        todo = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="todo check",
        )

        self.client.login(student_id="20260002", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-toggle", args=[todo.id]),
        )
        self.assertEqual(response.status_code, 404)

        self.client.logout()
        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-toggle", args=[todo.id]),
        )
        self.assertEqual(response.status_code, 302)
        todo.refresh_from_db()
        self.assertTrue(todo.is_completed)
