echo "DB 연결 대기 중..."
until python -c "
import pymysql, os, sys, traceback
try:
    host = os.getenv('DB_HOST', 'db')
    user = os.getenv('DB_USER', 'django')
    password = os.getenv('DB_PASSWORD', '')
    db = os.getenv('DB_NAME', 'cartel_lab')
    port = int(os.getenv('DB_PORT', 3306))

    print(f'DB 접속 시도: host={host}, port={port}, user={user}, db={db}')
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