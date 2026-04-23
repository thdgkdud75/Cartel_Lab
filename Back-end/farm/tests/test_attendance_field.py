import pytest
from django.contrib.auth import get_user_model
from attendance.models import AttendanceRecord

User = get_user_model()


@pytest.mark.django_db
def test_new_record_has_reward_granted_false():
    user = User.objects.create_user(student_id="2026002", password="pw", name="Bob")
    rec = AttendanceRecord.objects.create(user=user)
    rec.refresh_from_db()
    assert rec.reward_granted is False
