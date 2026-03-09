# Team Lab

Django 기반 팀 프로젝트입니다.

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

## 5. Django 점검 및 DB 반영
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
