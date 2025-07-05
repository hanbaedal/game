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

### 1. MongoDB Atlas 설정
1. [MongoDB Atlas](https://www.mongodb.com/atlas)에서 계정 생성
2. 새 클러스터 생성 (무료 티어 권장)
3. Database Access에서 사용자 생성
4. Network Access에서 IP 주소 추가 (0.0.0.0/0 - 모든 IP 허용)
5. Connect 버튼 클릭 → "Connect your application" 선택
6. 연결 문자열 복사

### 2. Render 배포 설정
1. [Render](https://render.com)에서 계정 생성
2. "New +" → "Web Service" 클릭
3. GitHub 저장소 연결
4. 다음 설정으로 구성:
   - **Name**: `member-management-system`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. 환경 변수 설정
Render 대시보드의 "Environment" 탭에서 다음 변수들을 설정하세요:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
NODE_ENV=production
PORT=10000
```

### 4. 배포 확인
- 배포가 완료되면 제공된 URL로 접속
- 헬스체크: `https://your-app-name.onrender.com/health`
- 관리자 페이지: `https://your-app-name.onrender.com/admin-games.html`
- 사용자 페이지: `https://your-app-name.onrender.com/index.html`

### 5. 문제 해결
- MongoDB 연결 실패 시 환경 변수 확인
- Render 로그에서 오류 메시지 확인
- 자세한 배포 가이드는 `RENDER_DEPLOYMENT.md` 참조

## 배포 전 확인사항

### 환경 변수 설정
Render에서 다음 환경 변수를 설정하세요:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
NODE_ENV=production
PORT=10000
```

### MongoDB Atlas 설정
1. MongoDB Atlas에서 클러스터 생성
2. Database Access에서 사용자 생성
3. Network Access에서 IP 주소 추가 (0.0.0.0/0)
4. 연결 문자열 복사하여 MONGODB_URI에 설정

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
