#!/bin/sh
set -e

echo "DB 연결 대기 중..."

# DATABASE_URL이 postgres로 시작하면 PostgreSQL, 아니면 MySQL
if python -c "import os,sys; url=os.getenv('DATABASE_URL',''); sys.exit(0 if url.startswith('postgres') else 1)"; then
    # PostgreSQL (Neon)
    until python -c "
import os, sys
try:
    import psycopg2
    from urllib.parse import urlparse
    u = urlparse(os.environ['DATABASE_URL'])
    conn = psycopg2.connect(
        host=u.hostname, port=u.port or 5432,
        user=u.username, password=u.password,
        dbname=u.path.lstrip('/'),
        sslmode='require', connect_timeout=5
    )
    conn.close()
    print('PostgreSQL 연결 성공')
    sys.exit(0)
except Exception as e:
    print('PostgreSQL 연결 실패:', repr(e))
    sys.exit(1)
"; do
      echo "DB 준비 안됨, 2초 후 재시도..."
      sleep 2
    done
else
    # MySQL (기존 Railway)
    until python -c "
import pymysql, os, sys, traceback
host     = os.getenv('DB_HOST') or 'db'
user     = os.getenv('DB_USER') or 'root'
password = os.getenv('DB_PASSWORD') or ''
db       = os.getenv('DB_NAME') or 'cartel_lab'
raw_port = os.getenv('DB_PORT') or '3306'
print('DB_HOST =', host)
try:
    conn = pymysql.connect(host=host, user=user, password=password, port=int(raw_port), connect_timeout=5)
    cursor = conn.cursor()
    cursor.execute(f'CREATE DATABASE IF NOT EXISTS \`{db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    conn.close()
    print('MySQL 연결 성공')
    sys.exit(0)
except Exception as e:
    print('MySQL 연결 실패:', repr(e))
    sys.exit(1)
"; do
      echo "DB 준비 안됨, 2초 후 재시도..."
      sleep 2
    done
fi

echo "DB 연결 성공!"

python manage.py migrate --noinput
echo "migrate 완료"

python manage.py loaddata timetable/fixtures/initial_timetable.json || echo "시간표 fixture 이미 존재, 건너뜀"

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
    print('관리자 계정:', sid)
else:
    print('ADMIN_ID / ADMIN_PASSWORD 미설정, 건너뜀')
"

service cron start || true

python manage.py sync_contests &
python manage.py sync_job_sources &

if [ -n "$DISCORD_BOT_TOKEN" ] && [ -n "$DISCORD_CHANNEL_ID" ]; then
  python manage.py run_discord_bot &
fi

if [ "$#" -eq 0 ]; then
  set -- gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 3 --timeout 120
fi

exec "$@"
