from datetime import date, time
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

from users.models import User

from .models import DailyTodo, GoogleCalendarCredential, LabWideGoal, WeeklyGoal


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

    @patch("planner.views._sync_google_events_for_range")
    def test_plan_view_does_not_auto_import_google_calendar(self, sync_mock):
        GoogleCalendarCredential.objects.create(
            user=self.user1,
            google_email="user1@example.com",
            access_token="access-token",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.get(
            f"{reverse('planner-index')}?view=plan&month=2026-03&date={self.week_start.isoformat()}"
        )

        self.assertEqual(response.status_code, 200)
        sync_mock.assert_not_called()
        self.assertContains(response, reverse("planner-google-calendar-import"))

    @patch("planner.views.fetch_google_email", return_value="user1@example.com")
    @patch(
        "planner.views.exchange_code_for_token",
        return_value={
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "expires_in": 3600,
            "scope": "calendar.events",
        },
    )
    @patch("planner.views._sync_google_events_for_range")
    def test_google_callback_only_connects_without_auto_import(
        self,
        sync_mock,
        exchange_mock,
        email_mock,
    ):
        self.client.login(student_id="20260001", password="pass-1234-abcd")
        session = self.client.session
        session["google_oauth_state"] = "expected-state"
        session.save()

        response = self.client.get(
            reverse("planner-google-calendar-callback"),
            {"state": "expected-state", "code": "oauth-code"},
        )

        self.assertEqual(response.status_code, 302)
        sync_mock.assert_not_called()
        exchange_mock.assert_called_once()
        email_mock.assert_called_once_with("new-access-token")
        credential = GoogleCalendarCredential.objects.get(user=self.user1)
        self.assertEqual(credential.google_email, "user1@example.com")
        self.assertEqual(credential.access_token, "new-access-token")

    @patch(
        "planner.views.list_events",
        return_value=[
            {
                "id": "google-event-1",
                "status": "confirmed",
                "summary": "imported goal",
                "colorId": "10",
                "start": {"dateTime": "2026-03-10T09:30:00+09:00"},
            }
        ],
    )
    def test_google_import_creates_weekly_goal_instead_of_todo(self, list_events_mock):
        GoogleCalendarCredential.objects.create(
            user=self.user1,
            google_email="user1@example.com",
            access_token="access-token",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-google-calendar-import"),
            {"target_date": "2026-03-10", "month": "2026-03", "scope": "month"},
        )

        self.assertEqual(response.status_code, 302)
        list_events_mock.assert_called_once()
        goal = WeeklyGoal.objects.get(user=self.user1, google_event_id="google-event-1")
        self.assertEqual(goal.content, "imported goal")
        self.assertEqual(goal.week_start, date(2026, 3, 8))
        self.assertEqual(goal.weekday, 2)
        self.assertEqual(goal.planned_time.strftime("%H:%M"), "09:30")
        self.assertEqual(goal.color, "green")
        self.assertTrue(goal.is_completed)
        self.assertFalse(DailyTodo.objects.filter(user=self.user1, google_event_id="google-event-1").exists())

    @patch("planner.views._delete_google_event_for_user")
    def test_delete_completed_goal_syncs_google_calendar_delete(self, delete_google_event_mock):
        goal = WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=0,
            content="completed google goal",
            is_completed=True,
            google_event_id="google-event-1",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(reverse("planner-goal-delete", args=[goal.id]))

        self.assertEqual(response.status_code, 302)
        delete_google_event_mock.assert_called_once_with(self.user1, "google-event-1", request=response.wsgi_request)

    @patch("planner.views._delete_google_event_for_user")
    def test_delete_incomplete_goal_does_not_sync_google_calendar_delete(self, delete_google_event_mock):
        goal = WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=0,
            content="incomplete local goal",
            is_completed=False,
            google_event_id="google-event-1",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(reverse("planner-goal-delete", args=[goal.id]))

        self.assertEqual(response.status_code, 302)
        delete_google_event_mock.assert_not_called()

    @patch("planner.views._sync_weekly_goal_update")
    @patch("planner.views._sync_weekly_goal_create")
    def test_update_goal_does_not_sync_google_calendar(self, create_mock, update_mock):
        goal = WeeklyGoal.objects.create(
            user=self.user1,
            week_start=self.week_start,
            weekday=1,
            content="before",
            google_event_id="google-event-1",
        )

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-goal-update", args=[goal.id]),
            {
                "start_date": date(2026, 3, 10).isoformat(),
                "duration_days": "2",
                "planned_time_hour": "10",
                "planned_time_minute": "00",
                "content": "after",
                "color": "blue",
            },
        )

        self.assertEqual(response.status_code, 302)
        update_mock.assert_not_called()
        create_mock.assert_not_called()

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
