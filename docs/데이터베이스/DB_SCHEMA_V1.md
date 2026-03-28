# Team Lab DB 스키마 v1

신입 3명이 병렬 개발할 수 있도록 만든 최소 코어 스키마입니다.

## 1) 설계 원칙
- 사용자 식별은 `학번(student_id)` 중심으로 단순화
- 기능별 테이블은 모두 `users_user.id`를 참조
- v1은 "돌아가는 최소 구조"만 포함하고, 확장은 마이그레이션 PR로 진행

## 2) 테이블 목록
- `users_user`: 사용자
- `attendance_record`: 출결 기록
- `planner_weekly_plan`: 주간 계획 헤더
- `planner_weekly_plan_item`: 주간 계획 항목
- `planner_personal_goal`: 개인 목표
- `seats_seat`: 좌석 마스터
- `seats_assignment`: 좌석 배정 이력

## 3) ERD 관계 요약
- `users_user (1) -> (N) attendance_record`
- `users_user (1) -> (N) planner_weekly_plan`
- `planner_weekly_plan (1) -> (N) planner_weekly_plan_item`
- `users_user (1) -> (N) planner_personal_goal`
- `seats_seat (1) -> (N) seats_assignment`
- `users_user (1) -> (N) seats_assignment`

## 4) 상세 스키마

### 4.1 users_user
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| student_id | VARCHAR(20) | UNIQUE, NOT NULL |
| name | VARCHAR(50) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, 기본값 `student` |
| last_login_at | DATETIME | NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `uq_users_user_student_id` (unique)

### 4.2 attendance_record
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK -> users_user.id, NOT NULL |
| attendance_date | DATE | NOT NULL |
| status | VARCHAR(20) | NOT NULL (`present`,`late`,`absent`,`leave`) |
| check_in_at | DATETIME | NULL |
| check_out_at | DATETIME | NULL |
| note | VARCHAR(255) | NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `idx_attendance_user_date` (`user_id`, `attendance_date`)
- `uq_attendance_user_date` (`user_id`, `attendance_date`) unique

### 4.3 planner_weekly_plan
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK -> users_user.id, NOT NULL |
| week_start_date | DATE | NOT NULL |
| title | VARCHAR(100) | NOT NULL |
| memo | TEXT | NULL |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `uq_weekly_plan_user_week` (`user_id`, `week_start_date`) unique

### 4.4 planner_weekly_plan_item
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| weekly_plan_id | BIGINT | FK -> planner_weekly_plan.id, NOT NULL |
| content | VARCHAR(255) | NOT NULL |
| priority | SMALLINT | NOT NULL, 기본값 3 |
| is_done | BOOLEAN | NOT NULL, 기본값 false |
| due_date | DATE | NULL |
| sort_order | INT | NOT NULL, 기본값 0 |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `idx_weekly_item_plan_order` (`weekly_plan_id`, `sort_order`)

### 4.5 planner_personal_goal
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | FK -> users_user.id, NOT NULL |
| title | VARCHAR(100) | NOT NULL |
| description | TEXT | NULL |
| target_date | DATE | NULL |
| status | VARCHAR(20) | NOT NULL (`active`,`done`,`hold`) |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `idx_goal_user_status` (`user_id`, `status`)

### 4.6 seats_seat
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| seat_code | VARCHAR(30) | UNIQUE, NOT NULL (예: A-01) |
| x | INT | NULL |
| y | INT | NULL |
| is_active | BOOLEAN | NOT NULL, 기본값 true |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

### 4.7 seats_assignment
| 컬럼 | 타입 | 제약 |
|---|---|---|
| id | BIGINT | PK |
| seat_id | BIGINT | FK -> seats_seat.id, NOT NULL |
| user_id | BIGINT | FK -> users_user.id, NOT NULL |
| assigned_from | DATETIME | NOT NULL |
| assigned_to | DATETIME | NULL |
| is_current | BOOLEAN | NOT NULL, 기본값 true |
| created_at | DATETIME | NOT NULL |
| updated_at | DATETIME | NOT NULL |

인덱스:
- `idx_assignment_current` (`seat_id`, `is_current`)
- `idx_assignment_user_current` (`user_id`, `is_current`)

규칙:
- 좌석별 현재 배정은 1건만 허용 (`seat_id` + `is_current=true` 기준 서비스 로직에서 보장)

## 5) 페이지별 담당 연결 예시
- 신입1(인증): `users_user`
- 신입2(출결): `attendance_record` + users 참조
- 신입3(계획/좌석): `planner_*`, `seats_*` + users 참조

## 6) 추후 확장(v2)
- 권한 테이블 분리(`roles`, `user_roles`)
- 출결 이벤트 로그 분리(`attendance_event`)
- 좌석 예약/충돌 방지 정책 고도화
