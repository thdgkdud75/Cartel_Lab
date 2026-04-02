from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from contests.models import Contest


class ContestApiTests(TestCase):
    def setUp(self):
        today = timezone.now().date()

        Contest.objects.create(
            source="wevity",
            external_id="active-ai",
            external_url="https://example.com/ai",
            title="AI 서비스 아이디어 공모전",
            host="테스트 기관",
            category="생성형 AI",
            image_url="https://example.com/image.png",
            deadline_at=today + timedelta(days=3),
            content_summary="AI 기반 서비스 아이디어를 모집합니다.",
            tags="AI,아이디어",
        )
        Contest.objects.create(
            source="wevity",
            external_id="always-open",
            external_url="https://example.com/open",
            title="상시 모집 개발 챌린지",
            host="상시 기관",
            category="SW 개발",
            deadline_at=None,
        )
        Contest.objects.create(
            source="wevity",
            external_id="expired",
            external_url="https://example.com/expired",
            title="만료된 공모전",
            host="지난 기관",
            category="기타 IT",
            deadline_at=today - timedelta(days=1),
            is_active=False,
        )

    def test_contest_api_returns_expected_shape(self):
        response = self.client.get(reverse("contests:list"))

        self.assertEqual(response.status_code, 200)

        data = response.json()

        self.assertIn("generated_at", data)
        self.assertIn("categories", data)
        self.assertIn("items", data)
        self.assertEqual(data["current_category"], "")
        self.assertEqual(len(data["items"]), 2)

        first = data["items"][0]
        self.assertIn("image_url", first)
        self.assertIn("category", first)
        self.assertIn("d_day", first)
        self.assertIn("d_day_label", first)
        self.assertIn("deadline_label", first)
        self.assertIn("source_label", first)

    def test_contest_api_filters_by_category(self):
        response = self.client.get(reverse("contests:list"), {"category": "생성형 AI"})

        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["current_category"], "생성형 AI")
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["category"], "생성형 AI")

    def test_contest_api_excludes_inactive_or_expired_contests(self):
        response = self.client.get(reverse("contests:list"))

        titles = [item["title"] for item in response.json()["items"]]

        self.assertNotIn("만료된 공모전", titles)

    @patch("contests.views.get_contest_preview")
    def test_contest_preview_api_returns_summary_payload(self, mocked_get_preview):
        contest = Contest.objects.get(external_id="active-ai")
        mocked_get_preview.return_value = {
            "contest_id": contest.id,
            "title": contest.title,
            "external_url": contest.external_url,
            "summary": "AI 서비스 아이디어 공모전의 핵심 정보를 정리한 요약입니다.",
            "highlights": ["생성형 AI 분야 공모전입니다.", "마감일은 3일 남았습니다."],
            "action_hint": "세부 조건은 원본 페이지에서 확인하세요.",
            "generated_by": "ai",
        }

        response = self.client.get(reverse("contests:preview", kwargs={"contest_id": contest.id}))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["contest_id"], contest.id)
        self.assertIn("summary", data)
        self.assertIn("highlights", data)
        mocked_get_preview.assert_called_once()
