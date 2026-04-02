"""
quiz 앱 테스트 — 관리자 페이지 및 3회 제출 제한 검증
임시 데이터를 생성하여 2학년이 관리자 페이지에서 확인할 수 있는지 테스트합니다.
"""
from datetime import timedelta

from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from quiz.models import Quiz, QuizAttempt
from users.models import User


# ── 공통 헬퍼 ─────────────────────────────────────────────────────────────────

def make_user(student_id, name, grade, password="pass1234!"):
    return User.objects.create_user(
        student_id=student_id,
        name=name,
        grade=grade,
        password=password,
    )


def make_quiz(created_by, title="오늘의 문제", answer="42",
              scheduled_date=None, ai_trap_answer=""):
    if scheduled_date is None:
        scheduled_date = timezone.localdate()
    return Quiz.objects.create(
        title=title,
        code_snippet="x = 40 + 2\nprint(x)",
        question="x의 출력값은?",
        answer=answer,
        ai_trap_answer=ai_trap_answer,
        scheduled_date=scheduled_date,
        created_by=created_by,
    )


def make_attempt(quiz, user, submitted, is_correct, is_ai_flagged=False):
    return QuizAttempt.objects.create(
        quiz=quiz,
        user=user,
        submitted_answer=submitted,
        is_correct=is_correct,
        is_ai_flagged=is_ai_flagged,
    )


# ── 픽스처: 공통 사용자 + 퀴즈 ───────────────────────────────────────────────

class BaseQuizTestCase(TestCase):
    """2학년 1명 + 1학년 3명 + 오늘 퀴즈 생성."""

    def setUp(self):
        self.senior = make_user("20240001", "김선배", grade="2")
        self.f1 = make_user("20250001", "이일학", grade="1")
        self.f2 = make_user("20250002", "박일학", grade="1")
        self.f3 = make_user("20250003", "최일학", grade="1")

        self.quiz = make_quiz(self.senior)

        self.client = Client()

    def login(self, user, password="pass1234!"):
        self.client.login(username=user.student_id, password=password)


# ── 1. 관리자 페이지 접근 ─────────────────────────────────────────────────────

class AdminDashboardAccessTest(BaseQuizTestCase):

    def test_senior_can_access_admin(self):
        """2학년은 관리자 페이지에 200으로 접근 가능."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        self.assertEqual(res.status_code, 200)

    def test_freshman_cannot_access_admin(self):
        """1학년은 관리자 페이지에 접근 불가(리다이렉트)."""
        self.login(self.f1)
        res = self.client.get(reverse("quiz-admin"))
        self.assertRedirects(res, reverse("quiz-index"))

    def test_unauthenticated_redirects(self):
        """비로그인 시 로그인 페이지로 리다이렉트."""
        res = self.client.get(reverse("quiz-admin"))
        self.assertEqual(res.status_code, 302)


# ── 2. 임시 데이터로 관리자 페이지 렌더링 확인 ───────────────────────────────

class AdminDashboardDataTest(BaseQuizTestCase):
    """다양한 제출 시나리오를 만들어 관리자 페이지가 올바르게 렌더링되는지 확인."""

    def setUp(self):
        super().setUp()
        # f1: 1차 오답 → 2차 오답 → 3차 정답
        make_attempt(self.quiz, self.f1, "0",  is_correct=False)
        make_attempt(self.quiz, self.f1, "10", is_correct=False)
        make_attempt(self.quiz, self.f1, "42", is_correct=True)

        # f2: 1차 오답 → 2차 AI 의심 정답
        make_attempt(self.quiz, self.f2, "99",  is_correct=False)
        make_attempt(self.quiz, self.f2, "ai_answer", is_correct=True, is_ai_flagged=True)

        # f3: 미제출 (아무 attempt 없음)

    def test_admin_page_renders_with_data(self):
        """임시 데이터가 있을 때 관리자 페이지가 200으로 렌더링."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        self.assertEqual(res.status_code, 200)

    def test_freshman_data_contains_all_students(self):
        """freshman_data에 1학년 3명이 모두 포함."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        names = [item["user"].name for item in res.context["freshman_data"]]
        self.assertIn("이일학", names)
        self.assertIn("박일학", names)
        self.assertIn("최일학", names)

    def test_f1_has_three_attempts(self):
        """f1의 이번 주 제출 내역이 3개."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        f1_data = next(
            item for item in res.context["freshman_data"]
            if item["user"].pk == self.f1.pk
        )
        self.assertEqual(len(f1_data["week_attempts"]), 3)

    def test_attempt_numbers_are_sequential_per_quiz(self):
        """attempt_number가 퀴즈별로 1, 2, 3 순서로 붙는지 확인."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        f1_data = next(
            item for item in res.context["freshman_data"]
            if item["user"].pk == self.f1.pk
        )
        numbers = [a.attempt_number for a in f1_data["week_attempts"]]
        self.assertEqual(numbers, [1, 2, 3])

    def test_f2_ai_flagged_shown(self):
        """f2의 AI 의심 제출이 is_ai_flagged=True로 기록."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        f2_data = next(
            item for item in res.context["freshman_data"]
            if item["user"].pk == self.f2.pk
        )
        ai_attempts = [a for a in f2_data["week_attempts"] if a.is_ai_flagged]
        self.assertEqual(len(ai_attempts), 1)

    def test_f3_no_attempts(self):
        """f3(미제출)의 week_attempts가 비어있음."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        f3_data = next(
            item for item in res.context["freshman_data"]
            if item["user"].pk == self.f3.pk
        )
        self.assertEqual(len(f3_data["week_attempts"]), 0)

    def test_week_correct_count(self):
        """f1 week_correct=1, f2 week_correct=0(AI 의심은 'ai' 상태), f3 week_correct=0."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        data_map = {item["user"].pk: item for item in res.context["freshman_data"]}
        self.assertEqual(data_map[self.f1.pk]["week_correct"], 1)
        # f2의 마지막 제출이 AI 의심이므로 day status = "ai" → week_correct=0
        self.assertEqual(data_map[self.f2.pk]["week_correct"], 0)
        self.assertEqual(data_map[self.f3.pk]["week_correct"], 0)

    def test_f2_day_status_is_ai(self):
        """f2의 오늘 day status가 'ai'로 표시됨."""
        self.login(self.senior)
        res = self.client.get(reverse("quiz-admin"))
        from django.utils import timezone
        today = timezone.localdate()
        f2_data = next(
            item for item in res.context["freshman_data"]
            if item["user"].pk == self.f2.pk
        )
        today_cell = next((c for c in f2_data["week_cells"] if c["date"] == today), None)
        self.assertIsNotNone(today_cell)
        self.assertEqual(today_cell["status"], "ai")


# ── 3. 3회 제출 제한 ──────────────────────────────────────────────────────────

class SubmitAttemptLimitTest(BaseQuizTestCase):

    def _submit(self, answer):
        return self.client.post(
            reverse("quiz-submit", args=[self.quiz.pk]),
            {"answer": answer},
            follow=True,
        )

    def test_first_submit_succeeds(self):
        """첫 번째 제출은 정상 처리."""
        self.login(self.f1)
        self._submit("wrong1")
        self.assertEqual(QuizAttempt.objects.filter(user=self.f1).count(), 1)

    def test_three_submits_allowed(self):
        """3번 제출 모두 허용."""
        self.login(self.f1)
        self._submit("wrong1")
        self._submit("wrong2")
        self._submit("42")
        self.assertEqual(QuizAttempt.objects.filter(user=self.f1).count(), 3)

    def test_fourth_submit_blocked(self):
        """3회 소진 후 4번째 제출은 차단."""
        self.login(self.f1)
        self._submit("wrong1")
        self._submit("wrong2")
        self._submit("wrong3")
        res = self._submit("42")
        self.assertEqual(QuizAttempt.objects.filter(user=self.f1).count(), 3)
        messages = list(res.context["messages"])
        self.assertTrue(any("3번" in str(m) for m in messages))

    def test_submit_blocked_after_correct(self):
        """정답 제출 후 추가 제출은 차단."""
        self.login(self.f1)
        self._submit("42")  # 정답
        res = self._submit("42")
        self.assertEqual(QuizAttempt.objects.filter(user=self.f1).count(), 1)
        messages = list(res.context["messages"])
        self.assertTrue(any("정답" in str(m) for m in messages))

    def test_senior_cannot_submit(self):
        """2학년은 제출 불가."""
        self.login(self.senior)
        res = self._submit("42")
        self.assertEqual(QuizAttempt.objects.count(), 0)


# ── 4. 1학년 index 컨텍스트 확인 ─────────────────────────────────────────────

class FreshmanIndexContextTest(BaseQuizTestCase):

    def test_context_no_attempts(self):
        """제출 전: attempts=[], attempt_count=0, has_correct=False."""
        self.login(self.f1)
        res = self.client.get(reverse("quiz-index"))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.context["attempt_count"], 0)
        self.assertFalse(res.context["has_correct"])
        self.assertEqual(res.context["max_attempts"], 3)

    def test_context_after_wrong_attempt(self):
        """오답 1회 후: attempt_count=1, has_correct=False."""
        make_attempt(self.quiz, self.f1, "0", is_correct=False)
        self.login(self.f1)
        res = self.client.get(reverse("quiz-index"))
        self.assertEqual(res.context["attempt_count"], 1)
        self.assertFalse(res.context["has_correct"])

    def test_context_after_correct_attempt(self):
        """정답 제출 후: has_correct=True."""
        make_attempt(self.quiz, self.f1, "42", is_correct=True)
        self.login(self.f1)
        res = self.client.get(reverse("quiz-index"))
        self.assertTrue(res.context["has_correct"])

    def test_context_all_attempts_listed(self):
        """2회 오답 후 attempts 리스트에 2개 포함."""
        make_attempt(self.quiz, self.f1, "1", is_correct=False)
        make_attempt(self.quiz, self.f1, "2", is_correct=False)
        self.login(self.f1)
        res = self.client.get(reverse("quiz-index"))
        self.assertEqual(len(res.context["attempts"]), 2)
