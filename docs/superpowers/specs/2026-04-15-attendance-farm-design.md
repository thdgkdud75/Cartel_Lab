# 출석 농장(Attendance Farm) 설계서

- 작성일: 2026-04-15
- 대상 브랜치/앱: `Back-end/farm/` (신규 Django 앱), `front-end/` (Next.js, 신규 라우트 `/farm`)
- 영감: gitanimals.org
- 한 줄 컨셉: **출석할 때마다 EXP·코인이 쌓이고, 봉투를 열어 동물을 모으고, 농장에서 동물들이 돌아다니는 "내 출석 스티커북 도감".**

---

## 1. 목표와 범위

### 1.1 목표
출결 행위에 **수집·성장·애착**의 동기를 더해 출석률과 체류 시간을 자연스럽게 끌어올리고, 매일 잠깐이라도 시스템에 들어올 이유를 만든다.

### 1.2 v1 범위
- 출석 시 EXP·코인 자동 적립 (체류시간·streak 반영)
- 코인으로 일반 봉투 1종 구입·개봉 → 5종 동물 중 랜덤 획득
- 농장 화면(`/farm`)에서 보유 동물이 자유롭게 거닐고, 클릭 시 간식 주기 / 쓰다듬기 / 정보 보기
- 동물 4단계 진화, 농장 3단계 확장
- 도감(미획득 실루엣 표시)
- 디스코드 봇은 보상 알림만 (조회·개봉은 웹 전용)

### 1.3 v1에서 제외 (v2 이후)
고급 봉투, 호감도 다단계 모션, 친구 농장 방문, 거래/마켓, 합성, 농장 꾸미기 장식 아이템, 농장 5레벨 이상.

---

## 2. 사용자 흐름

```
[출석 체크]  ── 기존 attendance 시스템
       │
       ▼
[보상 적립]  EXP + 코인 + streak 갱신   ← farm/services.py
       │
       ▼
[농장 화면 /farm]
   │
   ├─ 동물들이 천천히 idle wandering
   ├─ 동물 클릭 → 사이드 시트(쓰다듬기 / 간식 / 정보)
   ├─ [봉투 열기]   코인 소비 → 랜덤 동물 획득 → 닉네임 입력 프롬프트
   ├─ [진화 모먼트] 동물 EXP 도달 → 페이지 넘김 연출
   └─ [농장 확장]   누적 EXP 도달 → 슬롯 확장 알림
```

---

## 3. 데이터 모델

신규 Django 앱 **`farm/`**.

### 3.1 마스터 데이터

#### `Species` — 동물 종 (도감 1칸 = 1 Species)
| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| code | str unique | `chick`, `dragon` 등 |
| name | str | 표시명 |
| rarity | enum | `N` / `R` / `SR` / `SSR` |
| description | text | 도감 설명 |
| stages | JSONField | 진화 단계 인라인 (아래 스키마) |

`stages` JSON 스키마 (4단계 고정, 마지막은 `exp_to_next: null`):
```json
[
  {"name": "병아리", "sprite_url": "/sprites/chick_1.png", "exp_to_next": 50},
  {"name": "큰 병아리", "sprite_url": "/sprites/chick_2.png", "exp_to_next": 200},
  {"name": "닭", "sprite_url": "/sprites/chick_3.png", "exp_to_next": 600},
  {"name": "수탉", "sprite_url": "/sprites/chick_4.png", "exp_to_next": null}
]
```

> 별도 `EvolutionStage` 테이블을 두지 않은 이유: 4단계 고정이고 운영 빈도가 낮음. JSON으로 충분하며 조회가 단순해진다.

### 3.2 유저 데이터

#### `UserFarm` — 유저 1:1
| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| user | OneToOne → User | | |
| dex_no | int unique | auto | 도감 번호 (가입순, 사용자에게 노출되는 정체성) |
| level | int | 1 | 농장 레벨 (1~3) |
| display_slots | int | 5 | 화면 동시 표시 한도 |
| coins | int | 0 | 봉투 구입 재화 |
| total_exp | int | 0 | 누적 출석 EXP (농장 레벨업 기준) |
| streak_days | int | 0 | 현재 연속 출석 일수 |
| last_attendance_date | date | null | streak 계산용 (KST) |
| pity_normal | int | 0 | 일반 봉투 천장 카운터 |

> `pity_premium`은 v2에서 추가.

#### `UserAnimal` — 보유 개별 동물
| 필드 | 타입 | 설명 |
|---|---|---|
| id | PK | |
| farm | FK → UserFarm | |
| species | FK → Species | |
| current_stage | int (default 0) | 진화 단계 인덱스 (0-based) |
| exp | int (default 0) | 동물 개별 EXP |
| affection | int (default 0) | 호감도 |
| nickname | str (nullable, max 12) | 사용자 지정 이름 |
| acquired_at | datetime | 획득 시각 |

> v1에선 `is_displayed` 필드 없음. **획득순 최신 N마리(=`display_slots`)가 자동으로 농장에 표시됨.** 토글 UI는 v2.
>
> 인덱스: `(farm, -acquired_at)`.

#### `DailyInteraction` — 일일 상호작용 한도
| 필드 | 타입 | 설명 |
|---|---|---|
| farm | FK → UserFarm | |
| date | date (KST) | |
| pet_count | int | 그날 쓰다듬은 횟수(전체) |
| feed_count | int | 그날 간식 준 횟수(전체) |

> unique together: `(farm, date)`. 동물 단위가 아닌 **농장(=유저) 단위 합산**으로 단순화. 한도는 §4.4 참고.

### 3.3 기존 모델 변경

**`attendance.AttendanceRecord`** (실제 모델명; 기존 brainstorm의 "AttendanceLog"는 오기였음):
- `reward_granted: bool` (default False) 추가
- 마이그레이션과 함께 **기존 레코드는 모두 `True`로 backfill** (소급 보상 X)

---

## 4. 경제 규칙

모든 수치는 `farm/constants.py` 한 곳에 모음.

### 4.1 출석 보상
```
체류분 = (check_out_at - check_in_at).total_minutes()       (정수, 0 미만은 0)
체류 EXP = min(floor(체류분 / 30), 16)                       (8시간 상한)
streak 배수 = 1.0 + min(streak_days, 30) × 0.02              (최대 ×1.6)

총 EXP = round((10 + 체류 EXP) × streak 배수)
코인   = 총 EXP // 2
```

미퇴실(`check_out_at IS NULL`) 상태에서는 **보상 적립을 미룸**. 퇴실 처리(사용자 직접 또는 자동) 시점에만 `grant_attendance_reward` 호출.

### 4.2 streak
- KST 자정 기준 달력일 연속.
- `last_attendance_date == today - 1day` → `streak_days += 1`
- `last_attendance_date == today` → 변동 없음 (이중 적립 방지는 §4.5 멱등성으로)
- 그 외 → `streak_days = 1`로 리셋
- 영업일/공휴일/주말 구분 없음 (단순화 우선; 추후 운영 데이터로 튜닝)

### 4.3 봉투 (v1: 일반 봉투 1종)
- 가격: **30 코인**
- 확률: `N 70% / R 25% / SR 4.5% / SSR 0.5%`
- 천장: 같은 봉투(=일반) **50회 연속 SR 이상 미획득** 시, 다음 개봉의 등급은 **SR 확정**. 이후 카운터 0으로 리셋.
- 등급 결정 후, 해당 등급 내 종은 **균등 추첨**.

### 4.4 일일 상호작용 한도 (농장 단위)
- 간식 주기: **하루 30회** (코인 -2, EXP +5)
- 쓰다듬기: **하루 20회** (호감도 +1, 무료)

> v2에서 동물 단위 한도 도입 검토. v1은 농장 단위로 단순.

### 4.5 진화
- 단계 EXP는 §3.1 `stages[i].exp_to_next` 사용 (4단계 고정 곡선: 50 / 200 / 600 / -)
- `exp >= exp_to_next` 도달 시 자동 진화. 응답에 `events` 포함 (§5.4).

### 4.6 농장 레벨 (3단계로 축소)
| Lv | 필요 누적 EXP | display_slots |
|---|---|---|
| 1 | 0 | 5 |
| 2 | 600 | 10 |
| 3 | 2000 | 15 |

### 4.7 출석 수정/삭제 시 보상 롤백
- `AttendanceRecord` 삭제, 또는 시간(체크인/체크아웃) 변경 시 → `revoke_attendance_reward(record)` 호출.
- 동작:
  1. 해당 레코드 기준으로 적립됐던 EXP·코인 금액을 재계산하여 차감.
  2. `total_exp` 차감 후 농장 레벨 재계산. 레벨이 내려가면 `display_slots`도 재계산.
  3. 코인이 음수가 되면 **0으로 클램프** + 관리자 로그 (`farm/audit_log.py`)에 기록.
  4. `reward_granted = False`로 되돌림.
- streak는 단순 차감 X — 출석 이력 전체를 다시 읽어 재계산.

> 관리자 수동 생성 출결에는 `skip_reward=True` 옵션을 받아 처음부터 보상을 안 줄 수 있음 (어뷰징 방지).

---

## 5. 백엔드 API

### 5.1 출결 통합 (가장 중요)

```python
# farm/services.py

@transaction.atomic
def grant_attendance_reward(user, record) -> RewardResult:
    """
    멱등성 보장 — record.reward_granted == True면 즉시 RewardResult(noop=True) 반환.
    select_for_update로 UserFarm 잠금. EXP·코인 적립, streak 갱신,
    total_exp 누적, 농장 레벨업 체크.
    """

@transaction.atomic
def revoke_attendance_reward(record) -> None:
    """§4.7 동작."""
```

**호출 지점**: `attendance/services.py`의 단일 진입점에서 호출. 모든 출결 경로(개인/전체/관리자/디스코드 봇)는 이 진입점을 통하도록 리팩터.

### 5.2 REST 엔드포인트 (`/api/farm/...`)

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/farm/me` | 내 농장 전체 상태 (UserFarm + 표시 동물 목록 + 오늘 한도 잔여) |
| GET | `/api/farm/animals` | 보유 동물 전체 (도감/리스트용, 페이징) |
| GET | `/api/farm/species` | 도감 마스터 데이터 (Cache-Control 1d) |
| POST | `/api/farm/eggs/draw` | `{egg_type:"normal"}` → 차감·뽑기·동물 생성 |
| POST | `/api/farm/animals/{id}/pet` | 쓰다듬기 |
| POST | `/api/farm/animals/{id}/feed` | 간식 |
| PATCH | `/api/farm/animals/{id}` | nickname 변경 |

### 5.3 에러 코드 (응답 본문 `code`)
- `INSUFFICIENT_COINS`
- `DAILY_LIMIT_PET` / `DAILY_LIMIT_FEED`
- `NOT_OWNER`
- `INVALID_NICKNAME` (길이/금칙어)

### 5.4 `events` 응답 스키마 (공통)
보상·개봉·간식 응답은 모두 마지막에 `events: []`를 동봉. 프론트와 디스코드 봇 모두 동일 포맷 사용.

```json
{
  "events": [
    {"type": "exp_gained", "amount": 18},
    {"type": "coin_gained", "amount": 9},
    {"type": "streak_updated", "days": 7},
    {"type": "evolved", "animal_id": 12, "from_stage": 1, "to_stage": 2},
    {"type": "farm_level_up", "from": 1, "to": 2, "new_slots": 10},
    {"type": "egg_opened", "animal_id": 24, "rarity": "SR", "species_code": "fox"},
    {"type": "pity_triggered", "egg_type": "normal"}
  ]
}
```

### 5.5 디스코드 봇과의 관계
- 봇이 출결을 처리하면 같은 `attendance/services.py`를 거쳐 자동으로 보상 적립.
- 응답 임베드에 보상 표시: `🎉 +18 EXP / +9 🪙 / 🔥 7일째 / 🥚 봉투 1개 받기 가능`
- v1에서 봇은 보상 알림만. 농장 조회·봉투 개봉은 웹 전용.

### 5.6 닉네임 검증
- 1~12자, 공백만 불가, 간단 금칙어 리스트(`farm/profanity.py`).
- 중복 허용 (다른 유저 동물과 같은 이름 OK).

### 5.7 회원 탈퇴
- `UserFarm` cascade 삭제 → `UserAnimal`도 함께 삭제. 별도 보존 없음 (v1).

---

## 6. 프론트엔드 (Next.js)

### 6.1 라우트
- `/farm` — 농장 메인
- 대시보드 위젯 1개 — 농장 미리보기 + 보상 토스트 트리거

### 6.2 화면 구성

```
┌──────────────────────────────────────────────────┐
│  🌱 내 도감 No.142             Lv.2 · 🪙 87       │
│                                                   │
│  ╭───── 농장 일러스트 (계절감) ──────────╮       │
│  │                                       │       │
│  │     🐤      🦊                        │       │
│  │              ✨                       │       │
│  │   🌳   🐉              🪨            │       │
│  │                                       │       │
│  ╰───────────────────────────────────────╯       │
│                                                   │
│  ┌─ 오늘의 기록 (영수증 톤) ─────────────┐       │
│  │  +18 EXP  ·  +9 🪙  ·  🔥 7일째       │       │
│  │  [ 🥚 봉투 열기 ]                     │       │
│  └────────────────────────────────────────┘       │
│                                                   │
│  스티커북 ─────  ⭐⭐⭐◯◯  5/20                  │
└──────────────────────────────────────────────────┘
```

### 6.3 인터랙션
- 동물 idle wandering: 2~5초마다 랜덤 좌표, ease-out-quart, 매우 느린 속도. 가끔 한 마리만 살짝 통통.
- 동물 클릭 → **사이드 시트** 슬라이드인 (모달 X):
  - 🤚 쓰다듬기 (호감도 +1)
  - 🍪 간식 주기 (코인 -2, EXP +5)
  - ℹ️ 정보 (스프라이트 / 이름 + ✏️ / 등급 ⭐ / Lv / EXP 바)
- 봉투 열기: 봉투가 흔들 → 열림 → 카드가 사뿐히 미끄러져 나옴 → **닉네임 입력 프롬프트(스킵 가능)**
- 진화 모먼트: 페이지 넘김 트랜지션 + 잎사귀 그린 반짝 1회.

### 6.4 디자인 톤 — "스티커북 도감"
- 베이스: `#FAFAF7` 페이퍼 화이트 / 다크모드 `#16161A`
- 액센트 4종 (각 컬러는 의미 고정):
  - 🟠 `#FF6B35` 오렌지 — CTA, 진화 모먼트
  - 🌿 `#7BC47F` 그린 — 성장/진화
  - 💛 `#FFD166` 옐로 — 코인/보상
  - 🩷 `#FFB5C5` 핑크 — 호감도/쓰다듬기
- 그라디언트 사용 안 함. 등급은 **별 1~4개**, SSR은 머리 위 작은 빛 입자 1개로 절제 표현.
- 타이포: 본문 Pretendard / 도감 표지·동물 이름은 Serif 1종 (`Source Serif 4`).
- 모션: 모든 모션은 상태 변화 의미. `prefers-reduced-motion` 시 wandering 정지, 클릭 페이드만 유지.

### 6.5 카피 톤
- "먹이주기" → "간식 주기"
- "알 뽑기" → "봉투 열기"
- 미획득 칸: "아직 만나지 못한 친구"
- 보상 토스트: "오늘도 출석! +18 EXP"

### 6.6 성능
- 동시 표시 상한 v1 = 15마리 (Lv3 슬롯)
- 이동은 `transform: translate3d` + `will-change: transform`
- `document.visibilityState === "hidden"` 시 wandering RAF 일시정지

### 6.7 반응형/접근성
- 모바일에서는 농장 영역 세로 스크롤 가능, 동물 터치 영역 최소 44×44
- 색만으로 상태 표시 안 함 (별/숫자/라벨 동반)

---

## 7. 에셋

### 7.1 v1 종 수
- **5종 × 4단계 = 20장 스프라이트** (PNG 또는 SVG)
- 도감엔 미획득 5종도 실루엣 표시 가능하도록 종 데이터는 등록만 해둠 (스프라이트는 v1.1에서 추가)

### 7.2 일러스트 톤
- 둥근 라인 + 단색 채움 + 작은 볼터치
- 픽셀아트 X, 정밀 일러스트 X — **스티커 같은 손그림**
- 농장 배경: 월별 미세 변화 (4월 벚꽃, 12월 눈 등)

### 7.3 조달
- 별도 트랙으로 디자이너/AI 생성 진행 (구현과 병행).
- v1 출시 블로커 — 적어도 5종 × 4단 = 20장과 농장 배경 1장은 필수.

---

## 8. 테스트 전략

### 8.1 단위
- `grant_attendance_reward` 멱등성 (동일 record 두 번 호출해도 1번만 적립)
- streak 계산 (어제/오늘/결석/리셋 케이스)
- 체류 EXP 계산 (0분, 30분, 8시간, 12시간 케이스)
- `revoke_attendance_reward` 차감 + 음수 클램프 + 농장 레벨 다운그레이드
- 일일 한도 초과 시 에러 코드
- 닉네임 검증 (길이/금칙어/공백)

### 8.2 통합
- 4개 출결 경로(개인/전체/관리자/디스코드)에서 보상 적립 회귀 테스트
- 출석 수정/삭제 → 보상 롤백 end-to-end
- TZ 경계: 23:59 퇴실 vs 00:01 퇴실에서 streak가 의도대로 동작

### 8.3 통계
- 봉투 확률 분포: 시드 고정 + **10만 회 시뮬**, ±1% 이내 일치 검증
- 천장 트리거 발동 (50회 연속 N/R 보장)

### 8.4 동시성
- 동일 유저 두 개 세션 동시 봉투 개봉 → 코인 이중 차감 X
- 동일 유저 동시 간식 주기 → 한도 초과 안 됨

---

## 9. 구현 우선순위 (마일스톤)

1. **M1 — 데이터/보상 백본**
   - 모델 마이그레이션, `farm/services.py`, attendance 통합, 멱등성·롤백 테스트
2. **M2 — 봉투/도감 API**
   - 봉투 개봉, 동물 보유 조회, 도감, 닉네임 변경
3. **M3 — 농장 화면 v1**
   - `/farm` 라우트, idle wandering, 사이드 시트 인터랙션, 디자인 토큰 적용
4. **M4 — 봉투/진화 연출**
   - 봉투 개봉 모션, 진화 페이지 넘김, 보상 토스트
5. **M5 — 디스코드 봇 알림 통합**
   - 보상/봉투 가능 임베드 표시
6. **M6 — 운영/에셋 마무리**
   - 5종 스프라이트 적용, 농장 배경, Django admin 운영 페이지

---

## 10. 알려진 결정 사항 / 트레이드오프

- **streak에 영업일 개념 미적용**: 학기·시험기간 패턴 데이터를 수집한 뒤 v2에서 검토.
- **`is_displayed` 토글 미제공**: v1은 획득순 자동 표시. 사용자가 컬렉션 늘면 답답할 수 있으나, UI 단순함 우선.
- **봉투 1종**: 가격대/확률 분리 운영의 데이터가 없을 때 단일 봉투로 시작해 분포 검증 후 고급 봉투 도입.
- **호감도 모션 1단**: 50 도달 시 1종만. 추후 데이터 보고 추가.
- **`EvolutionStage` JSON 인라인**: 4단 고정 전제. 가변 단계가 필요해지면 모델 분리.

---

## 11. 비고

- 디스코드 봇 코드: `Back-end/attendance/discord_bot.py` (276줄, 최근 #discord-bot 커밋).
- 출결 핵심 뷰: `Back-end/attendance/views.py` (735줄, 다수 경로 존재). M1에서 단일 진입점 리팩터 필수.
- 본 설계의 모든 수치는 운영 전 튜닝 대상이며 `farm/constants.py`에서 한 번에 변경 가능해야 한다.
