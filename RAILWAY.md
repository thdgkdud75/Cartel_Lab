# Railway 배포 가이드

## 1. Railway 가입 및 프로젝트 생성

1. [railway.app](https://railway.app) 접속 → **GitHub으로 로그인**
2. `New Project` → `Deploy from GitHub repo`
3. `Cartel_Lab` 레포 선택, 브랜치: `master` (또는 `develop`)

---

## 2. MySQL 데이터베이스 추가

1. 프로젝트 대시보드 → `+ New` → `Database` → `Add MySQL`
2. MySQL 서비스 클릭 → `Variables` 탭에서 아래 접속 정보 확인
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`

---

## 3. 환경변수 설정

web 서비스 선택 → `Variables` 탭 → 아래 항목 입력

```
DJANGO_SECRET_KEY=<기존 .env의 값>

DB_ENGINE=django.db.backends.mysql
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}

DEBUG=False
ALLOWED_HOSTS=<배포 후 발급된 railway 도메인>
CSRF_TRUSTED_ORIGINS=https://<배포 후 발급된 railway 도메인>

OPENAI_API_KEY=<기존 .env의 값>
OPENAI_PROFILE_MODEL=gpt-4.1-mini
OPENAI_JOB_MODEL=gpt-4.1-mini

GITHUB_API_TOKEN=<기존 .env의 값>

GOOGLE_CALENDAR_CLIENT_ID=<기존 .env의 값>
GOOGLE_CALENDAR_CLIENT_SECRET=<기존 .env의 값>
GOOGLE_CALENDAR_REDIRECT_URI=https://<railway 도메인>/planner/google/callback/
```

> `${{MySQL.MYSQLHOST}}` 형식은 Railway가 MySQL 서비스 값을 자동으로 주입합니다.

---

## 4. 도메인 확인 및 환경변수 업데이트

1. web 서비스 → `Settings` → `Networking` → `Generate Domain` 클릭
2. 발급된 도메인 (예: `cartel-lab.up.railway.app`) 을 아래 변수에 반영
   - `ALLOWED_HOSTS=cartel-lab.up.railway.app`
   - `CSRF_TRUSTED_ORIGINS=https://cartel-lab.up.railway.app`
   - `GOOGLE_CALENDAR_REDIRECT_URI=https://cartel-lab.up.railway.app/planner/google/callback/`

---

## 5. 배포 확인

Railway 대시보드 → `Deployments` 탭에서 빌드 로그 확인

정상 배포 시 로그에 아래가 표시됩니다:
```
migrate 완료
[INFO] Starting gunicorn 23.0.0
[INFO] Listening at: http://0.0.0.0:8000
```

---

## 6. 이후 배포 (자동)

`master` (또는 `develop`) 브랜치에 `git push` 하면 Railway가 자동으로 재배포합니다.

```bash
git push origin master
```

---

## 참고: 로컬 도커 개발 환경

로컬에서는 `docker-compose.override.yml` 이 자동 적용되어 `runserver` 로 실행됩니다.

```bash
# 처음 실행 (볼륨 초기화 포함)
docker compose down -v
docker compose up

# 이후 실행
docker compose up
```
