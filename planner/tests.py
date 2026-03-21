from datetime import date, time

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
            {
                "target_date": self.week_start.isoformat(),
                "planned_time_hour": "08",
                "planned_time_minute": "30",
                "content": "todo",
            },
        )
        self.assertEqual(response.status_code, 302)
        todo = DailyTodo.objects.get(user=self.user1, target_date=self.week_start, content="todo")
        self.assertEqual(todo.planned_time.strftime("%H:%M"), "08:30")

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
        self.assertTrue(todo.is_checked)
        self.assertFalse(todo.is_completed)

    def test_register_daily_todo_creates_goal_for_calendar(self):
        todo = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            planned_time=time(8, 40),
            color="blue",
            content="calendar todo",
            is_checked=True,
        )
        DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="leftover todo",
            is_checked=False,
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-register"),
            {"target_date": self.week_start.isoformat(), "month": "2026-03"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(DailyTodo.objects.filter(id=todo.id).exists())
        self.assertTrue(DailyTodo.objects.filter(user=self.user1, content="leftover todo").exists())

        goal = WeeklyGoal.objects.get(user=self.user1, content="calendar todo")
        self.assertEqual(goal.week_start, self.week_start)
        self.assertEqual(goal.weekday, 0)
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "08:40")
        self.assertEqual(goal.color, "blue")

    def test_register_daily_todo_removes_all_checked_only(self):
        checked_one = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="checked one",
            is_checked=True,
        )
        checked_two = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="checked two",
            is_checked=True,
        )
        unchecked = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="unchecked keep",
            is_checked=False,
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-register"),
            {"target_date": self.week_start.isoformat(), "month": "2026-03"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(DailyTodo.objects.filter(id=checked_one.id).exists())
        self.assertFalse(DailyTodo.objects.filter(id=checked_two.id).exists())
        self.assertTrue(DailyTodo.objects.filter(id=unchecked.id).exists())

    def test_delete_daily_todos_removes_checked_items(self):
        checked_todo = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="checked todo",
            is_checked=True,
        )
        DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="unchecked todo",
            is_checked=False,
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-delete-selected"),
            {"target_date": self.week_start.isoformat(), "month": "2026-03"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(DailyTodo.objects.filter(id=checked_todo.id).exists())
        self.assertTrue(DailyTodo.objects.filter(content="unchecked todo").exists())

    def test_set_daily_todos_checked_marks_all_items(self):
        DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="todo one",
            is_checked=False,
        )
        DailyTodo.objects.create(
            user=self.user1,
            target_date=self.week_start,
            content="todo two",
            is_checked=False,
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-set-checked"),
            {"target_date": self.week_start.isoformat(), "month": "2026-03", "checked": "1"},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            DailyTodo.objects.filter(user=self.user1, target_date=self.week_start, is_checked=True).count(),
            2,
        )
