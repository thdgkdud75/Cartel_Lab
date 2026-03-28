# Front-end

Next.js 기반 프론트엔드 프로젝트입니다.
**TypeScript + Tailwind CSS + Redux + NextAuth** 구성으로 작성합니다.

---

## 폴더 구조

```
front-end/
├── app/                        # 라우팅 및 페이지 (Next.js App Router)
│   ├── layout.tsx              # 공통 레이아웃 (헤더, Provider 등 감싸는 최상위)
│   ├── page.tsx                # 루트 페이지 (/)
│   └── globals.css             # 전역 스타일
│
├── components/                 # 재사용 가능한 UI 컴포넌트
│   ├── ui/                     # 기본 UI 단위 (버튼, 인풋 등)
│   │   ├── button.tsx
│   │   └── input.tsx
│   ├── header/                 # 헤더 관련 컴포넌트
│   │   ├── index.tsx           # 헤더 진입점
│   │   ├── Navbar.tsx          # 네비게이션 바
│   │   └── auth-button.tsx     # 로그인/로그아웃 버튼
│   └── footer/
│       └── index.tsx           # 푸터
│
├── providers/                  # Context Provider 모음
│   ├── ReduxProvider.tsx       # Redux store를 앱 전체에 제공
│   └── NextAuthSessionProvider.tsx  # NextAuth 세션을 앱 전체에 제공
│
├── store/                      # Redux 전역 상태 관리
│   ├── index.ts                # store 설정 및 RootState, AppDispatch 타입 export
│   └── hooks.ts                # useAppDispatch, useAppSelector 커스텀 훅
│
├── server/                     # 서버 액션 (Next.js Server Actions)
│   └── example-action.ts       # 서버 액션 예시
│
├── lib/                        # 유틸리티 함수 모음
│   ├── utils.ts                # cn() - Tailwind 클래스 병합 유틸
│   └── api-client.ts           # Django API 호출 기본 클라이언트
│
├── constants/                  # 상수 및 enum 정의
│   └── enums.ts                # Environments 등 전역 enum
│
├── validations/                # 입력값 유효성 검사 스키마
│   └── auth.ts                 # 로그인/회원가입 유효성 검사
│
├── public/                     # 정적 파일 (빌드 과정 없이 직접 서빙)
│   ├── fonts/                  # 커스텀 폰트
│   ├── icons/                  # 아이콘 파일
│   └── images/                 # 이미지 파일
│
├── components.json             # shadcn/ui 설정 파일
├── next.config.ts              # Next.js 설정
├── tsconfig.json               # TypeScript 설정
├── postcss.config.mjs          # PostCSS (Tailwind) 설정
└── eslint.config.mjs           # ESLint 설정
```

---

## 주요 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| 상태관리 | Redux Toolkit |
| 인증 | NextAuth.js |
| UI 컴포넌트 | shadcn/ui |

---

## 개발 실행

```bash
cd front-end
npm install
npm run dev
```
