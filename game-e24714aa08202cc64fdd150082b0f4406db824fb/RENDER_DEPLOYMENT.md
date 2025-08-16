# Render 배포 가이드

## 🚀 Render 배포 설정

### 1. MongoDB Atlas 설정
1. [MongoDB Atlas](https://www.mongodb.com/atlas)에서 계정 생성
2. 새 클러스터 생성 (무료 티어 권장)
3. Database Access에서 사용자 생성
4. Network Access에서 IP 주소 추가 (0.0.0.0/0 - 모든 IP 허용)
5. Connect 버튼 클릭 → "Connect your application" 선택
6. 연결 문자열 복사

### 2. Render 배포 설정

#### 환경 변수 설정
Render 대시보드에서 다음 환경 변수를 설정하세요:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
NODE_ENV=production
PORT=10000
```

#### 빌드 설정
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3. 배포 후 확인사항

#### 헬스체크
배포 후 다음 URL로 서버 상태를 확인하세요:
```
https://your-app-name.onrender.com/health
```

#### 관리자 페이지
```
https://your-app-name.onrender.com/admin-games.html
```

#### 사용자 게임 페이지
```
https://your-app-name.onrender.com/index.html
```

### 4. 문제 해결

#### MongoDB 연결 실패
- MONGODB_URI 환경 변수 확인
- MongoDB Atlas 네트워크 액세스 설정 확인
- 연결 문자열에 사용자명/비밀번호가 올바른지 확인

#### 서버 시작 실패
- Render 로그 확인
- package.json의 start 스크립트 확인
- 포트 설정 확인

### 5. 보안 설정

#### 환경 변수 보안
- MONGODB_URI는 민감한 정보이므로 환경 변수로 설정
- 절대 코드에 직접 입력하지 마세요

#### CORS 설정
- 필요한 경우 특정 도메인만 허용하도록 CORS 설정 수정

## 📝 배포 체크리스트

- [ ] MongoDB Atlas 클러스터 생성
- [ ] 데이터베이스 사용자 생성
- [ ] 네트워크 액세스 설정
- [ ] Render 계정 생성
- [ ] 새 Web Service 생성
- [ ] GitHub 저장소 연결
- [ ] 환경 변수 설정
- [ ] 배포 실행
- [ ] 헬스체크 확인
- [ ] 관리자/사용자 페이지 테스트

## 🔧 추가 설정

### 커스텀 도메인
Render에서 커스텀 도메인을 설정할 수 있습니다.

### SSL 인증서
Render는 자동으로 SSL 인증서를 제공합니다.

### 자동 배포
GitHub 저장소와 연결하면 코드 변경 시 자동으로 재배포됩니다. 