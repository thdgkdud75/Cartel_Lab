# 브랜치 전환 시 잔여 폴더 정리 가이드

> AI 도구(Claude 등) 참고용 문서입니다.
> develop → refact_front_to_nextjs 전환 시 반드시 이 문서를 참고하세요.

---

## 왜 이 문제가 발생하는가

`develop` 브랜치는 Django 앱들이 **루트에 바로 위치**하는 구조입니다.
`refact_front_to_nextjs` 브랜치는 이를 **`Back-end/` 안으로 이동**한 구조입니다.

git은 브랜치 전환 시 **추적 중인 파일만** 제거/복원합니다.
`node_modules/`, `.expo/`, `venv/` 같이 `.gitignore`에 등록된 폴더는 건드리지 않기 때문에,
develop에서 작업하던 폴더들이 브랜치 전환 후에도 **그대로 남습니다.**

---

## develop 브랜치 루트 구조 (전환 전)

```
team_lab/
├── attendance/
├── blog/
├── certifications/
├── config/
├── contests/
├── dashboard/
├── db_schema_v1.sql
├── docker-compose.yml      ← develop용 (덮어씌워질 수 있음)
├── docker-compose.override.yml
├── Dockerfile              ← develop용 (Back-end용 단독)
├── entrypoint.sh
├── images/
├── jobs/
├── manage.py
├── planner/
├── quiz/
├── railway.toml
├── requirements.txt
├── seats/
├── static/
├── templates/
├── timetable/
├── users/
├── app/                    ← React Native (gitignore 잔여물 위험)
└── venv/                   ← gitignore 잔여물 위험
```

---

## refact_front_to_nextjs 브랜치 루트 구조 (전환 후 정상)

```
team_lab/
├── Back-end/               ← Django 앱 전체
├── Mobile/                 ← React Native
├── front-end/              ← Next.js (신규)
├── docker-compose.yml      ← 전체 스택용
└── docs/
```

---

## 전환 후 정리해야 할 잔여 폴더/파일

브랜치 전환 후 아래 항목이 루트에 남아있다면 삭제하세요.

```bash
rm -rf attendance blog certifications config contests dashboard \
       jobs planner quiz seats timetable users \
       templates static images \
       app venv \
       manage.py db_schema_v1.sql entrypoint.sh railway.toml requirements.txt \
       Dockerfile docker-compose.override.yml
```

> `docker-compose.yml`은 이 브랜치 것으로 덮어써지므로 별도 삭제 불필요.
> `.env`는 건드리지 마세요.

---

## 정리 후 확인

```bash
git status
# 결과: nothing to commit, working tree clean
# 이 상태여야 정상입니다.

ls
# 결과: Back-end  Mobile  front-end  docs  docker-compose.yml  README.md
```
