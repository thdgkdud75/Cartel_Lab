from django.contrib.messages import get_messages
from django.test import TestCase
from django.urls import reverse

from users.models import User


class DashboardStudentPasswordChangeTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            student_id="20249999",
            name="관리자",
            password="admin-pass-123!",
            is_staff=True,
        )
        self.student = User.objects.create_user(
            student_id="20240001",
            name="학생",
            password="old-pass-123!",
            grade="2",
            class_group="A",
        )

    def test_staff_can_change_student_password_from_detail_page(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse("dashboard-change-password", kwargs={"student_id": self.student.student_id}),
            {
                "new_password": "new-pass-123!",
                "new_password_confirm": "new-pass-123!",
            },
            follow=True,
        )

        self.assertRedirects(
            response,
            reverse("dashboard-student", kwargs={"student_id": self.student.student_id}),
        )
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password("new-pass-123!"))
        self.assertFalse(self.student.check_password("old-pass-123!"))
        messages = [message.message for message in get_messages(response.wsgi_request)]
        self.assertIn("학생 비밀번호를 변경했습니다.", messages)

    def test_password_mismatch_does_not_change_student_password(self):
        self.client.force_login(self.admin)

        response = self.client.post(
            reverse("dashboard-change-password", kwargs={"student_id": self.student.student_id}),
            {
                "new_password": "new-pass-123!",
                "new_password_confirm": "different-pass-123!",
            },
            follow=True,
        )

        self.assertRedirects(
            response,
            reverse("dashboard-student", kwargs={"student_id": self.student.student_id}),
        )
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password("old-pass-123!"))
        messages = [message.message for message in get_messages(response.wsgi_request)]
        self.assertIn("비밀번호가 일치하지 않습니다.", messages)

    def test_general_user_cannot_change_other_student_password(self):
        other_user = User.objects.create_user(
            student_id="20240002",
            name="일반사용자",
            password="user-pass-123!",
            grade="2",
            class_group="A",
        )
        self.client.force_login(other_user)

        response = self.client.post(
            reverse("dashboard-change-password", kwargs={"student_id": self.student.student_id}),
            {
                "new_password": "new-pass-123!",
                "new_password_confirm": "new-pass-123!",
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/users/")
        self.student.refresh_from_db()
        self.assertTrue(self.student.check_password("old-pass-123!"))
