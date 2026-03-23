from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import AttendanceRecord
from datetime import datetime, time

class Command(BaseCommand):
    help = "퇴실 처리가 되지 않은 모든 출석 기록을 자동으로 퇴실 처리합니다."

    def handle(self, *args, **options):
        # 현재 시간 기준, 퇴실 기록이 없는 모든 이전 기록(오늘 포함)을 찾음
        # 자정에 실행된다면 어제의 기록들이 대상이 됨
        now = timezone.now()
        
        # 아직 퇴실하지 않은 기록들 (오늘 이전 또는 오늘 기록 중 퇴실 안 한 것)
        # 보통 이 명령어는 자정(00:00)에 실행될 것으로 예상됨
        records = AttendanceRecord.objects.filter(check_out_at__isnull=True)
        
        count = records.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("자동 퇴실 처리할 기록이 없습니다."))
            return

        for record in records:
            # 기록된 날짜의 23:59:59 (로컬 시간 기준)
            naive_end_time = datetime.combine(record.attendance_date, time(23, 59, 59))
            aware_end_time = timezone.make_aware(naive_end_time)
            
            record.check_out_at = aware_end_time
            record.save()
            
        self.stdout.write(self.style.SUCCESS(f"총 {count}개의 기록을 자동 퇴실 처리하였습니다."))
