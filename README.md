# Member Management System

Node.js와 MongoDB를 사용한 회원 관리 시스템입니다.

## 기능

- 회원가입 및 로그인
- 회원 정보 관리
- 포인트 시스템
- 출석체크 (100포인트 적립)
- 친구 초대 시스템
- 게임 기록 관리
- 게시판

## 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Deployment**: Render

## Render 배포 환경 전용

### 배포 정보
- **배포 플랫폼**: Render
- **환경**: Production Only
- **로컬 테스트**: 지원하지 않음
- **포트**: Render 자동 할당

### 배포 상태
- ✅ MongoDB 연결됨
- ✅ daily-games 컬렉션 사용
- ✅ 실시간 경기 데이터 로드
- ✅ 배팅 시스템 활성화

### 환경 변수 (Render에서 자동 설정)
```
MONGODB_URI=mongodb+srv://ppadun_user:ppadun8267@member-management.bppicvz.mongodb.net/?retryWrites=true&w=majority&appName=member-management
NODE_ENV=production
PORT=10000
DEPLOYMENT_ENV=production
```

### 배포 확인
- 배포 URL: `https://game-bowo.onrender.com`
- 헬스체크: `https://game-bowo.onrender.com/health`
- 메인 페이지: `https://game-bowo.onrender.com/index.html`

## API 엔드포인트

### 인증
- `POST /api/users` - 회원가입
- `POST /api/login` - 로그인
- `POST /api/check-id` - ID 중복 확인

### 회원 관리
- `GET /api/users/:userId` - 회원 정보 조회
- `PUT /api/users/:userId` - 회원 정보 수정

### 출석체크
- `POST /api/attendance` - 출석체크 (100포인트 적립)
- `GET /api/attendance/:userId` - 출석 기록 조회

### 친구 초대
- `POST /api/invite/send-code` - 초대 코드 발송
- `POST /api/invite/verify-code` - 초대 코드 확인
- `GET /api/invite/check-phone/:phone` - 전화번호 중복 확인

### 게임 기록
- `POST /api/game-records` - 게임 기록 저장
- `GET /api/game-records` - 모든 게임 기록 조회
- `GET /api/game-records/:userId` - 사용자별 게임 기록 조회

### 포인트 충전
- `POST /api/charge` - 포인트 충전

### 게시판
- `POST /api/board` - 게시글 작성
- `GET /api/board` - 게시글 목록 조회

### 배팅 시스템
- `POST /api/betting/bet` - 배팅 참여
- `GET /api/betting/results` - 배팅 결과 조회

## 라이선스

ISC License 
