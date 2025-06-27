-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS game_db;

-- 데이터베이스 선택
USE game_db;

-- 사용자 테이블 생성
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    points INT DEFAULT 3000,
    profile_image VARCHAR(255) DEFAULT 'img/default-profile.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 기본 인덱스 생성
CREATE INDEX idx_user_id ON users(user_id);
CREATE INDEX idx_email ON users(email);

-- 게임 기록 및 포인트 내역 테이블 생성
CREATE TABLE IF NOT EXISTS game_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    game_datetime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team VARCHAR(50),
    betting_points INT DEFAULT 0,
    winning_points INT DEFAULT 0,
    donation_points INT DEFAULT 0,
    attendance_points INT DEFAULT 0,
    event_points INT DEFAULT 0,
    charge_points INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_datetime (user_id, game_datetime)
);

-- 게임 기록 테이블 인덱스 생성
CREATE INDEX idx_game_user_id ON game_records(user_id);
CREATE INDEX idx_game_datetime ON game_records(game_datetime);

-- 게임 운영 테이블 생성
CREATE TABLE IF NOT EXISTS game_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_date DATE NOT NULL,
    team1 VARCHAR(50) NOT NULL,
    team2 VARCHAR(50) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    game_result TEXT,
    status ENUM('예정', '진행중', '종료') DEFAULT '예정',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_game_date (game_date),
    INDEX idx_teams (team1, team2)
);

-- 게임 운영 테이블 인덱스 생성
CREATE INDEX idx_game_date ON game_schedule(game_date);
CREATE INDEX idx_teams ON game_schedule(team1, team2);

-- 테이블 설명 (users)
COMMENT ON TABLE users IS '사용자 정보 테이블';
COMMENT ON COLUMN users.id IS '순번';
COMMENT ON COLUMN users.user_id IS '사용자 아이디';
COMMENT ON COLUMN users.password IS '비밀번호';
COMMENT ON COLUMN users.name IS '이름';
COMMENT ON COLUMN users.email IS '이메일';
COMMENT ON COLUMN users.phone IS '전화번호';
COMMENT ON COLUMN users.memo IS '참고사항';
COMMENT ON COLUMN users.points IS '포인트';
COMMENT ON COLUMN users.created_at IS '생성일시';
COMMENT ON COLUMN users.updated_at IS '수정일시';

-- 테이블 설명 (game_records)
COMMENT ON TABLE game_records IS '게임 기록 및 포인트 내역 테이블';
COMMENT ON COLUMN game_records.id IS '순번';
COMMENT ON COLUMN game_records.user_id IS '사용자 아이디';
COMMENT ON COLUMN game_records.game_datetime IS '게임 일시';
COMMENT ON COLUMN game_records.team IS '선택 팀';
COMMENT ON COLUMN game_records.betting_points IS '배팅 포인트';
COMMENT ON COLUMN game_records.winning_points IS '승리 포인트';
COMMENT ON COLUMN game_records.donation_points IS '기부 포인트';
COMMENT ON COLUMN game_records.attendance_points IS '출석 포인트';
COMMENT ON COLUMN game_records.event_points IS '이벤트 포인트';
COMMENT ON COLUMN game_records.charge_points IS '충전 포인트';

-- 게임 운영 테이블 설명
COMMENT ON TABLE game_schedule IS '게임 운영 일정 테이블';
COMMENT ON COLUMN game_schedule.id IS '순번';
COMMENT ON COLUMN game_schedule.game_date IS '경기 일자';
COMMENT ON COLUMN game_schedule.team1 IS '홈팀';
COMMENT ON COLUMN game_schedule.team2 IS '원정팀';
COMMENT ON COLUMN game_schedule.game_type IS '게임 유형';
COMMENT ON COLUMN game_schedule.start_time IS '게임 시작 시간';
COMMENT ON COLUMN game_schedule.end_time IS '게임 종료 시간';
COMMENT ON COLUMN game_schedule.game_result IS '게임 결과';
COMMENT ON COLUMN game_schedule.status IS '게임 상태';
COMMENT ON COLUMN game_schedule.created_at IS '생성일시';
COMMENT ON COLUMN game_schedule.updated_at IS '수정일시'; 