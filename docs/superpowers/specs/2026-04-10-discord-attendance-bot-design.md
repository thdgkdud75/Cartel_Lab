# 디스코드 출결 봇 설계서

## 개요

디스코드 봇을 통해 팀원들의 출결/퇴실/결석을 처리하고, 정해진 시간에 알림을 전송하는 시스템.
기존 Django 출결 시스템(`AttendanceRecord`)에 직접 연동한다.

## 아키텍처

- **실행 방식**: Django management command (`python manage.py run_discord_bot`)
- **라이브러리**: `discord.py`
- **기존 시스템 연동**: Django ORM으로 `AttendanceRecord`, `User`, `Timetable`, `AttendanceTimeSetting` 직접 접근
- **위치 검증**: 디스코드 출결은 위치 검증 생략 (매핑된 유저 전원)

## 유저 매핑

- `User` 모델에 `discord_id` 필드 추가 (CharField, max_length=20, null=True, blank=True)
- 관리자가 웹(admin 또는 기존 관리 페이지)에서 설정
- `discord_id`가 없는 유저의 메시지는 무시

## 명령어

특정 채널(`DISCORD_CHANNEL_ID`)에서만 동작한다.

| 입력 | 동작 | 첫 응답 | 중복 시 |
|------|------|---------|---------|
| `ㅊㅅ` / `출석` / `ㅊㄱ` | 출석 (check_in) | ✅ 리액션 | "이미 출결됐어요 그만해" |
| `ㅌㅅ` / `퇴실` / `ㅌㄱ` | 퇴실 (check_out) | ✅ 리액션 | "이미 퇴실했어요 그만해" |
| `ㄲㅈ` / `꺼져` / `ㄱㅈ` | 결석 (absent) | ✅ 리액션 | "이미 처리됐어요 그만해" |

### 출결 처리 로직

- **출석**: `AttendanceRecord` 생성, `check_in_at` = 현재 시간, `status`는 `AttendanceTimeSetting.check_in_deadline` 기준으로 `present`/`late` 자동 판정
- **퇴실**: 기존 레코드의 `check_out_at` = 현재 시간, `AttendanceTimeSetting.check_out_minimum` 이전이면 `status='leave'`
- **결석**: `AttendanceRecord` 생성, `status='absent'`

## 알림 스케줄

`discord.ext.tasks` 루프를 사용한 스케줄링.

### 기본 (A반)

| 시간 | 대상 | 내용 |
|------|------|------|
| 10:00 | `@everyone` | 출결 알림 |
| 10:30 | 미출결자 개별 멘션 | 리마인드 |
| 20:00 | `@everyone` | 퇴실 알림 |

### B반 목요일 예외

- B반 유저(`User` 모델의 반 구분 필드 참조)는 목요일에 시간표 데이터에서 첫 수업 시작 시간을 조회
- 해당 시간 기준으로 출결 알림 전송
- 리마인드는 알림 30분 후

### 미출결자 판정

DB에서 당일 `AttendanceRecord`를 조회하여:
- `ㅊㅅ`(디스코드) 또는 웹/앱 출결 완료자 제외
- `ㄲㅈ`(결석) 처리자 제외
- 나머지 매핑된 유저에게 멘션 리마인드

## 설정

### 환경 변수 (`.env`)

```
DISCORD_BOT_TOKEN=<봇 토큰>
DISCORD_CHANNEL_ID=<출결 채널 ID>
```

### Django settings.py

```python
DISCORD_BOT_TOKEN = os.environ.get('DISCORD_BOT_TOKEN')
DISCORD_CHANNEL_ID = os.environ.get('DISCORD_CHANNEL_ID')
```

## 파일 구조

```
Back-end/attendance/
├── management/commands/
│   ├── auto_check_out.py       (기존)
│   └── run_discord_bot.py      (신규 - management command 진입점)
├── discord_bot.py               (신규 - 봇 로직, 명령어, 스케줄러)
├── models.py                    (수정 - User에 discord_id 필드 추가)
```

## 배포

- `requirements.txt`에 `discord.py` 추가
- `docker-compose.yml`에 봇 실행 서비스 추가:
  ```yaml
  discord_bot:
    build: ./Back-end
    command: python manage.py run_discord_bot
    env_file: .env
    depends_on:
      - db
  ```

## 범위 외 (향후 추가 가능)

- 디스코드에서 출결 현황 조회 명령어
- 관리자 전용 디스코드 명령어 (강제 출결/퇴실)
- 주간/월간 출결 통계 디스코드 알림
