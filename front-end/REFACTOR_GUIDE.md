# 페이지 리팩토링 가이드

대시보드 리팩토링 작업을 기준으로 정리한 Next.js 페이지 구조 규칙.
새로운 페이지를 만들거나 기존 페이지를 정리할 때 이 방식을 따른다.

---

## 폴더 / 파일 구조

```
app/[페이지명]/
├── page.tsx                  # 진입점. 데이터 fetch + 섹션 조립만
├── _hero.tsx                 # 상단 타이틀/요약 영역 (있을 경우)
├── _[섹션명]-section.tsx     # 각 독립 섹션 컴포넌트
├── _[섹션명]-section.tsx
└── _styles.ts                # 섹션 공통 인라인 스타일 상수
```

### 파일 명명 규칙
- 페이지 내부 파일은 `_` 접두사로 시작 → 외부 라우팅 대상이 아님을 명시
- 섹션 파일은 `-section` 접미사로 끝냄 → 역할 구분 명확화
- `page.tsx`는 단 하나, 나머지는 모두 `_` 접두사

---

## 타입 소유 원칙

### 섹션 파일이 자신의 타입을 정의하고 export한다

```tsx
// _attendance-section.tsx
export type DashboardStudent = { ... }
export type EditableAttendanceCell = { ... }

export function WeeklyAttendanceSection(...) { ... }
```

### page.tsx는 섹션 타입을 import해서 조합한다

```tsx
// page.tsx
import type { DashboardStudent } from "./_attendance-section";
import type { PendingUser } from "./_pending-section";
import type { LocationSetting, TimeSetting } from "./_settings-section";

type PageData = {
  students: DashboardStudent[];
  pending_deletion: PendingUser[];
  location_setting: LocationSetting | null;
  ...
};
```

### 타입 파일 분리 기준

| 위치 | 기준 |
|------|------|
| 섹션 파일 내부 | 해당 섹션에서만 쓰이는 타입 |
| `page.tsx` 상단 | 여러 섹션을 조합하는 페이지 전용 타입 (ex. API 응답 전체) |
| `types/` 폴더 | **여러 페이지**에서 공통으로 쓰이는 타입만 |

→ `_types.ts` 같은 페이지 전용 타입 모음 파일은 만들지 않는다.

---

## 상태(State) 관리 원칙

### 각 섹션이 자신의 상태를 직접 관리한다

```tsx
// _settings-section.tsx 내부
function LocationSettingCard({ setting, authFetch, onRefresh }) {
  const [locName, setLocName] = useState(setting?.name ?? "");
  const [locMsg, setLocMsg] = useState("");
  // 위치 정보 가져오는 로직도 여기에
  function handleSetLocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => { ... });
  }
}
```

### page.tsx에는 최소한만 남긴다

page.tsx가 관리하는 것:
- 페이지 레벨 데이터 fetch (`authFetch`, `useCallback`)
- 공통 필터 값 (`grade`, `classGroup` 등)
- 인증/라우팅 처리
- 섹션 간 공유가 필요한 상태만

page.tsx가 관리하지 않는 것:
- 각 섹션 내부 UI 상태 (모달 열림/닫힘, 입력값 등)
- 특정 섹션에서만 쓰는 핸들러
- geolocation, 시간 설정 등 도메인 특화 로직

### 핸들러 위치 기준

```
해당 데이터/UI가 있는 섹션 파일에 핸들러를 둔다.

삭제 확인 팝업 → 삭제 관련 섹션
위치 설정 → LocationSettingCard 내부
시간 저장 → TimeSettingCard 내부
```

단, 여러 섹션에 영향을 주는 액션 (ex. 학생 삭제 후 전체 refresh)은 page.tsx에 두고 prop으로 내려보낸다.

---

## 컴포넌트 추출 기준

### 같은 파일 내 반복 UI → 파일 내부 컴포넌트로 추출

```tsx
// _attendance-section.tsx 내부에서만 쓰이는 컴포넌트들
function AttBadge({ status, times, ... }) { ... }
function ProgressBar({ value, total, color }) { ... }
function StudentNameBadge({ name, studentId }) { ... }

// 외부로 export하지 않음
```

### 여러 페이지에서 쓰일 경우에만 components/ 폴더로 분리

```
components/ui/Badge.tsx       ← 여러 페이지에서 공통 사용
components/ui/ProgressBar.tsx ← 여러 페이지에서 공통 사용
```

→ 단 하나의 페이지에서만 쓰이면 해당 섹션 파일 내에 두고 export하지 않는다.

---

## 상수 처리

### 반복되는 옵션/값 → constants/ 폴더

```ts
// constants/enums.ts
export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "present", label: "출석" },
  { value: "late",    label: "지각" },
  { value: "absent",  label: "결석" },
  { value: "leave",   label: "조퇴" },
] as const;
```

### 인라인 스타일 상수 → _styles.ts

```ts
// _styles.ts
export const sectionCardStyle: React.CSSProperties = {
  borderRadius: 20,
  background: "#fff",
  border: "1px solid #eaecf0",
  overflow: "hidden",
};
```

---

## page.tsx 최종 형태 (템플릿)

```tsx
"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useAuthFetch } from "@/lib/use-auth-fetch";
import { Routes } from "@/constants/enums";
import { useRouter } from "next/navigation";

// 섹션 컴포넌트
import { SectionA } from "./_a-section";
import { SectionB } from "./_b-section";

// 섹션이 소유한 타입만 import
import type { TypeFromA } from "./_a-section";
import type { TypeFromB } from "./_b-section";

// 이 페이지 API 응답 전체 타입 (page.tsx에서만 쓰임)
type PageData = {
  items_a: TypeFromA[];
  items_b: TypeFromB[];
};

export default function SomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const authFetch = useAuthFetch();

  // 페이지 레벨 상태만
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  // 인증/라우팅
  useEffect(() => {
    if (status === "unauthenticated") router.replace(Routes.ROOT);
  }, [status, router]);

  // 데이터 fetch
  const fetchData = useCallback(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    authFetch(`${Routes.SOME}/api/`)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [status, authFetch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (status === "loading") return null;

  return (
    <div>
      <SectionA
        loading={loading}
        items={data?.items_a ?? []}
        authFetch={authFetch}
        onRefresh={fetchData}
      />
      <SectionB
        items={data?.items_b ?? []}
        onRefresh={fetchData}
      />
    </div>
  );
}
```

---

## 체크리스트

새 페이지 만들 때 또는 기존 페이지 리팩토링 시 확인:

- [ ] 섹션 파일명은 `_[이름]-section.tsx` 형태인가
- [ ] 각 섹션이 자신의 타입을 export하고 있는가
- [ ] page.tsx에 섹션 내부 useState가 없는가
- [ ] 특정 섹션 전용 핸들러가 page.tsx에 없는가
- [ ] `_types.ts` 같은 별도 타입 모음 파일을 만들지 않았는가
- [ ] 단일 섹션에서만 쓰이는 컴포넌트는 export하지 않았는가
- [ ] 반복되는 옵션 배열은 constants/로 뺐는가
