-- 친구 초대 저장 프로시저
DELIMITER //

-- 새로운 초대 추가
CREATE PROCEDURE sp_add_friend_invite(
    IN p_phone_number VARCHAR(20),
    IN p_invite_date DATETIME
)
BEGIN
    INSERT INTO friend_invites (phone_number, invite_date)
    VALUES (p_phone_number, p_invite_date);
    
    SELECT LAST_INSERT_ID() AS id;
END //

-- 초대 리스트 조회 (페이지네이션)
CREATE PROCEDURE sp_get_friend_invites(
    IN p_page INT,
    IN p_size INT
)
BEGIN
    DECLARE p_offset INT;
    SET p_offset = (p_page - 1) * p_size;
    
    SELECT 
        id,
        phone_number,
        DATE_FORMAT(invite_date, '%Y-%m-%d %H:%i:%s') AS invite_date,
        status,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM friend_invites
    ORDER BY invite_date DESC
    LIMIT p_offset, p_size;
    
    -- 전체 레코드 수 조회
    SELECT COUNT(*) AS total_count FROM friend_invites;
END //

-- 초대 상태 업데이트
CREATE PROCEDURE sp_update_invite_status(
    IN p_id INT,
    IN p_status ENUM('pending', 'completed')
)
BEGIN
    UPDATE friend_invites
    SET status = p_status
    WHERE id = p_id;
    
    SELECT ROW_COUNT() AS affected_rows;
END //

-- 오늘의 초대 리스트 조회
CREATE PROCEDURE sp_get_today_invites()
BEGIN
    SELECT 
        id,
        phone_number,
        DATE_FORMAT(invite_date, '%Y-%m-%d %H:%i:%s') AS invite_date,
        status
    FROM friend_invites
    WHERE DATE(invite_date) = CURDATE()
    ORDER BY invite_date DESC;
END //

DELIMITER ; 