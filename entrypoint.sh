#!/bin/sh
set -e

echo "DB 연결 대기 중..."
until python -c "
import pymysql, os, sys
try:
    pymysql.connect(
        host=os.getenv('DB_HOST', 'db'),
        user=os.getenv('DB_USER', 'django'),
        password=os.getenv('DB_PASSWORD', ''),
        db=os.getenv('DB_NAME', 'cartel_lab'),
        port=int(os.getenv('DB_PORT', 3306)),
    )
    sys.exit(0)
except Exception:
    sys.exit(1)
"; do
  echo "DB 준비 안됨, 2초 후 재시도..."
  sleep 2
done

echo "DB 연결 성공!"

python manage.py migrate --noinput
echo "migrate 완료"

echo "공고 수집 시작 (백그라운드)..."
python manage.py sync_job_sources &

if [ $# -gt 0 ]; then
  exec "$@"
else
  exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 300 \
    --graceful-timeout 30
fi
