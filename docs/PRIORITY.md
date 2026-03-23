# 작업 우선순위

> 최종 업데이트: 2026-03-23

---

## 🔴 높음 (임팩트 큼)

### 1. ~~jobs 목록 Redis 캐시 적용~~ ✅ 완료
### 2. ~~LocationSetting 캐시 적용~~ ✅ 완료
### 3. Dashboard 다중 쿼리 캐시 (보류)
- 대상: `dashboard/views.py`
- 내용: 학생 목록, 주간 출석, 오늘 할일 등 6~7개 쿼리
- TTL: 1~2분

---

## ✅ 완료

- [x] jobs 목록 유저별 캐시 (`jobs_index_{user_id}`, 하루 TTL) — 2026-03-23
- [x] AI 공고 추천 결과 캐시 (`ai_job_rec_{user_id}_{job_id}`, 하루 TTL) — 2026-03-23
- [x] market_snapshot Redis 캐시 공유 (마이페이지 + jobs, 1시간 TTL) — 2026-03-23
- [x] LocationSetting 캐시 (하루 TTL, 변경 시 즉시 무효화) — 2026-03-23
- [x] AttendanceTimeSetting 캐시 TTL 하루로 변경 — 2026-03-23
- [x] 오늘 퀴즈 자정까지 캐시 (`quiz_today_{date}`) — 2026-03-23
- [x] Upstash Redis 연동 — 2026-03-23
- [x] DB CONN_MAX_AGE 60초 설정 — 이전 작업
- [x] market_snapshot 백그라운드 갱신 — 이전 작업

---

## 📊 Lighthouse 성능 측정

측정 URL: `https://cartellab-production.up.railway.app/users/login/`
측정 도구: Lighthouse CLI 13.0.3

### Before (2026-03-23, Redis 캐시 적용 전)

| 항목 | 점수 |
|------|------|
| Performance | 94 |
| Accessibility | 95 |
| Best Practices | 96 |
| SEO | 91 |

| 성능 지표 | 값 |
|----------|---|
| FCP (첫 콘텐츠 표시) | 2.4s |
| LCP (최대 콘텐츠 표시) | 2.6s |
| TBT (차단 시간) | 0ms |
| CLS (레이아웃 변동) | 0 |
| Speed Index | 2.4s |
| TTI (인터랙티브까지) | 2.6s |

> 참고: FCP/LCP 2.4~2.6s는 Railway 서버가 싱가포르에 위치해 한국 접근 시 네트워크 지연 포함된 수치

### After (배포 후 측정 예정)
- Redis 캐시 적용 후 재측정하여 비교

---

## 📊 페이지별 Lighthouse 측정 (Before)

> 측정일: 2026-03-23 / Lighthouse 13.0.2 / Desktop 기준

### 로그인 페이지 `/users/login/`

| 항목 | 점수 |
|------|------|
| Performance | 94 |
| Accessibility | 95 |
| Best Practices | 96 |
| SEO | 91 |

| 지표 | 값 |
|------|---|
| FCP | 2.4s |
| LCP | 2.6s |
| TBT | 0ms |
| CLS | 0 |
| Speed Index | 2.4s |

---

### 블로그 페이지 `/blog/oh-moya/`

| 항목 | 점수 |
|------|------|
| Performance | 94 |
| Accessibility | 88 |
| Best Practices | 73 |
| SEO | 73 |

| 지표 | 값 |
|------|---|
| FCP | 0.7s |
| LCP | 1.2s |
| TBT | 0ms |
| CLS | 0.004 |
| Speed Index | 1.8s |

**개선 필요 항목:**
- 이미지 최적화 (407KB 절감 가능)
- 렌더 블로킹 리소스 제거 (320ms 절감 가능)
- 미사용 JS 제거 (53KB), 미사용 CSS 제거 (17KB)
- SEO: meta description 없음, img alt 속성 없음, 링크 크롤 불가
- Accessibility: img alt 없음, 명암비 부족, heading 순서 오류
- Best Practices: 서드파티 쿠키, CSP 미설정, HSTS 미설정
