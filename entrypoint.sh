#!/bin/sh
set -e

echo "DB 연결 대기 중..."
until python -c "
import pymysql, os, sys, traceback
host = os.getenv('DB_HOST', 'db')
user = os.getenv('DB_USER', 'django')
password = os.getenv('DB_PASSWORD', '')
db = os.getenv('DB_NAME', 'cartel_lab')
raw_port = os.getenv('DB_PORT', '3306')

print('DB_HOST=', host)
print('DB_USER=', user)
print('DB_NAME=', db)
print('DB_PORT=', raw_port)

try:
    port = int(raw_port)
    pymysql.connect(
        host=host,
        user=user,
        password=password,
        db=db,
        port=port,
        connect_timeout=5,
    )
    print('DB 연결 성공')
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

python manage.py shell -c "
import os
from users.models import User
sid = os.environ.get('ADMIN_ID', '')
pw  = os.environ.get('ADMIN_PASSWORD', '')
if sid and pw:
    if not User.objects.filter(student_id=sid).exists():
        User.objects.create_superuser(student_id=sid, password=pw, name=os.environ.get('ADMIN_NAME', '관리자'))
        print('관리자 계정 생성됨:', sid)
    else:
        print('관리자 계정 이미 존재:', sid)
else:
    print('ADMIN_ID / ADMIN_PASSWORD 미설정, 건너뜀')
"

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 3 \
  --timeout 120
