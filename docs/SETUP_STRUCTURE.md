# Team Lab Django Base Structure

## 1) 현재 생성된 프로젝트 구조

```text
team_lab/
├── config/                 # Django 전역 설정 프로젝트
│   ├── __init__.py         # PyMySQL을 MySQL 드라이버로 등록
│   ├── settings.py         # 앱 등록, DB, 시간대/언어 등 전역 설정
│   └── urls.py             # 전체 URL 라우팅
├── users/                  # 회원가입/로그인/권한 관리 앱
├── attendance/             # 출결(입실/퇴실/상태) 앱
├── planner/                # 주간 계획표/학업 계획 앱
├── seats/                  # 자리 이미지/자리 비움 상태 앱
├── manage.py               # Django 관리 명령 진입점
├── templates/              # 공통/앱 템플릿
│   ├── base.html           # 공통 레이아웃(헤더/푸터 포함)
│   ├── components/
│   │   ├── header.html     # 공통 헤더 분리 파일
│   │   └── footer.html     # 공통 푸터 분리 파일
│   ├── users/
│   ├── attendance/
│   ├── planner/
│   └── seats/
├── requirements.txt        # 의존성 고정 버전 목록
├── .env.example            # DB 환경변수 예시 파일
└── SETUP_STRUCTURE.md      # 이 문서
```

## 2) 각 앱이 하는 역할

### `users`
- 회원가입/로그인/로그아웃
- 사용자 프로필(학번, 이름, 전공 등)
- 권한 분리(학생, 관리자, 조교 등)

### `attendance`
- 실시간 출결 이벤트 기록(입실/퇴실)
- 현재 상태(재실/자리비움) 계산
- 날짜별 출결 히스토리 조회

### `planner`
- 주간 계획표 CRUD
- 학교 시간표와 개인 계획 연동
- 계획 대비 실적 체크 기능 확장 가능

### `seats`
- 자리 배치도(이미지 또는 좌석 좌표) 관리
- 사용자-좌석 매핑
- 출결 상태 기반 자리비움 표시

## 3) 전역 설정(`config`) 역할

- `settings.py`
  - `INSTALLED_APPS`에 4개 도메인 앱 등록
  - `.env` 기반 DB 설정 지원
  - 한국어/서울 시간대로 기본 설정
- `urls.py`
  - `/users/`, `/attendance/`, `/planner/`, `/seats/` 라우팅 연결
- `__init__.py`
  - PyMySQL을 Django MySQL 드라이버로 사용하도록 설정

## 4) 팀원 3명 기준 작업 분배 예시

1. 팀원 A: `users` + 인증/권한
2. 팀원 B: `attendance` + `seats` 실시간 상태 로직
3. 팀원 C: `planner` + 학교 시간표 연동 + 전체 통합 테스트

## 5) 다음 개발 시작 순서(추천)

1. 사용자 모델 확장(학번/역할 필드) 또는 커스텀 User 도입 결정
2. `attendance` 모델 설계(이벤트 로그 방식)
3. `seats` 모델 설계(좌석, 배치도, 상태)
4. `planner` 모델 설계(주간계획, 시간표)
5. API/화면 연결 및 권한 정책 적용
