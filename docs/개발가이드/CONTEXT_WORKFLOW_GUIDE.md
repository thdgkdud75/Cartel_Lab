# Next 전환 작업 컨텍스트 가이드

> `front-end/REFACTOR_GUIDE.md`와 함께 읽는 보조 문서
> `refact_front_to_nextjs` 계열 브랜치에서 이슈를 진행할 때, 구조 외에 무엇을 참고해야 하는지 정리한다.

---

## 이 문서의 역할

`REFACTOR_GUIDE.md`는 페이지 파일 구조를 설명하는 문서다.
이 문서는 그보다 한 단계 위에서 다음을 정리한다.

- 어떤 브랜치 기준으로 작업을 시작할지
- 템플릿, 운영 페이지, API 중 무엇을 우선 기준으로 삼을지
- 프론트/백엔드를 어떻게 분리해서 커밋할지
- PR을 어떤 형식으로 작성할지
- 다음 이슈에서 그대로 재사용할 체크리스트

즉, 이 문서는 **작업 흐름 컨텍스트** 문서다.

---

## 먼저 읽을 문서

프론트 작업이 포함되면 아래 순서로 먼저 확인한다.

1. `AGENTS.md`
2. `.impeccable.md`
3. `front-end/REFACTOR_GUIDE.md`
4. `docs/개발가이드/BRANCH_REFACT_GUIDE.md`
5. 이 문서

역할 분리:

- `AGENTS.md`
  - 프로젝트 디자인 전반 원칙
- `.impeccable.md`
  - 실제 UI 톤, 색, 밀도, 타이포 기준
- `REFACTOR_GUIDE.md`
  - 페이지 파일 분리 규칙
- `BRANCH_REFACT_GUIDE.md`
  - `refact_front_to_nextjs` 브랜치 전환 원칙
- `CONTEXT_WORKFLOW_GUIDE.md`
  - 이슈 시작부터 PR까지의 실전 흐름

---

## 브랜치 시작 기준

기본 원칙:

- 독립 이슈면 `refact_front_to_nextjs`에서 새 브랜치 생성
- 이전 이슈 결과를 직접 재사용해야 하면 직전 이슈 브랜치에서 분기
- stacked PR이 필요하면 base는 직전 브랜치로 잡는다

예시:

- `#43 자리배치`
  - `refact_front_to_nextjs` 기준
- `#44 시간표`
  - `feat/#43-seats` 기준으로 분기
  - PR도 stacked 형태로 생성
- `#45 자격증`
  - 다시 `origin/refact_front_to_nextjs` 기준으로 분기

주의:

- 로컬 `refact_front_to_nextjs`가 원격과 갈라져 있으면 바로 쓰지 말고
  `origin/refact_front_to_nextjs` 기준으로 새 브랜치를 따는 편이 안전하다.

---

## 기준 소스 우선순위

새 페이지를 만들 때는 아래 순서로 기준을 확인한다.

1. 이슈 본문
2. 운영 페이지
3. Django 템플릿
4. 백엔드 API 응답
5. 기존 Next 구현 패턴

판단 원칙:

- 운영 페이지가 있으면 실제 운영 동작을 우선 참고한다
- 템플릿은 UI 구조와 인터랙션 복원의 기준으로 본다
- API는 데이터 누락 여부 확인 기준으로 본다
- 운영과 템플릿이 다르면 왜 다른지 먼저 확인한다

예시:

- `seats`는 운영 페이지를 직접 보고 구조를 맞춤
- `timetable`은 운영 `seats` 모달 안의 시간표 구조를 기준으로 구현
- `certifications`는 운영 페이지와 `/certifications/api/important/` 데이터 둘 다 확인

---

## 데이터 확인 원칙

다음은 반드시 같이 본다.

- 최상위 응답 키
- 아이템 개수
- item 내부 키셋
- 세부 schedule 내부 키셋
- 링크 필드
- 상태 코드 필드
- 상세 모달에서 쓰는 메타 값

중요:

- 화면만 비슷하면 안 된다
- 상세보기에서 쓰는 값까지 빠지면 안 된다
- 빈 배열도 운영이 빈 배열이면 그대로 유지한다

예시:

- `certifications`
  - `generated_at`, `today`, `today_alerts`, `items` 확인
  - `items` 개수 비교
  - `schedules` 내부 상태값(`registration_status`, `exam_status` 등) 비교
- `timetable`
  - 단순 목록이 아니라 `교시 x 요일` 구조인지 확인
  - 연속 교시는 하나의 칸처럼 병합되는지 확인

---

## 프론트 구현 원칙

`REFACTOR_GUIDE.md`를 따른다.

기본 구조:

```text
front-end/app/[page]/
├── page.tsx
├── _hero-section.tsx
├── _[name]-section.tsx
└── _styles.ts
```

추가 원칙:

- `page.tsx`는 fetch, 인증, 공통 상태 조립만 담당
- 섹션 전용 상태는 섹션 파일에 둔다
- 공용 계산 로직은 `constants/`로 빼는 편이 좋다
- 운영 템플릿 JS를 그대로 복붙하지 말고, 필요한 계산만 React 상태로 옮긴다

언제 `constants/`로 빼는가:

- 분기 기준이 반복될 때
- 상태/필터/검색 로직이 길 때
- 운영 데이터 가공 규칙을 여러 섹션이 같이 쓸 때

예시:

- `constants/timetable.ts`
  - 반별 시간표 데이터
  - 병합 계산
- `constants/certifications.ts`
  - 검색/필터/알림/카테고리/상세 표시 계산

---

## 백엔드 구현 원칙

`refact_front_to_nextjs` 계열에서는 Django를 API 서버로 본다.

원칙:

- `render()`보다 JSON 응답 우선
- 기존 HTML 뷰는 필요 시 유지하되, Next에서 쓸 API를 따로 정리
- URL은 `/api/...` 흐름 유지
- 최종적으로 백엔드 변경이 필요 없으면 커밋을 만들지 않는다

예시:

- `#44 시간표`
  - 백엔드 API를 검토했지만 최종적으로 프론트 상수화가 맞아서 백엔드 커밋 없음
- `#45 자격증`
  - `/api/certifications/important/` 와 플래너 연동 API가 필요해서 백엔드 커밋 생성

---

## 커밋 분리 원칙

가능하면 아래 순서를 유지한다.

1. `chore`
2. `backend feat`
3. `frontend feat`
4. 필요 시 `refact`

판단 기준:

- 기능 변경이 아닌 환경 정리는 `chore`
- API, 라우트, 테스트는 `backend`
- 페이지/모달/상수/스타일은 `frontend`
- 기존 페이지 구조를 공용 계산 구조로 바꾸는 경우는 `refact`

예시:

### `#43 자리배치`

- `chore : 로컬 문서 및 codex 파일 gitignore 추가`
- `feat : 좌석 API 구현`
- `feat : 자리배치 페이지 구현`

### `#44 시간표`

- `feat : 시간표 라우트 및 데이터 상수 추가`
- `feat : 시간표 페이지 구현`
- `refact : 자리배치 시간표 모달 구조 개선`

### `#45 자격증`

- `chore : 로컬 작업 파일 gitignore 추가`
- `feat : 자격증 API 및 플래너 연동 구현`
- `feat : 자격증 페이지 구현`

---

## PR 작성 원칙

최근 저장소 패턴을 그대로 따른다.

형식:

```md
closes #이슈번호

## 개요
...

## 백엔드 변경사항
...

## 프론트엔드 변경사항
...

## 기타
...

## 테스트
- [x] ...
- [ ] ...
```

규칙:

- 첫 줄은 `closes #번호`
- 테스트는 실제 수행한 것만 체크
- 못 돌린 테스트는 이유를 함께 적는다
- stacked PR이면 `## 기타`에 명시

---

## 운영 비교 체크리스트

운영 URL이 있으면 아래를 확인한다.

- 비로그인/로그인 분기
- 권한별 버튼 노출
- 상세 모달 구조
- 상태 텍스트
- 데이터 개수
- 상세 항목 누락 여부
- 연속 교시 병합, 필터, 복사 함정 같은 숨은 동작

예시:

- `quiz`
  - 복사 시 다른 값이 들어가는 trap 동작 확인
- `timetable`
  - 연속 교시 병합 여부 확인
- `certifications`
  - 상세 모달에서 사용하는 링크, 일정, 합격률, 응시료, 난이도 값 확인

---

## 작업 중 사용자와 맞출 것

중간에 아래는 바로 확인한다.

- 지금 커밋할지
- 에러부터 볼지
- 브랜치를 새로 딸지
- stacked PR로 갈지
- 운영 기준으로 맞출지 템플릿 기준으로 맞출지

단, 확인 가능한 것은 먼저 직접 조사하고 질문은 최소화한다.

---

## 최종 체크리스트

- [ ] `refact_front_to_nextjs` 기준 브랜치가 맞는가
- [ ] `.impeccable.md`와 `REFACTOR_GUIDE.md`를 먼저 읽었는가
- [ ] 운영/템플릿/API를 모두 비교했는가
- [ ] 상세 데이터까지 누락 없이 옮겼는가
- [ ] 실제 변경 범위대로 커밋을 나눴는가
- [ ] PR 본문을 최근 패턴으로 작성했는가
- [ ] 필요 시 stacked PR 여부를 명시했는가
