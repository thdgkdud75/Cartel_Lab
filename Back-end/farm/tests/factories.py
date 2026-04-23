from django.contrib.auth import get_user_model
from attendance.models import AttendanceRecord
from farm.models import UserFarm

User = get_user_model()

_counter = {"n": 0}


def make_user(prefix="u"):
    _counter["n"] += 1
    sid = f"{prefix}{_counter['n']:05d}"
    return User.objects.create_user(student_id=sid, password="pw", name=sid.title())


def make_farm(user, **overrides):
    next_no = (UserFarm.objects.order_by("-dex_no").values_list("dex_no", flat=True).first() or 0) + 1
    return UserFarm.objects.create(user=user, dex_no=overrides.pop("dex_no", next_no), **overrides)


def make_record(user, *, check_in_at=None, check_out_at=None, attendance_date=None):
    """auto_now_add 우회를 위해 .save 후 update."""
    rec = AttendanceRecord.objects.create(user=user)
    update = {}
    if check_in_at is not None:
        update["check_in_at"] = check_in_at
    if check_out_at is not None:
        update["check_out_at"] = check_out_at
    if attendance_date is not None:
        update["attendance_date"] = attendance_date
    if update:
        AttendanceRecord.objects.filter(pk=rec.pk).update(**update)
        rec.refresh_from_db()
    return rec
