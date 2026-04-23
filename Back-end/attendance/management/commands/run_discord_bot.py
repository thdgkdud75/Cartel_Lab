from django.core.management.base import BaseCommand
from django.conf import settings

from attendance.discord_bot import AttendanceBot


class Command(BaseCommand):
    help = "디스코드 출결 봇 실행"

    def handle(self, *args, **options):
        token = settings.DISCORD_BOT_TOKEN
        if not token:
            self.stderr.write(self.style.ERROR("DISCORD_BOT_TOKEN 환경변수가 설정되지 않았습니다."))
            return

        if not settings.DISCORD_CHANNEL_ID:
            self.stderr.write(self.style.ERROR("DISCORD_CHANNEL_ID 환경변수가 설정되지 않았습니다."))
            return

        self.stdout.write(self.style.SUCCESS("디스코드 출결 봇을 시작합니다..."))
        bot = AttendanceBot()
        bot.run(token)
