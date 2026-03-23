# 작업 우선순위

> 최종 업데이트: 2026-03-23

---

## 🔴 높음 (임팩트 큼)

### 1. jobs 목록 Redis 캐시 적용
- 대상: `jobs/views.py` `jobs_index()`
- 내용: 공고 100개 조회 + 유저별 스코어링 계산을 캐시
- TTL: 5분 (공고 sync 시 캐시 무효화)
- 효과: 매 페이지 로드마다 발생하는 DB 쿼리 + 계산 제거

---

## 🟡 중간 (간단하지만 효과 있음)

### 2. LocationSetting 캐시 적용
- 대상: `attendance/views.py`
- 내용: `LocationSsting.objects.filter(is_active=True).first()` 캐시
- TTL: 5분 (AttendanceTimeSetting과 동일하게)
- 효과: 출퇴근 체크마다 발생하는 불필요한 DB 조회 제거

### 3. Dashboard 다중 쿼리 캐시
- 대상: `dashboard/views.py`
- 내용: 학생 목록, 주간 출석, 오늘 할일 등 6~7개 쿼리
- TTL: 1~2분
- 효과: 대시보드 반복 조회 시 DB 부하 감소

### 4. 오늘 퀴즈 캐시
- 대상: `quiz/views.py`
- 내용: `Quiz.objects.filter(scheduled_date=today)` 캐시
- TTL: 자정까지 (오늘 날짜 고정이라 결과 안 바뀜)
- 효과: 퀴즈 페이지 반복 접근 시 DB 쿼리 제거

---

## 🟢 낮음 (나중에)

### 5. 마이페이지 market_snapshot 캐시 공유
- 대상: `users/views.py` `index()`
- 내용: `get_or_refresh_market_snapshot()` 결과를 Redis에서 읽기
- 효과: 마이페이지 자체 DB 쿼리가 적어 체감 효과 낮음
- 참고: market_snapshot은 jobs 목록에서도 쓰여 한 곳에서 공유 가능

---

## ✅ 완료

- [x] AI 추천 결과 Redis 캐시 (`jobs/views.py` `job_detail_api`) — 2026-03-23
- [x] AttendanceTimeSetting 캐시 적용 — 이전 작업
- [x] DB CONN_MAX_AGE 60초 설정 — 이전 작업
- [x] market_snapshot 백그라운드 갱신 — 이전 작업
- [x] Upstash Redis 연동 — 2026-03-23
