from datetime import date

from django.test import TestCase
from django.urls import reverse

from users.models import User
from planner.models import DailyTodo


class DailyTodoTests(TestCase):
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
        self.today = date(2026, 3, 8)

    def test_add_daily_todo_requires_login(self):
        response = self.client.post(
            reverse("planner-daily-todo-add"),
            {"target_date": self.today.isoformat(), "content": "todo"},
        )
        self.assertEqual(response.status_code, 302)
        self.assertIn("/users/login/", response.url)
        self.assertFalse(DailyTodo.objects.filter(content="todo").exists())

        self.client.login(student_id="20260001", password="pass-1234-abcd")
        response = self.client.post(
            reverse("planner-daily-todo-add"),
            {
                "start_date": self.today.isoformat(),
                "duration_days": "2",
                "planned_time": "08:40",
                "content": "todo",
            },
        )
        self.assertEqual(response.status_code, 302)
        todo = DailyTodo.objects.get(user=self.user1, target_date=self.today, content="todo")
        self.assertEqual(todo.planned_time.strftime("%H:%M"), "08:40")
        self.assertTrue(
            DailyTodo.objects.filter(
                user=self.user1,
                target_date=date(2026, 3, 9),
                content="todo",
            ).exists()
        )

    def test_toggle_daily_todo_only_for_owner(self):
        todo = DailyTodo.objects.create(
            user=self.user1,
            target_date=self.today,
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

    # TODO: 투두 삭제 권한 테스트
    # TODO: 투두 완료 후 WeeklyGoal 생성 확인
