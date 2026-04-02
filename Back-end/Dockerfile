FROM python:3.11-slim

# cron 설치
RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리
WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 복사
COPY . .

# static 파일 수집
RUN python manage.py collectstatic --noinput

# 매일 한국시간 오전 6시 (UTC 21:00) 자동 퇴실 처리 cron 등록
# 매일 한국시간 오전 9시 (UTC 00:00) 공모전 정보 동기화 cron 등록
RUN echo "0 21 * * * cd /app && python manage.py auto_check_out >> /var/log/auto_checkout.log 2>&1\n0 0 * * * cd /app && python manage.py sync_contests >> /var/log/sync_contests.log 2>&1" | crontab -

# 실행 포트
EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
