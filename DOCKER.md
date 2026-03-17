# Docker 사용 가이드

> Docker Desktop이 설치되어 있어야 합니다.

---

## 1. 환경변수 파일 준비

```bash
cp .env.example .env
```

`.env` 파일을 열어서 아래 항목을 본인 값으로 수정하세요.

```
DJANGO_SECRET_KEY=랜덤한-비밀키
DB_PASSWORD=원하는-비밀번호
DB_ROOT_PASSWORD=루트-비밀번호
OPENAI_API_KEY=sk-proj-...
GITHUB_API_TOKEN=ghp_...
```

> `DB_HOST=db` 는 Docker 내부 서비스 이름이므로 **그대로 두세요.**

---

## 2. 빌드 및 실행

처음 실행하거나 코드가 바뀌었을 때:

```bash
docker-compose up --build
```

이미 빌드된 상태에서 재시작:

```bash
docker-compose up
```

백그라운드로 실행:

```bash
docker-compose up -d
```

브라우저 접속: `http://localhost:8000`

---

## 3. 종료

```bash
docker-compose down
```

DB 데이터까지 완전 삭제할 때:

```bash
docker-compose down -v
```

---

## 4. 자주 쓰는 명령어

```bash
# 로그 보기
docker-compose logs -f web

# Django 명령어 실행 (예: 슈퍼유저 생성)
docker-compose exec web python manage.py createsuperuser

# 마이그레이션 수동 실행
docker-compose exec web python manage.py migrate

# MySQL 접속
docker-compose exec db mysql -u django -p cartel_lab
```
