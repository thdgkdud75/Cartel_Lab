from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import AttendanceRecord
from datetime import datetime, time

class Command(BaseCommand):
    help = "퇴실 처리가 되지 않은 모든 출석 기록을 자동으로 퇴실 처리합니다."

    def handle(self, *args, **options):
        # 오전 6시에 실행 → 어제 날짜 기준으로 퇴실 안 한 기록 처리
        yesterday = timezone.localdate() - timezone.timedelta(days=1)

        records = AttendanceRecord.objects.filter(
            attendance_date=yesterday,
            check_out_at__isnull=True,
        )

        count = records.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("자동 퇴실 처리할 기록이 없습니다."))
            return

        for record in records:
            # 전날 오후 5시(17:00)로 퇴실 처리
            naive_end_time = datetime.combine(yesterday, time(17, 0, 0))
            aware_end_time = timezone.make_aware(naive_end_time)
            record.check_out_at = aware_end_time
            record.save()

        self.stdout.write(self.style.SUCCESS(f"총 {count}개의 기록을 전날 오후 5시로 자동 퇴실 처리하였습니다."))
