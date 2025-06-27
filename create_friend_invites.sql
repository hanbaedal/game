-- 친구 초대 테이블 생성
CREATE TABLE IF NOT EXISTS friend_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    invite_date DATETIME NOT NULL,
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_phone_number ON friend_invites(phone_number);
CREATE INDEX idx_invite_date ON friend_invites(invite_date);
CREATE INDEX idx_status ON friend_invites(status);

-- 테이블 설명
COMMENT ON TABLE friend_invites IS '친구 초대 정보를 저장하는 테이블';
COMMENT ON COLUMN friend_invites.id IS '고유 식별자';
COMMENT ON COLUMN friend_invites.phone_number IS '초대된 친구의 전화번호';
COMMENT ON COLUMN friend_invites.invite_date IS '초대 날짜와 시간';
COMMENT ON COLUMN friend_invites.status IS '초대 상태 (대기중/완료)';
COMMENT ON COLUMN friend_invites.created_at IS '레코드 생성 시간'; 