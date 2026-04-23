# 월간 출결 캘린더 설계

> 어드민 대시보드 StudentDetailSheet에 월간 캘린더 뷰 추가

## 개요

- **위치:** 기존 StudentDetailSheet(사이드 패널 460px) 내 새 섹션
- **형태:** 아코디언 — 기본 닫힘, 클릭 시 펼침
- **배치:** "이번 주 주간 목표" 섹션과 "최근 출결 30일" 히트맵 사이
- **데이터:** 하이브리드 — 현재 달은 기존 attendance_rows 활용, 다른 달은 새 API lazy fetch

## 백엔드

### 새 엔드포인트

```
GET /admin/api/student/{student_id}/monthly-attendance/?month=2026-04
```

- **권한:** staff only (기존 패턴 동일)
- **파라미터:** `month` (YYYY-MM, 없으면 현재 달)
- **위치:** `Back-end/dashboard/views.py` + `Back-end/dashboard/urls.py`

### 응답 형태

```json
{
  "month": "2026-04",
  "student_name": "홍길동",
  "records": [
    { "date": "2026-04-01", "status": "present", "color": "green", "label": "출석" },
    { "date": "2026-04-03", "status": "late", "color": "yellow", "label": "지각" }
  ],
  "summary": { "present": 15, "late": 2, "absent": 1, "leave": 0 }
}
```

### 구현 세부

- 기존 `_build_student_detail_payload`의 attendance 직렬화 패턴(status_label, status_color 매핑) 재사용
- `AttendanceRecord.objects.filter(user=student, attendance_date__year=year, attendance_date__month=month)`
- summary는 records를 집계하여 반환

## 프론트엔드

### 컴포넌트

`MonthlyCalendarSection` — `_student-sheet.tsx` 내부에 추가

### UI 구성

1. **아코디언 헤더:** "월간 출결 캘린더" + 화살표 아이콘 (펼침/닫힘)
2. **네비게이션 바:**
   - `<` 이전 달 화살표
   - 드롭다운 (YYYY년 MM월 선택)
   - `>` 다음 달 화살표
3. **요일 헤더:** 일 | 월 | 화 | 수 | 목 | 금 | 토
4. **캘린더 그리드:**
   - 7열 x 4~6행
   - 각 셀: 날짜 숫자 + 상태 색상 배경 (색상만, 시간 표시 없음)
   - 오늘 날짜는 테두리 강조
   - 해당 월이 아닌 날짜는 투명 처리
5. **범례:** 출석(초록) 지각(노랑) 조퇴(주황) 결석(빨강) 기록없음(회색)
6. **월간 요약:** 출석 N일 · 지각 N일 · 결석 N일 · 조퇴 N일

### 데이터 흐름

1. 아코디언 열 때 현재 달 데이터 체크
2. 기존 `attendance_rows` prop에서 해당 달 records 추출 가능하면 사용
3. 부족하면 `/admin/api/student/{id}/monthly-attendance/?month=YYYY-MM` fetch
4. 월 이동 시 API fetch (이미 가져온 달은 `Map<string, records>` 캐시로 재요청 안 함)

### 스타일

- 기존 `DASHBOARD_PALETTE`, `DASHBOARD_STATUS_COLOR` 사용
- `sectionCardStyle` 패턴 유지
- 셀 크기: 약 50px x 44px (460px 패널에 맞춤)
- 아코디언 전환: CSS transition (높이 애니메이션)

## 범위 외

- 날짜 클릭 시 상세 팝업 (색상만 표시)
- 출결 수정 기능 (기존 EditAttendanceModal에서 처리)
- 전체 학생 요약 캘린더
