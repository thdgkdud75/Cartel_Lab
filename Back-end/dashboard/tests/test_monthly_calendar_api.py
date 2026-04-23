from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from attendance.models import AttendanceRecord
from users.models import User


class MonthlyCalendarAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            student_id="admin01",
            password="testpass123!",
            name="관리자",
            is_staff=True,
        )
        self.student = User.objects.create_user(
            student_id="2024001",
            password="testpass123!",
            name="홍길동",
            grade="2",
            class_group="A",
        )
        today = date.today()
        self.month_str = today.strftime("%Y-%m")
        tz = timezone.get_current_timezone()

        # auto_now_add 임시 해제 (attendance_date, check_in_at)
        auto_fields = []
        for fname in ("attendance_date", "check_in_at", "created_at"):
            f = AttendanceRecord._meta.get_field(fname)
            if f.auto_now_add:
                f.auto_now_add = False
                auto_fields.append(f)
        try:
            for i in range(3):
                day = today.replace(day=i + 1)
                if day > today:
                    break
                ci = timezone.make_aware(
                    timezone.datetime.combine(day, timezone.datetime.strptime("09:00", "%H:%M").time()),
                    tz,
                )
                AttendanceRecord.objects.create(
                    user=self.student,
                    attendance_date=day,
                    status="present" if i < 2 else "late",
                    check_in_at=ci,
                    created_at=timezone.now(),
                )
        finally:
            for f in auto_fields:
                f.auto_now_add = True

    def _auth_headers(self, user=None):
        from rest_framework_simplejwt.tokens import RefreshToken

        token = RefreshToken.for_user(user or self.admin)
        return {"HTTP_AUTHORIZATION": f"Bearer {token.access_token}"}

    def test_returns_monthly_records(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["month"], self.month_str)
        self.assertIn("records", data)
        self.assertIn("summary", data)
        self.assertGreaterEqual(len(data["records"]), 2)

    def test_summary_counts_correct(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        data = resp.json()
        summary = data["summary"]
        self.assertGreaterEqual(summary["present"], 1)
        self.assertEqual(
            summary["present"] + summary["late"] + summary["absent"] + summary["leave"],
            len(data["records"]),
        )

    def test_requires_staff(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(user=self.student),
        )
        self.assertEqual(resp.status_code, 403)

    def test_defaults_to_current_month(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["month"], date.today().strftime("%Y-%m"))

    def test_empty_month_returns_empty(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month=2020-01",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["records"]), 0)
        self.assertEqual(data["summary"]["present"], 0)

    def test_record_shape(self):
        resp = self.client.get(
            f"/api/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        data = resp.json()
        record = data["records"][0]
        for key in ("date", "status", "color", "label"):
            self.assertIn(key, record)
