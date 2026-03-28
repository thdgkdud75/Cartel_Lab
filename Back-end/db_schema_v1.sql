-- Team Lab DB Schema v1 (MySQL 8+ 기준)
-- SQLite 개발 환경에서는 Django migration으로 동일 구조를 생성하는 것을 권장합니다.

CREATE TABLE users_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE attendance_record (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    check_in_at DATETIME NULL,
    check_out_at DATETIME NULL,
    note VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_user
        FOREIGN KEY (user_id) REFERENCES users_user(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_attendance_user_date
        UNIQUE (user_id, attendance_date)
);

CREATE INDEX idx_attendance_user_date
    ON attendance_record (user_id, attendance_date);

CREATE TABLE planner_weekly_plan (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    week_start_date DATE NOT NULL,
    title VARCHAR(100) NOT NULL,
    memo TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_weekly_plan_user
        FOREIGN KEY (user_id) REFERENCES users_user(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT uq_weekly_plan_user_week
        UNIQUE (user_id, week_start_date)
);

CREATE TABLE planner_weekly_plan_item (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    weekly_plan_id BIGINT NOT NULL,
    content VARCHAR(255) NOT NULL,
    priority SMALLINT NOT NULL DEFAULT 3,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATE NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_weekly_item_plan
        FOREIGN KEY (weekly_plan_id) REFERENCES planner_weekly_plan(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_weekly_item_plan_order
    ON planner_weekly_plan_item (weekly_plan_id, sort_order);

CREATE TABLE planner_personal_goal (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NULL,
    target_date DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goal_user
        FOREIGN KEY (user_id) REFERENCES users_user(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_goal_user_status
    ON planner_personal_goal (user_id, status);

CREATE TABLE seats_seat (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    seat_code VARCHAR(30) NOT NULL UNIQUE,
    x INT NULL,
    y INT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE seats_assignment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    seat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    assigned_from DATETIME NOT NULL,
    assigned_to DATETIME NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignment_seat
        FOREIGN KEY (seat_id) REFERENCES seats_seat(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assignment_user
        FOREIGN KEY (user_id) REFERENCES users_user(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_assignment_current
    ON seats_assignment (seat_id, is_current);

CREATE INDEX idx_assignment_user_current
    ON seats_assignment (user_id, is_current);
