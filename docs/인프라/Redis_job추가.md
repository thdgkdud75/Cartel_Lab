# Redis + Celery 도입기 — 공고 수집 자동화

## 문제 상황

Django 프로젝트에서 채용 공고를 수집하는 `sync_job_sources` 커맨드를 서버 시작 시점(`entrypoint.sh`)에 백그라운드로 실행하고 있었다.

```sh
python manage.py sync_job_sources &
```

이 방식은 두 가지 문제를 만들었다.

**문제 1 — 서버 시작 시 과부하**
공고 수집은 외부 API(사람인, 원티드)를 순차 호출하고 DB에 수백 건을 upsert하는 무거운 작업이다.
gunicorn worker가 뜨자마자 이 작업이 실행되면서 CPU와 I/O를 점유해 초기 요청들이 타임아웃(WORKER TIMEOUT)에 걸렸다.

**문제 2 — 이후 업데이트 없음**
서버가 재시작되지 않으면 공고가 갱신되지 않는다.
즉, 배포 없이는 최신 공고를 볼 수 없는 구조였다.

---

## 임시 해결

우선 공고 수집을 자동 실행하지 않고, 사용자가 직접 버튼을 눌러 수집을 시작하도록 변경했다.
공고가 없을 때만 버튼이 노출되고, 수집이 완료되면 버튼이 사라진다.

---

## 근본 해결 — Redis + Celery 도입 예정

### 구조

```
사용자 요청 (버튼 or 스케줄)
    ↓
Celery Task 큐에 등록 (Redis가 브로커 역할)
    ↓
Celery Worker가 백그라운드에서 처리
    ↓
DB 업데이트 완료
```

### 왜 Redis인가

Celery는 작업 큐를 저장할 브로커(Message Broker)가 필요하다.
선택지는 RabbitMQ, Redis, DB(Django ORM) 등이 있는데 Redis를 선택한 이유는:

- 설정이 가장 단순하다 (`CELERY_BROKER_URL = "redis://localhost:6379/0"` 한 줄)
- 이미 캐싱 용도로도 활용 가능해 인프라 추가가 최소화된다
- Railway, Render 모두 Redis 플러그인을 공식 지원한다

### 적용 시 달라지는 점

| 현재 | Redis + Celery 적용 후 |
|------|----------------------|
| 서버 시작 시 1회 수집 | Celery Beat로 매일 오전 9시 자동 수집 |
| 수집 중 서버 응답 느림 | 완전히 분리된 워커에서 처리 |
| 배포해야 공고 갱신 | 스케줄에 따라 자동 갱신 |

### 추가 예정 작업

```python
# tasks.py
@app.task
def sync_jobs_task():
    call_command('sync_job_sources')

# celery beat schedule
CELERY_BEAT_SCHEDULE = {
    'sync-jobs-daily': {
        'task': 'planner.tasks.sync_jobs_task',
        'schedule': crontab(hour=9, minute=0),
    },
}
```
