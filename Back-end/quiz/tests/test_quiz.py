from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from quiz.models import Quiz, QuizAttempt
from users.models import User


class QuizApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = timezone.localdate()
        self.sophomore = User.objects.create_user(
            student_id="20240001",
            password="testpass123!",
            name="출제자",
            grade="2",
            class_group="A",
        )
        self.freshman = User.objects.create_user(
            student_id="20250001",
            password="testpass123!",
            name="응시자",
            grade="1",
            class_group="A",
        )

    def test_grade1_index_returns_today_quiz_and_attempt_meta(self):
        quiz = Quiz.objects.create(
            title="반복문 문제",
            question="출력 결과를 맞히세요.",
            answer="3",
            scheduled_date=self.today,
            created_by=self.sophomore,
        )
        QuizAttempt.objects.create(
            quiz=quiz,
            user=self.freshman,
            submitted_answer="2",
            is_correct=False,
        )

        self.client.force_authenticate(self.freshman)
        response = self.client.get(reverse("quiz-api-index"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["grade"], "1")
        self.assertEqual(response.data["today_quiz"]["id"], quiz.id)
        self.assertEqual(response.data["attempt_count"], 1)
        self.assertEqual(response.data["max_attempts"], 3)
        self.assertFalse(response.data["has_correct"])

    def test_grade1_submit_blocks_after_three_attempts(self):
        quiz = Quiz.objects.create(
            title="조건문 문제",
            question="정답을 맞히세요.",
            answer="42",
            scheduled_date=self.today,
            created_by=self.sophomore,
        )
        self.client.force_authenticate(self.freshman)

        for wrong_answer in ("1", "2", "3"):
            response = self.client.post(
                reverse("quiz-api-submit", args=[quiz.id]),
                {"answer": wrong_answer},
                format="json",
            )
            self.assertEqual(response.status_code, 201)

        blocked = self.client.post(
            reverse("quiz-api-submit", args=[quiz.id]),
            {"answer": "42"},
            format="json",
        )

        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(QuizAttempt.objects.filter(quiz=quiz, user=self.freshman).count(), 3)
        self.assertEqual(blocked.data["error"], "최대 3번까지 제출할 수 있습니다.")

    def test_grade2_index_includes_list_and_admin_payload(self):
        quiz = Quiz.objects.create(
            title="함수 문제",
            code_snippet="print(sum([1, 2, 3]))",
            question="출력 결과를 맞히세요.",
            answer="6",
            ai_trap_code="print(sum([1, 2, 3, 4]))",
            ai_trap_answer="10",
            scheduled_date=self.today,
            created_by=self.sophomore,
        )
        QuizAttempt.objects.create(
            quiz=quiz,
            user=self.freshman,
            submitted_answer="10",
            is_correct=True,
            is_ai_flagged=True,
        )

        self.client.force_authenticate(self.sophomore)
        response = self.client.get(reverse("quiz-api-index"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["grade"], "2")
        self.assertEqual(len(response.data["quiz_stats"]), 1)
        self.assertEqual(response.data["quiz_stats"][0]["ai_flagged"], 1)
        self.assertIn("admin_data", response.data)
        self.assertEqual(len(response.data["admin_data"]["freshman_data"]), 1)
