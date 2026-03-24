from datetime import date

from django.test import TestCase, override_settings
from django.urls import reverse

from certifications.services.certification_feed import (
    _decorate_qnet_schedules,
    _decorate_sqld_schedules,
    parse_qnet_info_processing_schedule,
    parse_sqld_schedule,
)


@override_settings(
    STORAGES={
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
    }
)
class CertificationPageTests(TestCase):
    def test_certification_page_loads(self):
        response = self.client.get(reverse("certifications-index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "중요 자격증 정보")
        self.assertContains(response, "자격증 빠른 선택")
        self.assertContains(response, "자격증 상세")
        self.assertNotContains(response, "UI 샘플 페이지")
        self.assertNotContains(response, "1번 페이지")
        self.assertNotContains(response, "2번 페이지")
        self.assertNotContains(response, "3번 페이지")

    def test_certification_api_loads(self):
        response = self.client.get(reverse("certifications-important-api"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("items", response.json())


class ImportantCertificationParsingTests(TestCase):
    def test_parse_qnet_info_processing_schedule(self):
        sample_html = """
        <table>
            <tr>
                <td>2026년 정기 기사 1회</td>
                <td>2026.01.12 ~ 2026.01.15 [빈자리접수 : 2026.01.24 ~ 2026.01.25]</td>
                <td>2026.01.30 ~ 2026.03.03</td>
                <td>2026.03.11</td>
                <td>2026.03.23 ~ 2026.03.26 빈자리접수 : 2026.04.12 ~ 2026.04.13</td>
                <td>2026.04.18 ~ 2026.05.06</td>
                <td>2026.06.12</td>
            </tr>
        </table>
        """

        parsed = parse_qnet_info_processing_schedule(sample_html)

        self.assertEqual(len(parsed), 1)
        self.assertEqual(parsed[0]["round"], "2026년 정기 기사 1회")
        self.assertEqual(parsed[0]["written_result"], "2026.03.11")
        self.assertEqual(parsed[0]["final_result"], "2026.06.12")

        alerts = _decorate_qnet_schedules(parsed, date(2026, 1, 30))
        self.assertEqual(parsed[0]["written_registration_status"]["code"], "closed")
        self.assertTrue(parsed[0]["written_exam_status"]["is_today"])
        self.assertEqual(len(alerts), 1)

        parsed_soon = parse_qnet_info_processing_schedule(sample_html)
        _decorate_qnet_schedules(parsed_soon, date(2026, 3, 20))
        self.assertEqual(parsed_soon[0]["practical_exam_status"]["code"], "soon")

        parsed_urgent = parse_qnet_info_processing_schedule(sample_html)
        _decorate_qnet_schedules(parsed_urgent, date(2026, 4, 12))
        self.assertEqual(parsed_urgent[0]["practical_exam_status"]["code"], "urgent")

    def test_parse_sqld_schedule(self):
        sample_html = """
        <div>
            <h4>2026년도 일정</h4>
            <h5>SQL 개발자</h5>
            <p>제60회 - 2.2~6 2.20 3.7(토) 3.20~24 3.27 -</p>
            <p>제61회 - 4.27~5.1 5.15 5.31(일) 6.12~16 6.19 -</p>
            <h5>데이터아키텍처 전문가</h5>
        </div>
        """

        parsed = parse_sqld_schedule(sample_html)

        self.assertEqual(len(parsed), 2)
        self.assertEqual(parsed[0]["round"], "제60회")
        self.assertEqual(parsed[0]["registration"], "2026.02.02 ~ 2026.02.06")
        self.assertEqual(parsed[0]["exam_date"], "2026.03.07(토)")
        self.assertEqual(parsed[1]["result_date"], "2026.06.19")

        alerts = _decorate_sqld_schedules(parsed, date(2026, 3, 7))
        self.assertEqual(parsed[0]["registration_status"]["code"], "closed")
        self.assertEqual(parsed[0]["exam_status"]["code"], "today")
        self.assertEqual(len(alerts), 1)

        parsed_soon = parse_sqld_schedule(sample_html)
        _decorate_sqld_schedules(parsed_soon, date(2026, 2, 20))
        self.assertEqual(parsed_soon[0]["exam_status"]["code"], "soon")

        parsed_urgent = parse_sqld_schedule(sample_html)
        _decorate_sqld_schedules(parsed_urgent, date(2026, 3, 1))
        self.assertEqual(parsed_urgent[0]["exam_status"]["code"], "urgent")
