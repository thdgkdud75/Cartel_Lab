#!/bin/sh
set -e

echo "DB 연결 대기 중..."
until python -c "
import pymysql, os, sys, traceback

host = os.getenv('DB_HOST') or 'db'
user = os.getenv('DB_USER') or 'root'
password = os.getenv('DB_PASSWORD') or ''
db = os.getenv('DB_NAME') or 'cartel_lab'
raw_port = os.getenv('DB_PORT') or '3306'

print('--- DB ENV CHECK ---')
print('DB_HOST =', host)
print('DB_USER =', user)
print('DB_NAME =', db)
print('DB_PORT =', raw_port)
print('--------------------')

try:
    port = int(raw_port)
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        port=port,
        connect_timeout=5,
    )
    cursor = conn.cursor()
    cursor.execute(f'CREATE DATABASE IF NOT EXISTS \`{db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    conn.close()
    print('DB 연결 성공 및 DB 확인/생성 완료')
    sys.exit(0)
except Exception as e:
    print('DB 연결 실패 원인:', repr(e))
    traceback.print_exc()
    sys.exit(1)
"; do
  echo "DB 준비 안됨, 2초 후 재시도..."
  sleep 2
done

echo "DB 연결 성공!"

python manage.py migrate --noinput
echo "migrate 완료"

python manage.py loaddata timetable/fixtures/initial_timetable.json
echo "시간표 fixture 로드 완료"

python manage.py shell -c "
import os
from users.models import User
sid = os.environ.get('ADMIN_ID', '')
pw  = os.environ.get('ADMIN_PASSWORD', '')
if sid and pw:
    user, created = User.objects.get_or_create(student_id=sid, defaults={'name': os.environ.get('ADMIN_NAME', '관리자')})
    if created:
        user.set_password(pw)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print('관리자 계정 생성됨:' if created else '관리자 권한 업데이트:', sid)
else:
    print('ADMIN_ID / ADMIN_PASSWORD 미설정, 건너뜀')
"

service cron start
echo "cron 시작 완료"

python manage.py sync_contests &
echo "공모전 초기 동기화 백그라운드 시작"

python manage.py sync_job_sources &
echo "job sync started in background"

python manage.py shell -c "
from users.models import User
mapping = {
    '김민혁': '1491998723918659756',
    '황현준': '995983919344263218',
    '유현기': '422290087464665089',
    '임찬영': '882589449643507762',
    '조우진': '1478648494095990959',
}
for name, discord_id in mapping.items():
    try:
        u = User.objects.get(name=name)
        if u.discord_id != discord_id:
            u.discord_id = discord_id
            u.save(update_fields=['discord_id'])
            print(f'{name} -> {discord_id} 매핑 완료')
        else:
            print(f'{name} 이미 매핑됨')
    except User.DoesNotExist:
        print(f'{name} 유저 없음, 건너뜀')
"
echo "디스코드 ID 매핑 완료"

if [ -n "$DISCORD_BOT_TOKEN" ] && [ -n "$DISCORD_CHANNEL_ID" ]; then
  python manage.py run_discord_bot &
  echo "디스코드 봇 백그라운드 시작"
else
  echo "DISCORD_BOT_TOKEN 미설정, 디스코드 봇 건너뜀"
fi


if [ "$#" -eq 0 ]; then
  set -- gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 3 --timeout 120
fi

exec "$@"
