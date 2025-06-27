-- 아이디 중복 확인 쿼리
SELECT COUNT(*) as count 
FROM users 
WHERE user_id = '입력한아이디';

-- 실제 사용 예시:
-- 1. 중복 확인
SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE user_id = '입력한아이디') 
    THEN '이미 사용 중인 아이디입니다.'
    ELSE '사용 가능한 아이디입니다.'
END as result;

-- 2. 아이디 유효성 검사 (길이 제한: 4~16자)
SELECT CASE
    WHEN LENGTH('입력한아이디') < 4 THEN '아이디는 4자 이상이어야 합니다.'
    WHEN LENGTH('입력한아이디') > 16 THEN '아이디는 16자 이하여야 합니다.'
    WHEN '입력한아이디' REGEXP '[^a-zA-Z0-9]' THEN '아이디는 영문자와 숫자만 사용 가능합니다.'
    WHEN EXISTS (SELECT 1 FROM users WHERE user_id = '입력한아이디') THEN '이미 사용 중인 아이디입니다.'
    ELSE '사용 가능한 아이디입니다.'
END as result; 