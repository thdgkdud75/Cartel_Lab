from django.test import TestCase
from django.urls import reverse

from .models import User


class AuthFlowTests(TestCase):
    def test_signup_creates_user_and_logs_in(self):
        response = self.client.post(
            reverse("users-signup"),
            {
                "student_id": "20240001",
                "name": "홍길동",
                "password1": "teamlab-pass-123",
                "password2": "teamlab-pass-123",
            },
        )

        self.assertRedirects(response, reverse("users-index"))
        self.assertTrue(User.objects.filter(student_id="20240001", name="홍길동").exists())
        self.assertEqual(self.client.session.get("_auth_user_id"), str(User.objects.get(student_id="20240001").pk))

    def test_login_uses_student_id_and_password(self):
        user = User.objects.create_user(
            student_id="20240002",
            name="김학생",
            password="teamlab-pass-123",
        )

        response = self.client.post(
            reverse("users-login"),
            {
                "student_id": "20240002",
                "password": "teamlab-pass-123",
            },
        )

        self.assertRedirects(response, reverse("users-index"))
        self.assertEqual(self.client.session.get("_auth_user_id"), str(user.pk))
