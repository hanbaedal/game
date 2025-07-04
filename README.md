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

## Render 배포 가이드

### 1. Render 계정 생성
   - [Render](https://render.com)에서 계정을 생성하세요.

### 2. GitHub 저장소 준비
- 현재 프로젝트를 GitHub 저장소에 업로드하세요.
- 또는 기존 저장소를 사용하세요.

### 3. Render에서 새 Web Service 생성
1. Render Dashboard에서 "New +" → "Web Service" 클릭
2. GitHub 저장소 연결
3. 다음 설정으로 구성:
   - **Name**: `member-management-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 4. 환경 변수 설정
Render 대시보드의 "Environment" 탭에서 다음 변수들을 설정하세요:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority
```

**MongoDB Atlas 설정:**
1. [MongoDB Atlas](https://cloud.mongodb.com)에서 데이터베이스 생성
2. Network Access에서 `0.0.0.0/0` 추가 (모든 IP 허용)
3. Database Access에서 사용자 생성
4. 연결 문자열 복사하여 `MONGODB_URI`에 설정

### 5. 배포 확인
- 배포가 완료되면 제공된 URL로 접속
- 애플리케이션이 정상 작동하는지 확인

## 로컬 개발

### 환경 설정
1. `.env` 파일 생성:
```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/member-management
PORT=3000
```

2. 의존성 설치:
```bash
npm install
```

3. 서버 실행:
```bash
npm start
```

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

## 라이선스

ISC License 
