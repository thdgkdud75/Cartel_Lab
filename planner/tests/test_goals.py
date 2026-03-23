from datetime import date, time
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from users.models import User

from planner.models import DailyTodo, LabWideGoal, WeeklyGoal


@override_settings(
    STORAGES={
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
)
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
        self.assertContains(response, "?⑹떎 ?꾩껜 紐⑺몴")
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
                "start_date": date(2026, 3, 10).isoformat(),
                "planned_time_hour": "09",
                "planned_time_minute": "30",
                "content": "new weekly goal",
            },
        )

        self.assertEqual(response.status_code, 302)
        goal = WeeklyGoal.objects.get(content="new weekly goal")
        self.assertEqual(goal.user, self.user1)
        self.assertEqual(goal.weekday, 2)
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "09:30")
        self.assertFalse(DailyTodo.objects.filter(content="new weekly goal").exists())

    def test_add_goal_accepts_am_pm_time_input(self):
        self.client.login(student_id="20260001", password="pass-1234-abcd")

        response = self.client.post(
            reverse("planner-goal-add"),
            {
                "start_date": date(2026, 3, 10).isoformat(),
                "planned_time_period": "PM",
                "planned_time_hour": "10",
                "planned_time_minute": "00",
                "content": "pm goal",
            },
        )

        self.assertEqual(response.status_code, 302)
        goal = WeeklyGoal.objects.get(content="pm goal")
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "22:00")

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
        self.assertFalse(WeeklyGoal.objects.filter(id=goal.id).exists())
        self.assertFalse(DailyTodo.objects.filter(user=self.user1, content="toggle me").exists())

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
                "planned_time_hour": "14",
                "planned_time_minute": "30",
                "content": "after edit",
            },
        )
        self.assertEqual(response.status_code, 302)
        goal.refresh_from_db()
        self.assertEqual(goal.content, "after edit")
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "14:30")

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
