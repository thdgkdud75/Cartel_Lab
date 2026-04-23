# Monthly Attendance Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** StudentDetailSheet 사이드 패널에 아코디언 형태의 월간 출결 캘린더를 추가한다.

**Architecture:** 하이브리드 접근 — 현재 달은 기존 attendance_rows(30일)를 활용하고, 다른 달 이동 시 새 백엔드 API를 lazy fetch. 프론트에서 `Map<string, records[]>` 캐시로 중복 요청 방지.

**Tech Stack:** Django REST (백엔드 엔드포인트), Next.js + React (프론트 컴포넌트), 기존 DASHBOARD_PALETTE/STATUS_COLOR 디자인 시스템

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `Back-end/dashboard/tests/test_monthly_calendar_api.py` | 월간 출결 API 테스트 |
| Modify | `Back-end/dashboard/api_views.py` | `api_student_monthly_attendance` 뷰 추가 |
| Modify | `Back-end/dashboard/views.py` | 새 뷰 re-export |
| Modify | `Back-end/dashboard/urls.py` | URL 패턴 추가 |
| Modify | `front-end/app/dashboard/_student-sheet.tsx` | `MonthlyCalendarSection` 컴포넌트 추가 |

---

### Task 1: 백엔드 — 월간 출결 API 테스트 작성

**Files:**
- Create: `Back-end/dashboard/tests/test_monthly_calendar_api.py`

- [ ] **Step 1: tests 디렉토리 확인 및 테스트 파일 작성**

```bash
ls Back-end/dashboard/tests/ 2>/dev/null || mkdir -p Back-end/dashboard/tests && touch Back-end/dashboard/tests/__init__.py
```

```python
# Back-end/dashboard/tests/test_monthly_calendar_api.py
import pytest
from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone

from attendance.models import AttendanceRecord
from users.models import User


class MonthlyCalendarAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            student_id="admin01",
            password="testpass123!",
            name="관리자",
            is_staff=True,
        )
        self.student = User.objects.create_user(
            student_id="2024001",
            password="testpass123!",
            name="홍길동",
            grade="2",
            class_group="A",
        )
        # 이번 달 출결 기록 생성
        today = date.today()
        self.month_str = today.strftime("%Y-%m")
        tz = timezone.get_current_timezone()
        for i in range(3):
            day = today.replace(day=i + 1)
            if day > today:
                break
            ci = timezone.make_aware(
                timezone.datetime.combine(day, timezone.datetime.strptime("09:00", "%H:%M").time()), tz
            )
            AttendanceRecord.objects.create(
                user=self.student,
                attendance_date=day,
                status="present" if i < 2 else "late",
                check_in_at=ci,
            )

    def _auth_headers(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.admin)
        return {"HTTP_AUTHORIZATION": f"Bearer {token.access_token}"}

    def test_returns_monthly_records(self):
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["month"], self.month_str)
        self.assertIn("records", data)
        self.assertIn("summary", data)
        self.assertGreaterEqual(len(data["records"]), 2)

    def test_summary_counts_correct(self):
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        data = resp.json()
        summary = data["summary"]
        self.assertGreaterEqual(summary["present"], 1)
        self.assertEqual(summary["present"] + summary["late"], len(data["records"]))

    def test_requires_staff(self):
        non_admin_token_headers = {}
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.student)
        non_admin_token_headers["HTTP_AUTHORIZATION"] = f"Bearer {token.access_token}"
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **non_admin_token_headers,
        )
        self.assertEqual(resp.status_code, 403)

    def test_defaults_to_current_month(self):
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["month"], date.today().strftime("%Y-%m"))

    def test_empty_month_returns_empty(self):
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month=2020-01",
            **self._auth_headers(),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["records"]), 0)
        self.assertEqual(data["summary"]["present"], 0)

    def test_record_shape(self):
        resp = self.client.get(
            f"/dashboard/api/student/{self.student.student_id}/monthly-attendance/?month={self.month_str}",
            **self._auth_headers(),
        )
        data = resp.json()
        record = data["records"][0]
        self.assertIn("date", record)
        self.assertIn("status", record)
        self.assertIn("color", record)
        self.assertIn("label", record)
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
cd Back-end && python -m pytest dashboard/tests/test_monthly_calendar_api.py -v
```

Expected: FAIL — URL 패턴 없음 (404 또는 import error)

- [ ] **Step 3: Commit**

```bash
git add Back-end/dashboard/tests/test_monthly_calendar_api.py Back-end/dashboard/tests/__init__.py
git commit -m "test(dashboard): add monthly attendance calendar API tests"
```

---

### Task 2: 백엔드 — 월간 출결 API 구현

**Files:**
- Modify: `Back-end/dashboard/api_views.py` (끝에 추가)
- Modify: `Back-end/dashboard/views.py` (__all__ 에 추가)
- Modify: `Back-end/dashboard/urls.py` (URL 패턴 추가)

- [ ] **Step 1: api_views.py에 뷰 함수 추가**

`Back-end/dashboard/api_views.py` 파일 끝에 추가:

```python
@csrf_exempt
@require_GET
def api_student_monthly_attendance(request, student_id):
    user = _get_token_user(request)
    if not user and request.user.is_authenticated:
        user = request.user
    if not user or not user.is_staff:
        return JsonResponse({"error": "관리자 권한이 필요합니다."}, status=403)

    student = get_object_or_404(User, student_id=student_id, is_staff=False)

    month_raw = request.GET.get("month", "")
    today = date.today()
    try:
        month_start = datetime.strptime(month_raw + "-01", "%Y-%m-%d").date() if month_raw else today.replace(day=1)
    except ValueError:
        month_start = today.replace(day=1)

    _, last_day = cal_module.monthrange(month_start.year, month_start.month)
    month_end = month_start.replace(day=last_day)

    records = AttendanceRecord.objects.filter(
        user=student,
        attendance_date__range=(month_start, month_end),
    ).order_by("attendance_date")

    status_label = {"present": "출석", "late": "지각", "absent": "결석", "leave": "조퇴"}
    status_color = {"present": "green", "late": "yellow", "absent": "red", "leave": "orange"}

    summary = {"present": 0, "late": 0, "absent": 0, "leave": 0}
    record_list = []
    for record in records:
        summary[record.status] = summary.get(record.status, 0) + 1
        record_list.append({
            "date": record.attendance_date.strftime("%Y-%m-%d"),
            "status": record.status,
            "color": status_color.get(record.status, "gray"),
            "label": status_label.get(record.status, record.status),
        })

    return JsonResponse({
        "month": month_start.strftime("%Y-%m"),
        "student_name": student.name,
        "records": record_list,
        "summary": summary,
    })
```

- [ ] **Step 2: views.py에 re-export 추가**

`Back-end/dashboard/views.py` — import 목록과 `__all__`에 `api_student_monthly_attendance` 추가:

```python
from .api_views import (
    # ... 기존 import들 ...
    api_student_monthly_attendance,
)

__all__ = [
    # ... 기존 항목들 ...
    "api_student_monthly_attendance",
]
```

- [ ] **Step 3: urls.py에 URL 패턴 추가**

`Back-end/dashboard/urls.py` — import에 `api_student_monthly_attendance` 추가, urlpatterns에 추가:

```python
from .views import (
    # ... 기존 import들 ...
    api_student_monthly_attendance,
)

urlpatterns = [
    # ... 기존 패턴들 ...
    path("api/student/<str:student_id>/monthly-attendance/", api_student_monthly_attendance, name="dashboard-api-student-monthly-attendance"),
]
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

```bash
cd Back-end && python -m pytest dashboard/tests/test_monthly_calendar_api.py -v
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add Back-end/dashboard/api_views.py Back-end/dashboard/views.py Back-end/dashboard/urls.py
git commit -m "feat(dashboard): add monthly attendance API endpoint for student calendar"
```

---

### Task 3: 프론트엔드 — MonthlyCalendarSection 컴포넌트 추가

**Files:**
- Modify: `front-end/app/dashboard/_student-sheet.tsx`

이 태스크는 `_student-sheet.tsx` 내부에 `MonthlyCalendarSection` 컴포넌트를 추가하고 `StudentDetailSheet` 렌더 트리에 배치한다.

- [ ] **Step 1: MonthlyCalendarSection 컴포넌트 작성**

`_student-sheet.tsx` 파일에서 `StudentDetailSheet` 함수 **위**에 다음 컴포넌트를 추가:

```tsx
type MonthlyRecord = {
  date: string;
  status: string;
  color: string;
  label: string;
};

type MonthlySummary = {
  present: number;
  late: number;
  absent: number;
  leave: number;
};

type MonthlyData = {
  records: MonthlyRecord[];
  summary: MonthlySummary;
};

function MonthlyCalendarSection({
  attendanceRows,
  studentId,
  today,
  authFetch,
}: {
  attendanceRows: DetailAttendanceRow[];
  studentId: string;
  today: string;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const todayDate = new Date(`${today}T00:00:00`);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [cache, setCache] = useState<Map<string, MonthlyData>>(new Map());
  const [loading, setLoading] = useState(false);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  // attendance_rows에서 현재 달 데이터 추출 시도
  function extractFromRows(key: string): MonthlyData | null {
    const [y, m] = key.split("-").map(Number);
    const matching = attendanceRows.filter((row) => {
      const d = new Date(`${row.date}T00:00:00`);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    if (matching.length === 0) return null;
    const summary = { present: 0, late: 0, absent: 0, leave: 0 };
    const records = matching.map((row) => {
      const status = row.color === "green" ? "present" : row.color === "yellow" ? "late" : row.color === "red" ? "absent" : row.color === "orange" ? "leave" : "present";
      if (status in summary) summary[status as keyof MonthlySummary] += 1;
      return { date: row.date, status, color: row.color, label: row.label };
    });
    return { records, summary };
  }

  useEffect(() => {
    if (!open) return;
    if (cache.has(monthKey)) return;

    // 기존 attendance_rows에서 추출 시도
    const fromRows = extractFromRows(monthKey);
    if (fromRows) {
      setCache((prev) => new Map(prev).set(monthKey, fromRows));
      return;
    }

    // API fetch
    setLoading(true);
    authFetch(`${Routes.ADMIN}/api/student/${studentId}/monthly-attendance/?month=${monthKey}`)
      .then((data: { records: MonthlyRecord[]; summary: MonthlySummary }) => {
        setCache((prev) => new Map(prev).set(monthKey, { records: data.records, summary: data.summary }));
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [open, monthKey]);

  const data = cache.get(monthKey);
  const recordMap = new Map((data?.records ?? []).map((r) => [r.date, r]));

  // 캘린더 그리드 생성
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=일
  const totalDays = lastDay.getDate();

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr });
  }

  // 월 이동
  function goMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  }

  // 드롭다운 옵션 (최근 12개월)
  const monthOptions: { label: string; year: number; month: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    monthOptions.push({
      label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    });
  }

  const summary = data?.summary;
  const todayStr = today;
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <section style={sectionCardStyle}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 18px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800, color: PALETTE.ink }}>월간 출결 캘린더</span>
        <span
          style={{
            fontSize: 18,
            color: PALETTE.muted,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px" }}>
          {/* 네비게이션 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => goMonth(-1)}
              style={{
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 10,
                background: PALETTE.surface,
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer",
                color: PALETTE.body,
              }}
            >
              ‹
            </button>
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setYear(y);
                setMonth(m);
              }}
              style={{
                ...fieldStyle,
                padding: "6px 10px",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                minWidth: 130,
              }}
            >
              {monthOptions.map((opt) => (
                <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => goMonth(1)}
              style={{
                border: `1px solid ${PALETTE.line}`,
                borderRadius: 10,
                background: PALETTE.surface,
                padding: "6px 10px",
                fontSize: 14,
                cursor: "pointer",
                color: PALETTE.body,
              }}
            >
              ›
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: PALETTE.muted, fontSize: 13 }}>불러오는 중...</div>
          ) : (
            <>
              {/* 요일 헤더 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
                {DOW_LABELS.map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: d === "일" ? PALETTE.danger : d === "토" ? PALETTE.brandText : PALETTE.muted,
                      padding: "6px 0",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 캘린더 그리드 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {cells.map((cell, idx) => {
                  if (!cell.day) {
                    return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 0.88" }} />;
                  }
                  const record = cell.dateStr ? recordMap.get(cell.dateStr) : null;
                  const c = record ? (COLOR[record.color as keyof typeof COLOR] ?? COLOR.gray) : null;
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={cell.dateStr}
                      title={record ? record.label : "기록 없음"}
                      style={{
                        aspectRatio: "1 / 0.88",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: isToday ? 800 : 600,
                        color: record ? c!.text : PALETTE.faint,
                        background: record ? c!.bg : "transparent",
                        border: isToday
                          ? `2px solid ${PALETTE.ink}`
                          : record
                            ? `1px solid ${c!.dot}3d`
                            : `1px solid transparent`,
                        boxSizing: "border-box",
                      }}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>

              {/* 범례 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                {[
                  { label: "출석", color: COLOR.green },
                  { label: "지각", color: COLOR.yellow },
                  { label: "조퇴", color: COLOR.orange },
                  { label: "결석", color: COLOR.red },
                ].map((item) => (
                  <span
                    key={item.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: PALETTE.muted }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 3,
                        background: item.color.dot,
                      }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>

              {/* 월간 요약 */}
              {summary && (
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 14,
                    background: PALETTE.surfaceSubtle,
                    border: `1px solid ${PALETTE.lineSoft}`,
                    padding: "10px 14px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: COLOR.green.text }}>출석 {summary.present}일</span>
                  <span style={{ color: COLOR.yellow.text }}>지각 {summary.late}일</span>
                  <span style={{ color: COLOR.red.text }}>결석 {summary.absent}일</span>
                  <span style={{ color: COLOR.orange.text }}>조퇴 {summary.leave}일</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: StudentDetailSheet에 MonthlyCalendarSection 배치**

`_student-sheet.tsx`의 `StudentDetailSheet` 컴포넌트 내부, "이번 주 주간 목표" 섹션(`</section>`) 뒤, "최근 출결 30일" 섹션(`<section style={sectionCardStyle}>` with "최근 출결 30일") 앞에 추가:

```tsx
<MonthlyCalendarSection
  attendanceRows={detail.attendance_rows}
  studentId={detail.student.student_id}
  today={detail.planner.today.date}
  authFetch={authFetch}
/>
```

이를 위해 `StudentDetailSheet` props에 `authFetch`를 추가해야 한다:

Props 타입 변경:
```tsx
export function StudentDetailSheet({
  detail,
  loading,
  onClose,
  onPasswordChange,
  authFetch,
}: {
  detail: StudentDetail | null;
  loading: boolean;
  onClose: () => void;
  onPasswordChange: (studentId: string, newPassword: string, newPasswordConfirm: string) => Promise<string>;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
}) {
```

- [ ] **Step 3: _attendance-section.tsx에서 authFetch를 StudentDetailSheet에 전달**

`_attendance-section.tsx`의 `StudentDetailSheet` 호출부를 수정:

```tsx
<StudentDetailSheet
  detail={studentDetail}
  loading={studentDetailLoading}
  onClose={handleCloseStudentDetail}
  onPasswordChange={handlePasswordChange}
  authFetch={authFetch}
/>
```

`WeeklyAttendanceSection`은 이미 `authFetch`를 prop으로 받고 있으므로 추가 변경 없음.

- [ ] **Step 4: import 추가 확인**

`_student-sheet.tsx` 상단에 `Routes` import가 없으면 추가:

```tsx
import { Routes } from "@/constants/enums";
```

`fieldStyle` import는 이미 존재함 (line 19).

- [ ] **Step 5: 개발 서버 실행 및 브라우저 확인**

```bash
cd front-end && npm run dev
```

확인 사항:
1. `/dashboard` 접속 → 학생 "자세히 보기" 클릭 → 사이드 패널 열림
2. "월간 출결 캘린더" 아코디언 보임 (닫힌 상태)
3. 클릭하면 현재 달 캘린더 펼쳐짐 (색상 배지 표시)
4. 화살표로 이전/다음 달 이동 가능
5. 드롭다운으로 월 직접 선택 가능
6. 월간 요약(출석 N일, 지각 N일...) 표시
7. 기존 "최근 출결 30일" 히트맵은 그대로 존재

- [ ] **Step 6: Commit**

```bash
git add front-end/app/dashboard/_student-sheet.tsx front-end/app/dashboard/_attendance-section.tsx
git commit -m "feat(dashboard): add monthly attendance calendar to StudentDetailSheet"
```
