-- 사용자의 현재 포인트 조회
SELECT points FROM users WHERE user_id = '사용자아이디';

-- 배팅 시 포인트 차감
UPDATE users 
SET points = points - 배팅금액 
WHERE user_id = '사용자아이디';

-- 승리 시 포인트 증가
UPDATE users 
SET points = points + 획득포인트 
WHERE user_id = '사용자아이디';

-- 게임 기록 추가
INSERT INTO game_records (
    user_id, 
    team, 
    game_type, 
    betting_type, 
    betting_points, 
    winning_points,
    total_points
) VALUES (
    '사용자아이디',
    '팀코드',
    '게임유형',
    '배팅유형',
    배팅금액,
    획득포인트,
    최종포인트
);

-- 출석 포인트 지급
UPDATE users 
SET points = points + 출석포인트 
WHERE user_id = '사용자아이디';

-- 이벤트 포인트 지급
UPDATE users 
SET points = points + 이벤트포인트 
WHERE user_id = '사용자아이디';

-- 포인트 충전
UPDATE users 
SET points = points + 충전금액 
WHERE user_id = '사용자아이디';

-- 기부 포인트 차감
UPDATE users 
SET points = points - 기부금액 
WHERE user_id = '사용자아이디'; 