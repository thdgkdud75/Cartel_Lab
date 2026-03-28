from types import SimpleNamespace
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

from users.services import build_portfolio_review_input, format_portfolio_feedback
from users.models import User


class ProfileUpdateTests(TestCase):
    @patch("users.views.build_profile_analysis")
    def test_save_only_stores_inputs_without_analysis(self, mock_build_profile_analysis):
        user = User.objects.create_user(
            student_id="20240003",
            name="박형석",
            password="teamlab-pass-123",
        )
        self.client.force_login(user)

        response = self.client.post(
            reverse("users-index"),
            {
                "github_url": "https://github.com/bhs-dev",
                "resume_file": SimpleUploadedFile(
                    "resume.txt",
                    b"Python Django AWS experience",
                    content_type="text/plain",
                ),
                "action": "save",
            },
        )

        self.assertRedirects(response, reverse("users-index"))
        user.refresh_from_db()
        self.assertEqual(user.github_url, "https://github.com/bhs-dev")
        self.assertTrue(bool(user.resume_file))
        self.assertEqual(user.github_username, "")
        self.assertIsNone(user.profile_analyzed_at)
        mock_build_profile_analysis.assert_not_called()

    @patch("users.views.build_profile_analysis")
    def test_analyze_applies_analysis_result(self, mock_build_profile_analysis):
        user = User.objects.create_user(
            student_id="20240004",
            name="박형석",
            password="teamlab-pass-123",
        )
        self.client.force_login(user)
        mock_build_profile_analysis.return_value = {
            "github_username": "bhs-dev",
            "github_profile_summary": "공개 저장소 5개 / 주요 언어 Python, TypeScript",
            "github_top_languages": "Python, TypeScript",
            "resume_extracted_text": "Python Django AWS 경험",
            "resume_analysis_summary": "백엔드 프로젝트 경험 / 배포 경험 / 협업 경험",
            "analysis_recommendation": "AWS 배포 경험을 더 구체적으로 정리하세요.",
        }

        response = self.client.post(
            reverse("users-index"),
            {
                "github_url": "https://github.com/bhs-dev",
                "resume_file": SimpleUploadedFile(
                    "resume.txt",
                    b"Python Django AWS experience",
                    content_type="text/plain",
                ),
                "action": "analyze",
            },
        )

        self.assertRedirects(response, reverse("users-index"))
        user.refresh_from_db()
        self.assertEqual(user.github_username, "bhs-dev")
        self.assertIn("Python", user.github_top_languages)
        self.assertTrue(bool(user.profile_analyzed_at))

    def test_save_allows_other_direction_input(self):
        user = User.objects.create_user(
            student_id="20240007",
            name="기타학생",
            password="teamlab-pass-123",
        )
        self.client.force_login(user)

        response = self.client.post(
            reverse("users-index"),
            {
                "job_direction_choice": "__other__",
                "desired_job_direction_other": "게임 클라이언트",
                "github_url": "",
                "action": "save",
            },
        )

        self.assertRedirects(response, reverse("users-index"))
        user.refresh_from_db()
        self.assertEqual(user.desired_job_direction, "게임 클라이언트")
        self.assertEqual(user.desired_job_direction_other, "게임 클라이언트")

    # TODO: 비로그인 시 마이페이지 접근 차단
    # TODO: 다른 유저 프로필 접근 차단


class ProfileFormattingTests(TestCase):
    def test_build_portfolio_review_input_excludes_skill_stack(self):
        source = """
        박형석
        기술 스택
        Next.js, TypeScript, React, Firebase, AWS, Docker
        프로젝트 경험
        Next.js와 React를 활용해 SSR 기반 웹서비스를 개발하고 LCP를 3초에서 1초로 개선했습니다.
        GPT API 기반 문제 해설 기능을 구현하고 API 비용을 40% 절감했습니다.
        """

        review_input = build_portfolio_review_input(source)

        self.assertNotIn("Next.js, TypeScript, React, Firebase, AWS, Docker", review_input)
        self.assertIn("SSR 기반 웹서비스", review_input)
        self.assertIn("API 비용을 40% 절감", review_input)

    def test_format_portfolio_feedback_includes_all_items(self):
        feedback = format_portfolio_feedback(
            [
                {
                    "problem_sentence": "기능을 구현했습니다.",
                    "problem_points": ["성과가 보이지 않습니다."],
                    "improvement_points": ["사용 기술과 결과를 함께 적습니다."],
                    "before_example": "기능을 구현했습니다.",
                    "after_example": "React로 구현하고 응답 시간을 20% 개선했습니다.",
                },
            ]
        )

        self.assertIn("기능을 구현했습니다.", feedback)
        self.assertIn("20% 개선", feedback)
