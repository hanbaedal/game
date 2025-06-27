# Member Management System

Node.js와 MongoDB를 사용한 회원 관리 시스템입니다.

## 기능

- 회원가입 및 로그인
- 회원 정보 관리
- 포인트 시스템
- 출석체크
- 게임 기록 관리
- 기부 시스템

## 기술 스택

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Frontend**: HTML, CSS, JavaScript, Tailwind CSS
- **Deployment**: Render, CloudType

## 배포 가이드

### Render 배포

1. **Render 계정 생성**
   - [Render](https://render.com)에서 계정을 생성하세요.

2. **새 Web Service 생성**
   - Dashboard에서 "New +" → "Web Service" 클릭
   - Git 저장소 연결: `https://github.com/hanbaedal/game`

3. **환경 변수 설정**
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `MONGODB_USERNAME`: `ppadun9_user`
   - `MONGODB_PASSWORD`: `ppadun8267`
   - `MONGODB_DATABASE`: `member-management`
   - `JWT_SECRET`: 안전한 JWT 시크릿 키

4. **배포 설정**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Node.js Version: `18.x`

### CloudType 배포

1. **CloudType 계정 생성**
   - [CloudType](https://cloudtype.io)에서 계정을 생성하세요.

2. **프로젝트 배포**
   - CloudType 대시보드에서 "New Project" 클릭
   - Git 저장소 연결 또는 ZIP 파일 업로드
   - `cloudtype.yaml` 파일이 자동으로 인식됩니다
   - 환경 변수 설정:
     - `MONGODB_URI`: `mongodb://ppadun9_user:ppadun8267@mongodb:27017/member-management`
     - `MONGODB_USERNAME`: `ppadun9_user`
     - `MONGODB_PASSWORD`: `ppadun8267`
     - `MONGODB_DATABASE`: `member-management`
     - `JWT_SECRET`: 안전한 JWT 시크릿 키
     - `NODE_ENV`: `production`

### 배포 확인
배포가 완료되면 제공된 URL로 접속하여 애플리케이션이 정상 작동하는지 확인하세요.

## API 엔드포인트

### 인증
- `POST /api/users` - 회원가입
- `POST /api/login` - 로그인
- `POST /api/check-id` - ID 중복 확인

### 회원 관리
- `GET /api/users/:userId` - 회원 정보 조회
- `PUT /api/users/:userId` - 회원 정보 수정
- `DELETE /api/users/:userId` - 회원 탈퇴

### 포인트 관리
- `POST /api/charge-points` - 포인트 충전
- `GET /api/points/:userId` - 포인트 조회

### 게임
- `POST /api/betting` - 배팅
- `GET /api/game-records/:userId` - 게임 기록 조회

### 출석체크
- `POST /api/attendance` - 출석체크
- `GET /api/attendance/:userId` - 출석 기록 조회

## 데이터베이스 스키마

### User
```javascript
{
  userId: String,
  password: String,
  name: String,
  email: String,
  phone: String,
  favoriteTeam: String,
  points: Number,
  attendance: [String],
  createdAt: Date
}
```

### Bet
```javascript
{
  userId: String,
  matchId: String,
  gameType: String,
  bettingType: String,
  points: Number,
  status: String,
  winPoints: Number,
  createdAt: Date
}
```

## 라이선스

ISC License 