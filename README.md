# Team Lab

Django 기반 팀 프로젝트입니다.

## 프로젝트 역할 분담 (3인)

### 유현기
- 위치데이터 기반 출결
- 출결 달성률

### 조우진
- 주간계획
- 개인목표 리스트

### 황현준
- 회원가입 및 로그인
- 학과 시간표 등록
- 시험/자격증 D-day 캘린더

## 이후 확장 기능
- 사람인/당근 등 최근 일자리 정보 검색 결과 100개 조회
- AI 기반 이력서 매칭 기능 추가

## 일자리 정보 패치 정책
- 최근 일자리 정보는 `주 1회` 패치 방식으로 운영
- 소스별 활성 공고는 최신 기준 `300건` 유지 (`saramin`, `wanted`)
- 설정 파일: `.env`의 `JOB_ACTIVE_LIMIT_PER_SOURCE`, `JOB_ACTIVE_SOURCES`
- 활성 건수 정리 명령:
```bash
python manage.py enforce_job_active_limit
```

## 패키지 설치 후 requirements 반영
팀원이 로컬에서 새 패키지를 설치했다면 아래 순서로 `requirements.txt`에 반영합니다.

## 1. 프로젝트 이동
```bash
cd team_lab
```

## 2. 가상환경(venv) 생성
처음 한 번만 실행합니다.
macOS / Linux:
```bash
python3 -m venv venv
```

Windows (PowerShell):
```powershell
python -m venv venv
```

## 3. 가상환경 활성화
macOS / Linux:
```bash
source venv/bin/activate
```

Windows (PowerShell):
```powershell
.\venv\Scripts\Activate.ps1
```

Windows (CMD):
```cmd
venv\Scripts\activate.bat
```

## 4. 의존성 설치
macOS / Linux:
```bash
pip install -r requirements.txt
```

Windows (PowerShell/CMD):
```powershell
pip install -r requirements.txt
```

# 라이브러리 설치 시 해야할 행동
1. 패키지 설치
```bash
pip install <패키지명>
```

2. 동결 파일 갱신
```bash
pip freeze > requirements.txt
```


## 5. Django 점검 및 DB 반영
모델을 추가하거나 수정했으면 아래 `makemigrations`, `migrate`를 다시 실행해야 합니다.

macOS / Linux:
```bash
python manage.py check
python manage.py makemigrations
python manage.py migrate
```

Windows (PowerShell/CMD):
```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
```

예시:
- 회원가입/로그인처럼 사용자 모델이 바뀐 경우에도 반드시 `python manage.py makemigrations` 후 `python manage.py migrate`를 실행합니다.

## 6. 서버 실행
macOS / Linux:
```bash
python manage.py runserver
```

Windows (PowerShell/CMD):
```powershell
python manage.py runserver
```

브라우저 접속:
- `http://127.0.0.1:8000/`

## 7. 작업 종료
macOS / Linux:
```bash
deactivate
```

Windows (PowerShell/CMD):
```powershell
deactivate
```

## 참고
- 이미 `venv` 폴더가 있으면 `2번(가상환경 생성)`은 생략하고 `3번`부터 진행하면 됩니다.
- Windows PowerShell에서 실행 정책 에러가 나면 관리자 권한 PowerShell에서 아래 1회 실행 후 다시 활성화하세요.
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## DB Guide
- Team MySQL setup: `DB_MYSQL_SETUP.md`
