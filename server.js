const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// 한국 시간 계산 유틸 함수 (현재: 2025년 7월 19일)
function getKoreaDateString() {
    // 현재 실제 날짜: 2025년 7월 19일 오후 8시 20분
    const currentDate = "2025-07-19";
    
    console.log('🇰🇷 한국 현재 날짜:', currentDate);
    console.log('📅 한국 날짜 문자열:', currentDate);
    
    return currentDate;
}

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ppadun_user:ppadun8267@member-management.bppicvz.mongodb.net/?retryWrites=true&w=majority&appName=member-management';

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        if (!MONGODB_URI) {
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            console.log('⚠️ MongoDB 없이 서버를 시작합니다.');
            return false;
        }
        
        console.log('🔗 연결 문자열 확인:', MONGODB_URI.substring(0, 20) + '...');
        
        // 명시적으로 member-management 데이터베이스 사용
        const dbName = 'member-management';
        console.log('🎯 사용할 데이터베이스 이름:', dbName);
        
        // 연결 옵션 설정
        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            dbName: dbName,  // 명시적으로 member-management 데이터베이스 사용
            retryWrites: true,
            w: 'majority'
        };
        
        console.log('🔧 연결 옵션:', connectionOptions);
        
        await mongoose.connect(MONGODB_URI, connectionOptions);
        
        console.log('✅ MongoDB 연결 성공!');
        console.log('📊 실제 연결된 데이터베이스:', mongoose.connection.db.databaseName);
        
        // 데이터베이스 이름 재확인
        if (mongoose.connection.db.databaseName !== dbName) {
            console.warn('⚠️ 경고: 연결된 데이터베이스가 예상과 다릅니다.');
            console.warn(`   예상: ${dbName}, 실제: ${mongoose.connection.db.databaseName}`);
        } else {
            console.log('✅ 올바른 데이터베이스에 연결되었습니다.');
        }
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
        console.error('🔍 상세 오류:', error);
        return false;
    }
};

// 오늘의 경기 데이터 자동 생성 함수 (비활성화)
// 관리자 페이지에서만 경기를 추가하도록 변경
const createTodayGames = async () => {
    console.log('📅 자동 경기 생성 비활성화 - 관리자 페이지에서 경기를 추가해주세요.');
};

// 서버 시작
const startServer = async () => {
    try {
        console.log('서버 시작 중...');
        
        // MongoDB 연결 시도
        const isConnected = await connectToMongoDB();
        
        // 서버 시작
        app.listen(PORT, () => {
            console.log('✅ 서버가 성공적으로 시작되었습니다!');
            console.log(`📍 포트: ${PORT}`);
            console.log(`🗄️ MongoDB 상태: ${isConnected ? '연결됨' : '연결 안됨'}`);
            
                    // MongoDB 연결 성공 (자동 경기 생성 제거)
        if (isConnected) {
            console.log('✅ MongoDB 연결됨 - 관리자 페이지에서 경기를 추가해주세요.');
        }
        });
    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
        process.exit(1);
    }
};

// 서버 시작
startServer();

// 기본 라우팅
app.get('/', (req, res) => {
    res.json({
        message: 'Member Management System API',
        status: 'running',
        timestamp: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString() // 한국 시간대
    });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString(), // 한국 시간대
        uptime: process.uptime(),
        database: {
            status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            name: mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown',
            collections: []
        }
    };
    
    // 연결된 경우 컬렉션 목록 가져오기
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        mongoose.connection.db.listCollections().toArray()
            .then(collections => {
                health.database.collections = collections.map(col => col.name);
                const statusCode = health.database.status === 'connected' ? 200 : 503;
                res.status(statusCode).json(health);
            })
            .catch(error => {
                console.error('컬렉션 목록 조회 오류:', error);
                const statusCode = health.database.status === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
            });
    } else {
        const statusCode = health.database.status === 'connected' ? 200 : 503;
        res.status(statusCode).json(health);
    }
});

// 스키마 정의
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    favoriteTeam: { type: String, required: true },
    points: { type: Number, default: 3000 },
    attendance: [{ type: String }],
    isLoggedIn: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    lastLogoutAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'game-member');

// 출석부 스키마 정의
const attendanceSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    points: { type: Number, default: 100 },
    month: { type: String, required: true },
    year: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema, 'game-attendance');

// 게시판 스키마 정의
const boardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    authorName: { type: String, required: true },
    authorId: { type: String, required: true },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Board = mongoose.model('Board', boardSchema, 'game-board');

// 포인트 충전 스키마 정의 (동영상 광고 시청 포함)
const chargingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'video_ad' }, // 'video_ad', 'direct', 'kakao', 'phone' 등
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    // 동영상 광고 관련 필드
    videoType: { type: String, default: null }, // 'advertisement', 'content' 등
    videoTitle: { type: String, default: null },
    videoDuration: { type: Number, default: null }, // 초 단위
    watchDate: { type: Date, default: null },
    completed: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const Charging = mongoose.model('Charging', chargingSchema, 'game-charging');

// 기부 스키마 정의
const donationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true },
    percentage: { type: Number, required: true },
    gameDate: { type: String, required: true },
    gameNumber: { type: Number, required: true },
    winAmount: { type: Number, required: true }, // 승리 포인트
    finalPoints: { type: Number, required: true }, // 기부 후 최종 포인트
    createdAt: { type: Date, default: Date.now }
});

const Donation = mongoose.model('Donation', donationSchema, 'game-donations');

// 초대 스키마 정의
const inviteSchema = new mongoose.Schema({
    memberName: { type: String, required: true },
    memberId: { type: String, required: true },
    memberPhone: { type: String, required: true },
    inviterPhone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    inviteDate: { type: Date, default: Date.now }
});

const Invite = mongoose.model('Invite', inviteSchema, 'game-invite');



// 댓글 스키마 정의
const commentSchema = new mongoose.Schema({
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    author: { type: String, required: true },
    authorName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema, 'game-comment');

// 공지사항 스키마 정의
const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    isImportant: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Notice = mongoose.model('Notice', noticeSchema, 'notices');

// 고객센터 문의 스키마 정의
const inquirySchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['pending', 'answered', 'closed'], default: 'pending' },
    answer: { type: String, default: '' },
    answeredAt: { type: Date },
    answeredBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Inquiry = mongoose.model('Inquiry', inquirySchema, 'customer-inquiries');

// 게임 기록 스키마 정의
const gameRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    gameType: { type: String, required: true },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    teamSelection: { type: String, default: '-' },
    bettingType: { type: String, default: '-' },
    result: { type: String, enum: ['win', 'lose'], required: true },
    currentPoints: { type: Number, default: 0 },
    chargeAmount: { type: Number, default: 0 },
    chargePoints: { type: Number, default: 0 },
    attendancePoints: { type: Number, default: 0 },
    victoryPoints: { type: Number, default: 0 },
    donationPoints: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 }
});

const GameRecord = mongoose.model('GameRecord', gameRecordSchema, 'game-record');

// 오늘의 경기 스키마 정의 (team-games 컬렉션 사용 - 실제 구조에 맞게 수정)
const teamGameSchema = new mongoose.Schema({
    date: { type: String, required: true }, // 날짜 (YYYY-MM-DD 형식)
    gameNumber: { type: Number, required: true }, // 경기 번호
    matchup: { type: String, required: true }, // 경기 매치업 (예: "두산 vs LG")
    startTime: { type: String, required: true }, // 시작 시간
    endTime: { type: String, required: true }, // 종료 시간
    gameStatus: { type: String, required: true }, // 게임상황 (정상게임, 우천취소 등)
    progressStatus: { type: String, required: true }, // 진행상황 (경기전, 경기중, 경기종료)
    gameType: { type: String, required: true }, // 게임 타입 (타자, 투수 등)
    bettingStart: { type: String, default: '중지' }, // 배팅 시작 상태
    bettingStop: { type: String, default: '중지' }, // 배팅 중지 상태
    predictionResult: { type: String, default: '' }, // 예측 결과
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const TeamGame = mongoose.model('TeamGame', teamGameSchema, 'team-games');

// API 라우트

// 초대 목록 조회
app.get('/api/invites', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ invites: [] });
        }
        
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }
        
        // 특정 사용자가 초대한 데이터만 조회
        let invites = await Invite.find({ memberId: userId }).sort({ inviteDate: -1 });
        
        // "Unknown" 전화번호를 실제 전화번호로 수정
        for (let invite of invites) {
            if (invite.inviterPhone === 'Unknown' && invite.memberId) {
                const currentUser = await User.findOne({ userId: invite.memberId });
                if (currentUser && currentUser.phone) {
                    invite.inviterPhone = currentUser.phone;
                    await invite.save();
                }
            }
        }
        
        console.log(`사용자 ${userId}의 초대 데이터:`, invites);
        res.json({ invites });
    } catch (error) {
        console.error('초대 목록 조회 오류:', error);
        // 오류 발생 시에도 빈 배열 반환
        res.json({ invites: [] });
    }
});

// 초대 전화번호 인증번호 전송
app.post('/api/invite/send-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: '전화번호를 입력해주세요.' });
        }
        
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        res.json({ 
            message: '인증번호가 전송되었습니다.',
            verificationCode: verificationCode
        });
    } catch (error) {
        console.error('인증번호 전송 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 초대 전화번호 인증번호 확인
app.post('/api/invite/verify-code', async (req, res) => {
    try {
        const { phoneNumber, verificationCode, inputCode, memberName, memberId, memberPhone, inviterPhone } = req.body;
        
        if (!phoneNumber || !verificationCode || !inputCode || !memberName || !memberId || !memberPhone) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        if (verificationCode === inputCode) {
            // 현재 로그인한 사용자의 전화번호를 데이터베이스에서 가져오기
            let actualInviterPhone = inviterPhone;
            
            if (memberId) {
                const currentUser = await User.findOne({ userId: memberId });
                if (currentUser && currentUser.phone) {
                    actualInviterPhone = currentUser.phone;
                }
            }
            
            const invite = new Invite({
                memberName,
                memberId,
                memberPhone: actualInviterPhone,  // 로그인한 회원 (초대한 사람)의 전화번호
                inviterPhone: phoneNumber,        // 초대당한 회원의 전화번호
                status: 'completed'
            });
            
            await invite.save();
            console.log('초대 데이터 저장됨:', {
                memberName,
                memberId,
                memberPhone,
                inviterPhone: actualInviterPhone
            });
            res.json({ message: '인증이 완료되었습니다.' });
        } else {
            res.status(400).json({ error: '인증번호가 올바르지 않습니다.' });
        }
    } catch (error) {
        console.error('인증번호 확인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 전화번호 중복 체크
app.post('/api/check-invite', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ error: '전화번호를 입력해주세요.' });
        }
        
        const existingInvite = await Invite.findOne({
            $or: [
                { memberPhone: phoneNumber },
                { inviterPhone: phoneNumber }
            ]
        });
        
        res.json({ exists: !!existingInvite });
    } catch (error) {
        console.error('전화번호 중복 체크 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 회원가입
app.post('/api/register', async (req, res) => {
    try {
        const { userId, password, name, email, phone, favoriteTeam } = req.body;
        
        if (!userId || !password || !name || !email || !phone || !favoriteTeam) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ error: '이미 존재하는 ID입니다.' });
        }
        
        const user = new User({
            userId,
            password,
            name,
            email,
            phone,
            favoriteTeam,
            points: 3000
        });
        
        await user.save();
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 아이디 중복 확인
app.post('/api/check-id', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                available: false, 
                message: '아이디를 입력해주세요.' 
            });
        }
        
        // 아이디 길이 검증
        if (userId.length < 4 || userId.length > 20) {
            return res.status(400).json({ 
                success: false, 
                available: false, 
                message: '아이디는 4자 이상 20자 이하로 입력해주세요.' 
            });
        }
        
        const existingUser = await User.findOne({ userId });
        
        if (existingUser) {
            return res.json({ 
                success: true, 
                available: false, 
                message: '이미 사용 중인 아이디입니다.' 
            });
        } else {
            return res.json({ 
                success: true, 
                available: true, 
                message: '사용 가능한 아이디입니다.' 
            });
        }
    } catch (error) {
        console.error('아이디 중복 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            available: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 회원가입 (클라이언트 호환용)
app.post('/api/users', async (req, res) => {
    try {
        const { userId, password, name, email, phone, favoriteTeam } = req.body;
        
        console.log('회원가입 요청 데이터:', { userId, name, email, phone, favoriteTeam });
        
        if (!userId || !password || !name || !email || !phone || !favoriteTeam) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        // 아이디 길이 검증
        if (userId.length < 4 || userId.length > 20) {
            return res.status(400).json({ error: '아이디는 4자 이상 20자 이하로 입력해주세요.' });
        }
        
        // 비밀번호 길이 검증
        if (password.length < 6) {
            return res.status(400).json({ error: '비밀번호는 6자 이상 입력해주세요.' });
        }
        
        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
        }
        
        // 전화번호 형식 검증 (010-0000-0000 형식)
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ error: '올바른 전화번호 형식이 아닙니다. (예: 010-0000-0000)' });
        }
        
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ error: '이미 존재하는 ID입니다.' });
        }
        
        const user = new User({
            userId,
            password,
            name,
            email,
            phone,
            favoriteTeam,
            points: 3000,
            attendance: [],
            isLoggedIn: false,
            loginCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await user.save();
        console.log('새 사용자 저장됨:', user.userId);
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        if (!userId || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'ID와 비밀번호를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId });
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'ID 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        if (user.password !== password) {
            return res.status(401).json({ 
                success: false,
                message: 'ID 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        // 로그인 정보 업데이트
        const loginCount = (user.loginCount || 0) + 1;
        const lastLoginAt = new Date();
        
        await User.updateOne(
            { userId },
            {
                $set: {
                    loginCount: loginCount,
                    lastLoginAt: lastLoginAt,
                    isLoggedIn: true,
                    updatedAt: new Date()
                }
            }
        );
        
        // 비밀번호 제외하고 회원 정보 반환
        const { password: _, ...userInfo } = user.toObject();
        const updatedUserInfo = {
            ...userInfo,
            loginCount: loginCount,
            lastLoginAt: lastLoginAt,
            isLoggedIn: true
        };
        
        res.json({
            success: true,
            message: '로그인이 성공했습니다.',
            user: updatedUserInfo
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ 
            success: false,
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 아이디 찾기
app.post('/api/find-id', async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: '이름과 전화번호를 입력해주세요.' 
            });
        }
        
        // 전화번호 형식 검증 및 정규화
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 전화번호 형식이 아닙니다. (예: 010-0000-0000)' 
            });
        }
        
        // 이름과 전화번호로 사용자 검색
        const user = await User.findOne({ name, phone });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '해당 정보로 가입된 사용자를 찾을 수 없습니다.' 
            });
        }
        
        res.json({ 
            success: true,
            message: '아이디 찾기 성공',
            userId: user.userId 
        });
    } catch (error) {
        console.error('아이디 찾기 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 비밀번호 찾기
app.post('/api/find-password', async (req, res) => {
    try {
        const { userId, name, phone } = req.body;
        
        if (!userId || !name || !phone) {
            return res.status(400).json({ 
                success: false, 
                message: '아이디, 이름, 전화번호를 모두 입력해주세요.' 
            });
        }
        
        // 전화번호 형식 검증
        const phoneRegex = /^010-\d{4}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 전화번호 형식이 아닙니다. (예: 010-0000-0000)' 
            });
        }
        
        // 아이디, 이름, 전화번호로 사용자 검색
        const user = await User.findOne({ userId, name, phone });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: '해당 정보로 가입된 사용자를 찾을 수 없습니다.' 
            });
        }
        
        // 비밀번호 마스킹 처리 (보안을 위해 일부만 표시)
        const password = user.password;
        const maskedPassword = password.length > 2 
            ? password.substring(0, 2) + '*'.repeat(password.length - 2)
            : '*'.repeat(password.length);
        
        res.json({ 
            success: true,
            message: '비밀번호 찾기 성공',
            maskedPassword: maskedPassword
        });
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 출석체크
app.post('/api/attendance', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        }
        
        // 한국 시간대 기준으로 오늘 날짜 계산 (UTC 기반)
        const now = new Date();
        const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const koreaTime = new Date(utcNow.getTime() + (9 * 60 * 60 * 1000));
        
        // 날짜만 추출 (YYYY-MM-DD 형식)
        const year = koreaTime.getUTCFullYear();
        const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(koreaTime.getUTCDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        console.log('출석체크 요청:', {
            userId,
            dateString,
            month,
            year,
            originalTime: now.toISOString(),
            koreaTime: koreaTime.toISOString(),
            utcYear: koreaTime.getUTCFullYear(),
            utcMonth: koreaTime.getUTCMonth() + 1,
            utcDate: koreaTime.getUTCDate()
        });
        
        const existingAttendance = await Attendance.findOne({
            userId,
            date: dateString
        });
        
        console.log('기존 출석 기록:', existingAttendance);
        
        if (existingAttendance) {
            return res.status(400).json({ success: false, message: '오늘 이미 출석체크를 하셨습니다.' });
        }
        
        const attendance = new Attendance({
            userId,
            date: dateString,
            month,
            year: year.toString(),
            points: 100
        });
        
        await attendance.save();
        console.log('새 출석 기록 저장됨:', attendance);
        
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            { 
                $inc: { points: 100 },
                $push: { attendance: dateString }
            },
            { new: true }
        );
        
        console.log('사용자 포인트 업데이트됨:', updatedUser.points);
        
        res.json({ 
            success: true, 
            message: '출석체크가 완료되었습니다. 100포인트가 적립되었습니다.',
            points: 100,
            totalPoints: updatedUser.points
        });
    } catch (error) {
        console.error('출석체크 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 로그아웃
app.post('/api/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '회원 ID가 필요합니다.'
            });
        }
        
        // 로그아웃 정보 업데이트
        await User.updateOne(
            { userId },
            {
                $set: {
                    isLoggedIn: false,
                    lastLogoutAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );
        
        res.json({
            success: true,
            message: '로그아웃되었습니다.'
        });
    } catch (error) {
        console.error('로그아웃 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 회원 로그인 통계 API
app.get('/api/login-stats', async (req, res) => {
    try {
        // 전체 회원 수
        const totalMembers = await User.countDocuments();
        
        // 현재 로그인한 회원 수
        const onlineMembers = await User.countDocuments({ isLoggedIn: true });
        
        // 최근 로그인한 회원들 (24시간 이내)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentLoginMembers = await User.find(
            { lastLoginAt: { $gte: oneDayAgo } },
            { 
                userId: 1, 
                name: 1, 
                lastLoginAt: 1, 
                lastLogoutAt: 1,
                loginCount: 1,
                isLoggedIn: 1,
                createdAt: 1
            }
        ).sort({ lastLoginAt: -1 });
        
        // 로그인한 회원들 (현재 온라인)
        const onlineMembersList = await User.find(
            { isLoggedIn: true },
            { 
                userId: 1, 
                name: 1, 
                lastLoginAt: 1, 
                lastLogoutAt: 1,
                loginCount: 1,
                isLoggedIn: 1,
                createdAt: 1
            }
        ).sort({ lastLoginAt: -1 });
        
        res.json({
            success: true,
            stats: {
                totalMembers: totalMembers,
                onlineMembers: onlineMembers,
                recentLoginMembers: recentLoginMembers,
                onlineMembersList: onlineMembersList
            }
        });
    } catch (error) {
        console.error('로그인 통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 강제 로그아웃 API
app.post('/api/force-logout/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '회원 ID가 필요합니다.'
            });
        }
        
        // 회원을 강제 로그아웃 상태로 변경
        const result = await User.updateOne(
            { userId },
            { 
                $set: { 
                    isLoggedIn: false,
                    lastLogoutAt: new Date(),
                    updatedAt: new Date()
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '해당 회원을 찾을 수 없습니다.'
            });
        }
        
        // 로그아웃된 회원 정보 조회
        const loggedOutUser = await User.findOne(
            { userId },
            { 
                userId: 1, 
                name: 1, 
                lastLoginAt: 1, 
                lastLogoutAt: 1,
                isLoggedIn: 1
            }
        );
        
        res.json({
            success: true,
            message: '강제 로그아웃이 완료되었습니다.',
            loggedOutUser: loggedOutUser
        });
    } catch (error) {
        console.error('강제 로그아웃 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 출석 현황 조회
app.get('/api/attendance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' });
        }
        
        // 한국 시간대 기준으로 현재 월/년 계산 (UTC 기반)
        const now = new Date();
        const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
        const koreaTime = new Date(utcNow.getTime() + (9 * 60 * 60 * 1000));
        const currentMonth = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
        const currentYear = koreaTime.getUTCFullYear().toString();
        
        console.log('출석 현황 조회:', {
            userId,
            currentMonth,
            currentYear,
            koreaTime: koreaTime.toISOString(),
            utcYear: koreaTime.getUTCFullYear(),
            utcMonth: koreaTime.getUTCMonth() + 1
        });
        
        // 이번달 출석 기록
        const monthAttendance = await Attendance.find({
            userId,
            month: currentMonth,
            year: currentYear
        }).sort({ date: 1 });
        
        // 전체 출석 기록
        const totalAttendance = await Attendance.find({ userId }).sort({ date: 1 });
        
        // 사용자 정보 조회
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 이번달 포인트 계산
        const monthPoints = monthAttendance.reduce((sum, record) => sum + record.points, 0);
        
        // 전체 포인트는 사용자의 현재 포인트 사용
        const totalPoints = user.points;
        
        console.log('출석 현황 결과:', {
            monthAttendance: monthAttendance.length,
            totalAttendance: totalAttendance.length,
            monthPoints,
            totalPoints
        });
        
        res.json({ 
            success: true,
            attendance: monthAttendance,
            monthAttendance: monthAttendance.length,
            totalAttendance: totalAttendance.length,
            monthPoints: monthPoints,
            totalPoints: totalPoints
        });
    } catch (error) {
        console.error('출석 현황 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 포인트 충전
app.post('/api/charge', async (req, res) => {
    try {
        const { userId, amount, paymentMethod } = req.body;
        
        if (!userId || !amount || !paymentMethod) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        const charging = new Charging({
            userId,
            amount,
            paymentMethod,
            status: 'completed'
        });
        
        await charging.save();
        
        await User.findOneAndUpdate(
            { userId },
            { $inc: { points: amount } }
        );
        
        res.json({ message: '포인트 충전이 완료되었습니다.' });
    } catch (error) {
        console.error('포인트 충전 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시판 글 작성
app.post('/api/board', async (req, res) => {
    try {
        const { title, content, author, authorName, authorId } = req.body;
        
        if (!title || !content || !author || !authorName || !authorId) {
            return res.status(400).json({ error: '제목, 내용, 작성자를 입력해주세요.' });
        }
        
        const board = new Board({
            title,
            content,
            author,
            authorName,
            authorId
        });
        
        await board.save();
        res.status(201).json({ message: '게시글이 작성되었습니다.' });
    } catch (error) {
        console.error('게시글 작성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시판 목록 조회
app.get('/api/board', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { authorName: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (page - 1) * limit;
        
        const boards = await Board.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        // 각 게시글의 댓글 수 조회
        const boardsWithCommentCount = await Promise.all(
            boards.map(async (board) => {
                const commentCount = await Comment.countDocuments({ boardId: board._id });
                return {
                    ...board.toObject(),
                    commentCount
                };
            })
        );
        
        const total = await Board.countDocuments(query);
        
        res.json({
            boards: boardsWithCommentCount,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('게시판 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시글 상세 조회
app.get('/api/board/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 조회수 증가는 실제 상세 조회 시에만
        const board = await Board.findByIdAndUpdate(
            id,
            { $inc: { views: 1 } },
            { new: true }
        );
        
        if (!board) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        
        const comments = await Comment.find({ boardId: id }).sort({ createdAt: 1 });
        res.json({ board, comments });
    } catch (error) {
        console.error('게시글 상세 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시글 수정
app.put('/api/board/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, authorId } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
        }
        
        const board = await Board.findById(id);
        if (!board) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        
        if (board.authorId !== authorId) {
            return res.status(403).json({ error: '수정 권한이 없습니다.' });
        }
        
        board.title = title;
        board.content = content;
        board.updatedAt = new Date();
        
        await board.save();
        res.json({ message: '게시글이 수정되었습니다.' });
    } catch (error) {
        console.error('게시글 수정 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게시글 삭제
app.delete('/api/board/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { authorId } = req.body;
        
        const board = await Board.findById(id);
        if (!board) {
            return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }
        
        if (board.authorId !== authorId) {
            return res.status(403).json({ error: '삭제 권한이 없습니다.' });
        }
        
        await Comment.deleteMany({ boardId: id });
        await Board.findByIdAndDelete(id);
        
        res.json({ message: '게시글이 삭제되었습니다.' });
    } catch (error) {
        console.error('게시글 삭제 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 목록 조회 (조회수 증가 없음)
app.get('/api/comments/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        
        const comments = await Comment.find({ boardId }).sort({ createdAt: 1 });
        res.json({ comments });
    } catch (error) {
        console.error('댓글 목록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 작성
app.post('/api/comment', async (req, res) => {
    try {
        const { boardId, author, authorName, content } = req.body;
        
        if (!boardId || !author || !authorName || !content) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        const comment = new Comment({
            boardId,
            author,
            authorName,
            content
        });
        
        await comment.save();
        res.status(201).json({ message: '댓글이 작성되었습니다.' });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 삭제
app.delete('/api/comment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { author } = req.body;
        
        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    }
        
        if (comment.author !== author) {
            return res.status(403).json({ error: '삭제 권한이 없습니다.' });
        }
        
        await Comment.findByIdAndDelete(id);
        res.json({ message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게임 기록 저장
app.post('/api/game-record', async (req, res) => {
    try {
        const { 
            userId, 
            gameType, 
            score, 
            teamSelection, 
            bettingType, 
            result, 
            currentPoints, 
            chargeAmount, 
            chargePoints, 
            attendancePoints, 
            victoryPoints, 
            donationPoints, 
            totalPoints 
        } = req.body;
        
        if (!userId || !gameType || score === undefined || !result) {
            return res.status(400).json({ error: '필수 필드를 입력해주세요.' });
        }
        
        const gameRecord = new GameRecord({
            userId,
            gameType,
            score,
            teamSelection: teamSelection || '-',
            bettingType: bettingType || '-',
            result,
            currentPoints: currentPoints || 0,
            chargeAmount: chargeAmount || 0,
            chargePoints: chargePoints || 0,
            attendancePoints: attendancePoints || 0,
            victoryPoints: victoryPoints || 0,
            donationPoints: donationPoints || 0,
            totalPoints: totalPoints || 0
        });
        
        await gameRecord.save();
        res.status(201).json({ message: '게임 기록이 저장되었습니다.' });
    } catch (error) {
        console.error('게임 기록 저장 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 게임 기록 조회
app.get('/api/game-record/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }
        
        const gameRecords = await GameRecord.find({ userId }).sort({ date: -1 });
        res.json({ gameRecords });
    } catch (error) {
        console.error('게임 기록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 모든 게임 기록 조회 (관리자용)
app.get('/api/game-records-all', async (req, res) => {
    try {
        const gameRecords = await GameRecord.find()
            .populate('userId', 'userId name')
            .sort({ date: -1 });
        
        const formattedRecords = gameRecords.map(record => ({
            game_date: record.date,
            user_name: record.userId ? record.userId.name : 'Unknown',
            team_selection: record.teamSelection || '-',
            game_type: record.gameType,
            betting_type: record.bettingType || '-',
            result: record.result,
            current_points: record.currentPoints || 0,
            charge_amount: record.chargeAmount || 0,
            charge_points: record.chargePoints || 0,
            attendance_points: record.attendancePoints || 0,
            victory_points: record.victoryPoints || 0,
            donation_points: record.donationPoints || 0,
            total_points: record.totalPoints || 0
        }));
        
        res.json(formattedRecords);
    } catch (error) {
        console.error('전체 게임 기록 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 정보 조회
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json({
            userId: user.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            points: user.points,
            favoriteTeam: user.favoriteTeam,
            attendance: user.attendance
        });
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 공지사항 목록 조회
app.get('/api/notices', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ notices: [] });
        }
        
        // 모든 공지사항 조회 (중요한 것 먼저, 그 다음 날짜순)
        const notices = await Notice.find({})
            .sort({ isImportant: -1, createdAt: -1 });
        
        console.log('조회된 공지사항:', notices);
        res.json({ notices });
    } catch (error) {
        console.error('공지사항 목록 조회 오류:', error);
        // 오류 발생 시에도 빈 배열 반환
        res.json({ notices: [] });
    }
});

// 고객센터 문의 목록 조회
app.get('/api/inquiries', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ inquiries: [] });
        }
        
        // 특정 사용자의 문의 목록 조회
        const inquiries = await Inquiry.find({ userId }).sort({ createdAt: -1 });
        
        console.log(`사용자 ${userId}의 문의 목록:`, inquiries);
        res.json({ inquiries });
    } catch (error) {
        console.error('문의 목록 조회 오류:', error);
        res.json({ inquiries: [] });
    }
});

// 고객센터 문의 작성
app.post('/api/inquiry', async (req, res) => {
    try {
        const { userId, userName, title, content, category } = req.body;
        
        if (!userId || !userName || !title || !content || !category) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        const inquiry = new Inquiry({
            userId,
            userName,
            title,
            content,
            category
        });
        
        await inquiry.save();
        res.status(201).json({ message: '문의가 등록되었습니다.' });
    } catch (error) {
        console.error('문의 작성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 고객센터 문의 상세 조회
app.get('/api/inquiry/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
        }
        
        res.json({ inquiry });
    } catch (error) {
        console.error('문의 상세 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 동영상 시청 완료 및 포인트 지급
app.post('/api/video-watch-complete', async (req, res) => {
    try {
        const { 
            userId, 
            userName, 
            points, 
            videoDuration, 
            videoType, 
            videoTitle, 
            watchDate, 
            completed 
        } = req.body;
        
        if (!userId || !userName || !points || !videoDuration || !videoType || !videoTitle) {
            return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
        }
        
        // 사용자 확인
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        // 동영상 시청 기록을 game-charging 컬렉션에 저장
        const chargingRecord = new Charging({
            userId,
            userName,
            amount: points,
            paymentMethod: 'video_ad',
            status: 'completed',
            videoType,
            videoTitle,
            videoDuration,
            watchDate: new Date(watchDate),
            completed
        });
        
        await chargingRecord.save();
        
        // 포인트 추가
        user.points += points;
        await user.save();
        
        console.log('동영상 시청 기록 저장 완료:', {
            userId,
            userName,
            videoTitle,
            videoDuration,
            pointsEarned: points,
            totalPoints: user.points
        });
        
        res.json({ 
            success: true,
            message: `${points}포인트가 추가되었습니다.`,
            points: user.points,
            videoWatchRecord: {
                id: chargingRecord._id,
                videoTitle,
                videoDuration,
                pointsEarned: points,
                watchDate: chargingRecord.watchDate
            }
        });
    } catch (error) {
        console.error('동영상 시청 완료 처리 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 포인트 업데이트 (광고 시청 후)
app.post('/api/update-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        if (!userId || !points) {
            return res.status(400).json({ error: '사용자 ID와 포인트가 필요합니다.' });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        // 포인트 추가
        user.points += points;
        await user.save();
        
        res.json({ 
            success: true,
            message: `${points}포인트가 추가되었습니다.`,
            points: user.points
        });
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 포인트 충전
app.post('/api/charge-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        if (!userId || !points) {
            return res.status(400).json({ error: '사용자 ID와 포인트가 필요합니다.' });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        // 포인트 추가
        user.points += points;
        await user.save();
        
        res.json({ 
            success: true,
            message: `${points}포인트가 충전되었습니다.`,
            points: user.points
        });
    } catch (error) {
        console.error('포인트 충전 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 회원정보 수정
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, favoriteTeam } = req.body;
        
        if (!name || !email || !phone || !favoriteTeam) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        // 회원정보 업데이트
        user.name = name;
        user.email = email;
        user.phone = phone;
        user.favoriteTeam = favoriteTeam;
        
        await user.save();
        
        res.json({ 
            message: '회원정보가 수정되었습니다.',
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                favoriteTeam: user.favoriteTeam,
                points: user.points
            }
        });
    } catch (error) {
        console.error('회원정보 수정 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 동영상 시청 기록 조회
app.get('/api/video-watch', async (req, res) => {
    try {
        const { userId, page = 1, limit = 20 } = req.query;
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ 
                success: true,
                records: [],
                pagination: {
                    currentPage: 1,
                    totalPages: 0,
                    totalRecords: 0
                },
                stats: {
                    totalRecords: 0,
                    totalCompleted: 0,
                    totalPointsEarned: 0,
                    avgWatchDuration: 0,
                    uniqueMembers: 0
                }
            });
        }
        
        let query = { paymentMethod: 'video_ad' }; // 동영상 광고 시청만 필터링
        if (userId) {
            query.userId = userId;
        }
        
        // 전체 레코드 수 계산
        const totalRecords = await Charging.countDocuments(query);
        
        // 페이지네이션 적용
        const skip = (page - 1) * limit;
        const records = await Charging.find(query)
            .sort({ watchDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        // 통계 계산
        const stats = await Charging.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalRecords: { $sum: 1 },
                    totalCompleted: { $sum: { $cond: ['$completed', 1, 0] } },
                    totalPointsEarned: { $sum: '$amount' },
                    avgWatchDuration: { $avg: '$videoDuration' },
                    uniqueMembers: { $addToSet: '$userId' }
                }
            }
        ]);
        
        const statsData = stats[0] || {
            totalRecords: 0,
            totalCompleted: 0,
            totalPointsEarned: 0,
            avgWatchDuration: 0,
            uniqueMembers: []
        };
        
        res.json({
            success: true,
            records: records,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / limit),
                totalRecords: totalRecords,
                hasNext: skip + records.length < totalRecords,
                hasPrev: page > 1
            },
            stats: {
                totalRecords: statsData.totalRecords,
                totalCompleted: statsData.totalCompleted,
                totalPointsEarned: statsData.totalPointsEarned,
                avgWatchDuration: Math.round(statsData.avgWatchDuration || 0),
                uniqueMembers: statsData.uniqueMembers.length
            }
        });
    } catch (error) {
        console.error('동영상 시청 기록 조회 오류:', error);
        res.status(500).json({ 
            success: false,
            message: '동영상 시청 기록을 불러오는데 실패했습니다.',
            error: error.message 
        });
    }
});

// 오늘의 경기 조회 API
app.get('/api/daily-games', async (req, res) => {
    try {
        console.log('📅 오늘의 경기 조회 요청');
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('❌ MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ games: [] });
        }
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        console.log('🔍 서버 - 조회 조건:', {
            date: todayString,
            originalDate: today.toISOString(),
            koreaTime: koreaTime.toISOString()
        });
        
        // team-games 컬렉션에서 직접 조회
        let teamGames = [];
        
        try {
            // team-games 컬렉션에서 오늘 날짜의 경기 조회
            const teamGamesCollection = mongoose.connection.db.collection('team-games');
            
            // 🔍 디버깅: 전체 데이터 확인
            const allGames = await teamGamesCollection.find({}).limit(5).toArray();
            console.log('🔍 team-games 컬렉션의 샘플 데이터:', allGames.map(game => ({
                date: game.date,
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop
            })));
            
            // 오늘 날짜로 조회
            teamGames = await teamGamesCollection.find({ date: todayString }).sort({ gameNumber: 1 }).toArray();
            
            console.log(`📅 오늘 날짜(${todayString})의 경기: ${teamGames.length}개`);
            
            if (teamGames.length === 0) {
                console.log(`📅 오늘 날짜(${todayString})에 경기가 없습니다.`);
                
                // 🔍 비슷한 날짜의 데이터가 있는지 확인
                const recentGames = await teamGamesCollection.find({}).sort({ date: -1 }).limit(3).toArray();
                console.log('🔍 최근 3개 경기 날짜:', recentGames.map(game => ({
                    date: game.date,
                    gameNumber: game.gameNumber,
                    matchup: game.matchup
                })));
            }
        } catch (error) {
            console.log('❌ team-games 컬렉션 조회 실패:', error.message);
        }
        
        if (teamGames && teamGames.length > 0) {
            console.log(`✅ 오늘의 경기 조회 완료: ${teamGames.length}개 경기`);
            console.log('📋 경기 목록:', teamGames.map(g => `${g.gameNumber}. ${g.matchup} (${g.gameStatus})`));
            
            // 클라이언트 호환성을 위해 데이터 변환
            const convertedGames = teamGames.map(game => ({
                number: game.gameNumber,
                homeTeam: game.matchup.split(' vs ')[0],
                awayTeam: game.matchup.split(' vs ')[1],
                startTime: game.startTime,
                endTime: game.endTime,
                noGame: game.gameStatus,
                progressStatus: game.progressStatus,
                gameType: game.gameType,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop,
                predictionResult: game.predictionResult,
                isActive: game.progressStatus === '경기중' || game.progressStatus === '경기전'
            }));
            
            // 디버깅용: 모든 경기 반환 (테스트용)
            if (req.query.debug === 'true') {
                console.log('🔧 디버그 모드: 모든 경기 반환');
                return res.json({ 
                    games: convertedGames,
                    todayString: todayString,
                    debug: {
                        totalGames: teamGames.length,
                        originalGames: teamGames.map(g => ({
                            gameNumber: g.gameNumber,
                            matchup: g.matchup,
                            gameStatus: g.gameStatus,
                            progressStatus: g.progressStatus
                        }))
                    }
                });
            }
            
            res.json({ 
                success: true,
                games: convertedGames 
            });
        } else {
            console.log('❌ 오늘 날짜의 경기 데이터가 없습니다.');
            
            // 디버깅용: 오늘 날짜 경기만 확인
            if (req.query.debug === 'true') {
                try {
                    const teamGamesCollection = mongoose.connection.db.collection('team-games');
                    const todayGames = await teamGamesCollection.find({ date: todayString }).toArray();
                    
                    console.log('🔧 디버그 모드: 오늘 날짜 경기만 반환');
                    return res.json({ 
                        games: [],
                        todayString: todayString,
                        debug: {
                            todayGames: todayGames.length,
                            todayGamesList: todayGames.map(game => ({
                                _id: game._id,
                                gameNumber: game.gameNumber,
                                matchup: game.matchup,
                                date: game.date,
                                gameStatus: game.gameStatus,
                                progressStatus: game.progressStatus
                            }))
                        }
                    });
                } catch (error) {
                    console.log('❌ 디버그 정보 조회 실패:', error.message);
                    return res.json({ 
                        games: [],
                        todayString: todayString,
                        debug: {
                            error: error.message
                        }
                    });
                }
            }
            
            res.json({ 
                success: true,
                games: [] 
            });
        }
    } catch (error) {
        console.error('❌ 오늘의 경기 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 경기 상태 업데이트 API (관리자용)
app.put('/api/daily-games/:gameNumber/status', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        const { noGame } = req.body;
        
        if (!noGame) {
            return res.status(400).json({ error: '게임상황을 입력해주세요.' });
        }
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        const teamGamesDoc = await TeamGame.findOne({ date: todayString });
        
        if (!teamGamesDoc) {
            return res.status(404).json({ error: '오늘 날짜의 경기 데이터를 찾을 수 없습니다.' });
        }
        
        const game = teamGamesDoc.games.find(g => g.number === parseInt(gameNumber));
        if (!game) {
            return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
        }
        
        game.noGame = noGame;
        teamGamesDoc.updatedAt = new Date();
        await teamGamesDoc.save();
        
        if (!game) {
            return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
        }
        
        res.json({ 
            message: '경기 상황이 업데이트되었습니다.',
            game 
        });
    } catch (error) {
        console.error('경기 상황 업데이트 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 경기 선택 스키마 정의
const gameSelectionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    gameNumber: { type: Number, required: true },
    selectedAt: { type: Date, default: Date.now },
    gameDate: { type: String, required: true } // YYYY-MM-DD 형식
});

const GameSelection = mongoose.model('GameSelection', gameSelectionSchema, 'game-selections');

// 사용자 경기 선택 API
app.post('/api/game-selection', async (req, res) => {
    try {
        const { userId, gameNumber } = req.body;
        
        if (!userId || !gameNumber) {
            return res.status(400).json({ error: '사용자 ID와 경기 번호가 필요합니다.' });
        }
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 같은 날짜에 이미 선택한 경기가 있는지 확인
        const existingSelection = await GameSelection.findOne({
            userId,
            gameDate: todayString
        });
        
        if (existingSelection) {
            // 기존 선택을 업데이트
            existingSelection.gameNumber = parseInt(gameNumber);
            existingSelection.selectedAt = new Date();
            await existingSelection.save();
        } else {
            // 새로운 선택 생성
            const gameSelection = new GameSelection({
                userId,
                gameNumber: parseInt(gameNumber),
                gameDate: todayString
            });
            await gameSelection.save();
        }
        
        res.json({ 
            message: '경기가 선택되었습니다.',
            gameNumber: parseInt(gameNumber)
        });
    } catch (error) {
        console.error('경기 선택 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 경기 선택 조회 API
app.get('/api/game-selection/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 필요합니다.' });
        }
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        const selection = await GameSelection.findOne({
            userId,
            gameDate: todayString
        });
        
        res.json({ selection });
    } catch (error) {
        console.error('경기 선택 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});



// 오늘의 경기 삭제 API (관리자용)
app.delete('/api/daily-games/:gameNumber', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        const teamGamesDoc = await TeamGame.findOne({ date: todayString });
        
        if (!teamGamesDoc) {
            return res.status(404).json({ error: '오늘 날짜의 경기 데이터를 찾을 수 없습니다.' });
        }
        
        const gameIndex = teamGamesDoc.games.findIndex(g => g.number === parseInt(gameNumber));
        if (gameIndex === -1) {
            return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
        }
        
        teamGamesDoc.games.splice(gameIndex, 1);
        await teamGamesDoc.save();
        
        res.json({ message: '경기가 삭제되었습니다.' });
    } catch (error) {
        console.error('경기 삭제 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});





// 오늘의 경기 생성 API (관리자용)
app.post('/api/daily-games', async (req, res) => {
    try {
        const { number, homeTeam, awayTeam, date, startTime, endTime, noGame, isActive } = req.body;
        
        if (!number || !homeTeam || !awayTeam || !date || !startTime || !endTime || !noGame) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        // 해당 날짜의 문서가 있는지 확인
        let teamGamesDoc = await TeamGame.findOne({ date: date });
        
        if (teamGamesDoc) {
            // 기존 문서에 경기 추가
            const existingGame = teamGamesDoc.games.find(g => g.number === parseInt(number));
        if (existingGame) {
            return res.status(400).json({ error: '이미 존재하는 경기입니다.' });
        }
        
            teamGamesDoc.games.push({
            number: parseInt(number),
            homeTeam,
            awayTeam,
            startTime,
            endTime,
            noGame,
            isActive: isActive !== undefined ? isActive : true
        });
        
            await teamGamesDoc.save();
            
            res.json({ 
                message: '경기가 추가되었습니다.',
                game: teamGamesDoc.games[teamGamesDoc.games.length - 1]
            });
        } else {
            // 새로운 문서 생성
            const newGame = {
                number: parseInt(number),
                homeTeam,
                awayTeam,
                startTime,
                endTime,
                noGame,
                isActive: isActive !== undefined ? isActive : true
            };
            
            const newTeamGamesDoc = new TeamGame({
                date: date,
                games: [newGame]
            });
            
            await newTeamGamesDoc.save();
        
        res.status(201).json({ 
            message: '경기가 생성되었습니다.',
                game: newGame
        });
        }
    } catch (error) {
        console.error('경기 생성 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 배팅 상태 확인 API (게임 클라이언트용)
app.get('/api/betting/status', async (req, res) => {
    try {
        const { date, gameNumber } = req.query;
        
        if (!date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '날짜와 경기 번호가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        // 배팅 세션 컬렉션 사용
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 활성 배팅 세션 조회 (관리자 서비스와 공유)
        const activeSession = await bettingCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber),
            status: 'active'
        });
        
        console.log(`배팅 상태 확인: ${date} 경기 ${gameNumber} - 활성 세션:`, activeSession ? '있음' : '없음');
        
        // 전체 배팅 세션 확인 (디버깅용)
        const allSessions = await bettingCollection.find({
            date: date,
            gameNumber: parseInt(gameNumber)
        }).toArray();
        
        console.log(`📋 전체 배팅 세션 (${date} 경기 ${gameNumber}):`, allSessions);
        
        res.json({
            success: true,
            isActive: !!activeSession,
            session: activeSession || null,
            debug: {
                totalSessions: allSessions.length,
                allSessions: allSessions
            }
        });
    } catch (error) {
        console.error('배팅 상태 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 상태 확인 중 오류가 발생했습니다.'
        });
    }
});

// 게임에서 배팅 제출 API
app.post('/api/betting/submit', async (req, res) => {
    try {
        const { userId, gameType, prediction, points, date, gameNumber } = req.body;
        
        if (!userId || !gameType || !prediction || !points || !date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '필수 정보가 누락되었습니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 활성 배팅 세션 확인
        const activeSession = await bettingCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber),
            status: 'active'
        });
        
        if (!activeSession) {
            return res.status(400).json({
                success: false,
                message: '현재 배팅이 활성화되지 않았습니다.'
            });
        }
        
        const userCollection = mongoose.connection.db.collection('game-member');
        
        // 사용자 정보 확인
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // 포인트 확인
        if (user.points < points) {
            return res.status(400).json({
                success: false,
                message: '포인트가 부족합니다.'
            });
        }
        
        // 배팅 기록 추가
        const bettingRecord = {
            date: date,
            gameNumber: parseInt(gameNumber),
            gameType: gameType,
            inning: activeSession.inning,
            prediction: prediction,
            points: parseInt(points),
            betAt: new Date()
        };
        
        await userCollection.updateOne(
            { userId: userId },
            { 
                $push: { bettingHistory: bettingRecord },
                $inc: { points: -parseInt(points) }
            }
        );
        
        console.log(`게임 배팅 제출: ${userId} - ${prediction} ${points}포인트`);
        
        res.json({
            success: true,
            message: '배팅이 완료되었습니다.',
            remainingPoints: user.points - parseInt(points)
        });
    } catch (error) {
        console.error('배팅 제출 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 제출 중 오류가 발생했습니다.'
        });
    }
});

// 브라우저 종료 시 로그아웃 API
app.post('/api/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자 ID가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 로그아웃 처리 건너뜀');
            return res.json({
                success: true,
                message: '로그아웃되었습니다.'
            });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            console.log(`사용자를 찾을 수 없음: ${userId}`);
            return res.json({
                success: true,
                message: '로그아웃되었습니다.'
            });
        }
        
        // 회원을 로그아웃 상태로 변경
        user.isLoggedIn = false;
        user.lastLogoutAt = new Date();
        user.updatedAt = new Date();
        await user.save();
        
        console.log(`브라우저 종료로 인한 자동 로그아웃: ${userId} (${user.name})`);
        res.json({
            success: true,
            message: '로그아웃되었습니다.'
        });
    } catch (error) {
        console.error('브라우저 종료 로그아웃 오류:', error);
        res.json({
            success: true,
            message: '로그아웃되었습니다.'
        });
    }
});

// 에러 핸들링
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 404 핸들링
app.use((req, res) => {
    res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
});

// 배팅 시작 API (관리자용)
app.post('/api/betting/admin-start', async (req, res) => {
    try {
        const { date, gameNumber, inning = 1 } = req.body;
        
        if (!date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '날짜와 경기 번호가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 기존 활성 세션이 있는지 확인
        const existingActiveSession = await bettingCollection.findOne({
                date: date,
                gameNumber: parseInt(gameNumber),
                status: 'active'
        });
        
        if (existingActiveSession) {
            return res.status(400).json({
                success: false,
                message: '이미 활성화된 배팅 세션이 있습니다.'
            });
        }
        
        // 새로운 배팅 세션 생성
        const newSession = {
            date: date,
            gameNumber: parseInt(gameNumber),
            inning: parseInt(inning),
            status: 'active',
            startedAt: new Date(),
            createdAt: new Date()
        };
        
        await bettingCollection.insertOne(newSession);
        
        console.log(`✅ 배팅 시작: ${date} 경기 ${gameNumber} ${inning}회`);
        console.log('📊 배팅 세션 정보:', newSession);
        
        // 생성된 세션 확인
        const createdSession = await bettingCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber),
            status: 'active'
        });
        
        console.log('🔍 생성된 세션 확인:', createdSession);
        
        res.json({
            success: true,
            message: '배팅이 시작되었습니다.',
            session: newSession
        });
    } catch (error) {
        console.error('배팅 시작 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 시작 중 오류가 발생했습니다.'
        });
    }
});

// (관리자용 배팅 중지 API 삭제됨 - 관리자 서버에서만 존재해야 함)
// (관리자용 배팅 결과 처리 API 삭제됨 - 관리자 서버에서만 존재해야 함)

// 수동 배팅 세션 생성 API (테스트용)
app.post('/api/betting/create-session', async (req, res) => {
    try {
        const { date, gameNumber, inning = 1 } = req.body;
        
        if (!date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '날짜와 경기 번호가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 새로운 배팅 세션 생성
        const newSession = {
            date: date,
            gameNumber: parseInt(gameNumber),
            inning: parseInt(inning),
            status: 'active',
            startedAt: new Date(),
            createdAt: new Date()
        };
        
        await bettingCollection.insertOne(newSession);
        
        console.log(`🔧 수동 배팅 세션 생성: ${date} 경기 ${gameNumber} ${inning}회`);
        console.log('📊 생성된 세션:', newSession);
        
        res.json({
            success: true,
            message: '배팅 세션이 생성되었습니다.',
            session: newSession
        });
    } catch (error) {
        console.error('배팅 세션 생성 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 세션 생성 중 오류가 발생했습니다.'
        });
    }
});

// 배팅 결과 조회 API
app.get('/api/betting/results', async (req, res) => {
    try {
        const { date, gameNumber } = req.query;
        
        if (!date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '날짜와 경기 번호가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 배팅 세션 조회
        const session = await bettingCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        if (!session) {
            return res.status(404).json({
                success: false,
                message: '배팅 세션을 찾을 수 없습니다.'
            });
        }
        
        res.json({
            success: true,
            session: session,
            stats: {
                winnerCount: session.winnerCount || 0,
                totalPrize: session.totalPrize || 0,
                isProcessed: session.isProcessed || false,
                result: session.result || null
            }
        });
    } catch (error) {
        console.error('배팅 결과 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '결과 조회 중 오류가 발생했습니다.'
        });
    }
});

// 기부 처리 API
app.post('/api/donation', async (req, res) => {
    try {
        const { userId, userName, donationAmount, percentage, finalPoints, gameDate, gameNumber, winAmount } = req.body;
        
        if (!userId || !userName || !donationAmount || !percentage || !finalPoints || !gameDate || !gameNumber || !winAmount) {
            return res.status(400).json({ 
                success: false, 
                message: '필수 정보가 누락되었습니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const userCollection = mongoose.connection.db.collection('game-member');
        const donationCollection = mongoose.connection.db.collection('game-donations');
        
        // 기부 데이터 생성
        const donationData = {
            userId: userId,
            userName: userName,
            amount: donationAmount,
            percentage: percentage,
            gameDate: gameDate,
            gameNumber: parseInt(gameNumber),
            winAmount: winAmount,
            finalPoints: finalPoints,
            createdAt: new Date()
        };
        
        // 기부 컬렉션에 저장
        await donationCollection.insertOne(donationData);
        
        // 사용자 포인트 업데이트
        const result = await userCollection.updateOne(
            { userId: userId },
            { $set: { points: finalPoints } }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        console.log(`기부 처리: ${userName} - ${donationAmount}포인트 (${percentage}%)`);
        
        res.json({
            success: true,
            message: '기부가 완료되었습니다.',
            donationAmount: donationAmount,
            percentage: percentage,
            finalPoints: finalPoints
        });
    } catch (error) {
        console.error('기부 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '기부 처리 중 오류가 발생했습니다.'
        });
    }
});

// 기부 조회 API (사용자별)
app.get('/api/donations/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자 ID가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const donationCollection = mongoose.connection.db.collection('game-donations');
        
        // 사용자별 기부 내역 조회
        const donations = await donationCollection.find({ userId: userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        res.json({
            success: true,
            donations: donations,
            totalCount: donations.length,
            totalAmount: donations.reduce((sum, donation) => sum + donation.amount, 0)
        });
    } catch (error) {
        console.error('기부 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '기부 조회 중 오류가 발생했습니다.'
        });
    }
});

// 기부 통계 API (전체)
app.get('/api/donations/stats', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const donationCollection = mongoose.connection.db.collection('game-donations');
        
        // 전체 기부 통계 조회
        const totalDonations = await donationCollection.countDocuments();
        const totalAmount = await donationCollection.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray();
        
        // 최근 기부 내역 (최근 10개)
        const recentDonations = await donationCollection.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();
        
        res.json({
            success: true,
            stats: {
                totalDonations: totalDonations,
                totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
                recentDonations: recentDonations
            }
        });
    } catch (error) {
        console.error('기부 통계 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '기부 통계 조회 중 오류가 발생했습니다.'
        });
    }
});

// realtime-monitoring 컬렉션에서 pointsPerWinner 조회 API
app.get('/api/realtime-monitoring/points-per-winner', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const realtimeCollection = mongoose.connection.db.collection('realtime-monitoring');
        
        // realtime-monitoring 컬렉션에서 pointsPerWinner 값 조회
        const monitoringData = await realtimeCollection.findOne({});
        
        if (monitoringData && monitoringData.pointsPerWinner) {
            res.json({
                success: true,
                pointsPerWinner: monitoringData.pointsPerWinner
            });
        } else {
            // 기본값 설정
            res.json({
                success: true,
                pointsPerWinner: 4000 // 기본값
            });
        }
    } catch (error) {
        console.error('pointsPerWinner 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: 'pointsPerWinner 조회 중 오류가 발생했습니다.',
            pointsPerWinner: 4000 // 오류 시 기본값
        });
    }
}); 

// 게임 진행 관리 API들 (관리자용)

// 1. 베팅 시작 API
app.put('/api/admin/game/:gameNumber/start-betting', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 베팅 시작 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    bettingStart: '시작',
                    progressStatus: '경기중',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 베팅 시작: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({
            success: true,
            message: '베팅이 시작되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                bettingStart: game.bettingStart,
                progressStatus: game.progressStatus
            }
        });
    } catch (error) {
        console.error('베팅 시작 오류:', error);
        res.status(500).json({
            success: false,
            message: '베팅 시작 중 오류가 발생했습니다.'
        });
    }
});

// 2. 베팅 종료 API
app.put('/api/admin/game/:gameNumber/stop-betting', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 베팅 종료 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    bettingStop: '시작',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 베팅 종료: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({
            success: true,
            message: '베팅이 종료되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                bettingStop: game.bettingStop
            }
        });
    } catch (error) {
        console.error('베팅 종료 오류:', error);
        res.status(500).json({
            success: false,
            message: '베팅 종료 중 오류가 발생했습니다.'
        });
    }
});

// 3. 게임 종료 API
app.put('/api/admin/game/:gameNumber/end-game', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        const { predictionResult } = req.body; // 예측 결과 (선택사항)
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 게임 종료 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    progressStatus: '경기종료',
                    predictionResult: predictionResult || '',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 게임 종료: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({
            success: true,
            message: '게임이 종료되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                progressStatus: game.progressStatus,
                predictionResult: game.predictionResult
            }
        });
    } catch (error) {
        console.error('게임 종료 오류:', error);
        res.status(500).json({
            success: false,
            message: '게임 종료 중 오류가 발생했습니다.'
        });
    }
});

// 4. 게임 상태 조회 API (관리자용)
app.get('/api/admin/games/status', async (req, res) => {
    try {
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 오늘의 모든 경기 조회
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const todayGames = await teamGamesCollection.find({ date: todayString }).sort({ gameNumber: 1 }).toArray();
        
        res.json({
            success: true,
            date: todayString,
            games: todayGames.map(game => ({
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                startTime: game.startTime,
                endTime: game.endTime,
                gameStatus: game.gameStatus,
                progressStatus: game.progressStatus,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop,
                predictionResult: game.predictionResult
            }))
        });
    } catch (error) {
        console.error('게임 상태 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게임 상태 조회 중 오류가 발생했습니다.'
        });
    }
});

// 5. 게임 상태 초기화 API (관리자용)
app.put('/api/admin/game/:gameNumber/reset', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 상태 초기화
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    progressStatus: '경기전',
                    bettingStart: '중지',
                    bettingStop: '중지',
                    predictionResult: '',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 게임 상태 초기화: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({
            success: true,
            message: '게임 상태가 초기화되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                progressStatus: game.progressStatus,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop
            }
        });
    } catch (error) {
        console.error('게임 상태 초기화 오류:', error);
        res.status(500).json({
            success: false,
            message: '게임 상태 초기화 중 오류가 발생했습니다.'
        });
    }
});

// 특정 게임 정보 조회 API
app.get('/api/game/:date/:gameNumber', async (req, res) => {
    try {
        const { date, gameNumber } = req.params;
        
        console.log('🔍 게임 정보 조회:', { date, gameNumber });
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const game = await teamGamesCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        if (!game) {
            return res.status(404).json({
                success: false,
                message: '해당 경기를 찾을 수 없습니다.'
            });
        }
        
        res.json({
            success: true,
            game: game
        });
        
    } catch (error) {
        console.error('❌ 게임 정보 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게임 정보 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 수동 배팅 세션 생성 API (테스트용)
app.post('/api/betting/create-session', async (req, res) => {
    try {
        const { date, gameNumber, inning = 1 } = req.body;
        
        if (!date || !gameNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '날짜와 경기 번호가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 준비되지 않았습니다.' 
            });
        }
        
        const bettingCollection = mongoose.connection.db.collection('betting-sessions');
        
        // 새로운 배팅 세션 생성
        const newSession = {
            date: date,
            gameNumber: parseInt(gameNumber),
            inning: parseInt(inning),
            status: 'active',
            startedAt: new Date(),
            createdAt: new Date()
        };
        
        await bettingCollection.insertOne(newSession);
        
        console.log(`🔧 수동 배팅 세션 생성: ${date} 경기 ${gameNumber} ${inning}회`);
        console.log('📊 생성된 세션:', newSession);
        
        res.json({
            success: true,
            message: '배팅 세션이 생성되었습니다.',
            session: newSession
        });
    } catch (error) {
        console.error('배팅 세션 생성 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 세션 생성 중 오류가 발생했습니다.'
        });
    }
});

// 오늘의 경기 조회 API
app.get('/api/today-games', async (req, res) => {
    try {
        console.log('📅 오늘의 경기 조회 요청');
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('❌ MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ 
                success: false,
                games: [],
                message: 'DB 연결 오류'
            });
        }
        
        // 날짜 파라미터 사용 (클라이언트에서 전달) 또는 오늘 날짜
        const dateParam = req.query.date;
        let todayString;
        
        if (dateParam) {
            todayString = dateParam;
        } else {
            // 한국 시간대로 현재 날짜 계산
            todayString = getKoreaDateString();
        }
        
        console.log('🔍 서버 - 조회 조건:', {
            date: todayString,
            requestDate: dateParam
        });
        
        // team-games 컬렉션에서 직접 조회
        let teamGames = [];
        
        try {
            console.log('🔍 MongoDB 연결 상태:', mongoose.connection.readyState);
            console.log('🔍 데이터베이스 이름:', mongoose.connection.db.databaseName);
            
            // team-games 컬렉션에서 해당 날짜의 경기 조회
            const teamGamesCollection = mongoose.connection.db.collection('team-games');
            console.log('🔍 team-games 컬렉션 객체:', !!teamGamesCollection);
            
            // 🔍 모든 컬렉션 이름 확인
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('🔍 데이터베이스의 모든 컬렉션:', collections.map(c => c.name));
            
            // 🔍 team-games 컬렉션의 전체 데이터 수 확인
            const totalCount = await teamGamesCollection.countDocuments();
            console.log('🔍 team-games 컬렉션 총 문서 수:', totalCount);
            
            // 🔍 전체 데이터 확인 (처음 5개)
            const allGames = await teamGamesCollection.find({}).limit(5).toArray();
            console.log('🔍 team-games 컬렉션의 샘플 데이터:', JSON.stringify(allGames, null, 2));
            
            // 🔍 2025-07-19 날짜의 데이터 확인
            const specificDateGames = await teamGamesCollection.find({ date: "2025-07-19" }).toArray();
            console.log('🔍 2025-07-19 날짜의 경기 수:', specificDateGames.length);
            console.log('🔍 2025-07-19 날짜의 경기:', JSON.stringify(specificDateGames, null, 2));
             
            // 현재 날짜로 경기 조회
            teamGames = await teamGamesCollection.find({ date: todayString }).sort({ gameNumber: 1, number: 1 }).toArray();
              
              console.log('📋 오늘 날짜 경기 조회 결과:', teamGames.map(game => ({
                  date: game.date,
                  gameNumber: game.gameNumber,
                  matchup: game.matchup,
                  bettingStart: game.bettingStart
              })));
            
            console.log(`📅 ${todayString} 날짜의 경기: ${teamGames.length}개`);
            
            if (teamGames.length === 0) {
                console.log(`📅 ${todayString} 날짜에 경기가 없습니다.`);
                
                // 🔍 비슷한 날짜의 데이터가 있는지 확인
                const recentGames = await teamGamesCollection.find({}).sort({ date: -1 }).limit(3).toArray();
                console.log('🔍 최근 3개 경기 날짜:', recentGames.map(game => ({
                    date: game.date,
                    gameNumber: game.gameNumber,
                    matchup: game.matchup
                })));
            }
        } catch (error) {
            console.log('❌ team-games 컬렉션 조회 실패:', error.message);
        }
        
        if (teamGames && teamGames.length > 0) {
            console.log(`✅ ${todayString}의 경기 조회 완료: ${teamGames.length}개 경기`);
            console.log('📋 경기 목록:', teamGames.map(g => `${g.gameNumber}. ${g.matchup} (${g.gameStatus})`));
            
            // 클라이언트 호환성을 위해 데이터 변환
            const convertedGames = teamGames.map(game => {
                // 필드명 통일 처리
                const gameNumber = game.gameNumber || game.number || 1;
                const matchup = game.matchup || `${game.homeTeam || ''} vs ${game.awayTeam || ''}`;
                const homeTeam = game.homeTeam || (game.matchup ? game.matchup.split(' vs ')[0] : '');
                const awayTeam = game.awayTeam || (game.matchup ? game.matchup.split(' vs ')[1] : '');
                const gameStatus = game.gameStatus || game.situationStatus || '정상게임';
                const progressStatus = game.progressStatus || '경기전';
                
                return {
                    number: gameNumber,
                    gameNumber: gameNumber,
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    matchup: matchup,
                    startTime: game.startTime || '18:00',
                    endTime: game.endTime || '21:00',
                    noGame: gameStatus,
                    progressStatus: progressStatus,
                    gameType: game.gameType || 'batter',
                    bettingStart: game.bettingStart || '중지',
                    bettingStop: game.bettingStop || '중지',
                    predictionResult: game.predictionResult || '',
                    date: game.date || game.gameDate || todayString,
                    isActive: progressStatus === '경기중' || progressStatus === '경기전'
                };
            });
            
            res.json({ 
                success: true,
                games: convertedGames 
            });
        } else {
            console.log(`❌ ${todayString} 날짜의 경기 데이터가 없습니다.`);
            
            res.json({ 
                success: true,
                games: [] 
            });
        }
    } catch (error) {
        console.error('❌ 오늘의 경기 조회 오류:', error);
        res.status(500).json({ 
            success: false,
            games: [],
            message: '경기 조회 중 오류가 발생했습니다.',
            error: error.message 
        });
    }
});

// 오늘의 경기 조회 API (기존)
app.get('/api/today-games', async (req, res) => {
    try {
        console.log('📅 오늘의 경기 조회 요청');
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('❌ MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ 
                success: false,
                games: [],
                message: 'DB 연결 오류'
            });
        }
        
        // 날짜 파라미터 사용 (클라이언트에서 전달) 또는 오늘 날짜
        const dateParam = req.query.date;
        let todayString;
        
        if (dateParam) {
            todayString = dateParam;
        } else {
            // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
            const today = new Date();
            const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
            todayString = koreaTime.getFullYear().toString() + 
                         '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                         '-' + String(koreaTime.getDate()).padStart(2, '0');
        }
        
        console.log('🔍 서버 - 조회 조건:', {
            date: todayString,
            requestDate: dateParam
        });
        
        // team-games 컬렉션에서 직접 조회
        let teamGames = [];
        
        try {
            // team-games 컬렉션에서 해당 날짜의 경기 조회
            const teamGamesCollection = mongoose.connection.db.collection('team-games');
            
                         // 🔍 디버깅: 전체 데이터 확인
             const allGames = await teamGamesCollection.find({}).limit(5).toArray();
             console.log('🔍 team-games 컬렉션의 샘플 데이터:', allGames.map(game => ({
                 _id: game._id,
                 date: game.date,
                 gameDate: game.gameDate,
                 gameNumber: game.gameNumber,
                 number: game.number,
                 matchup: game.matchup,
                 homeTeam: game.homeTeam,
                 awayTeam: game.awayTeam,
                 gameStatus: game.gameStatus,
                 progressStatus: game.progressStatus,
                 situationStatus: game.situationStatus,
                 bettingStart: game.bettingStart,
                 bettingStop: game.bettingStop,
                 allFields: Object.keys(game)
             })));
             
                           // 일단 전체 경기 조회 (날짜와 관계없이 모든 경기 표시)
              teamGames = await teamGamesCollection.find({}).sort({ gameNumber: 1, number: 1 }).toArray();
              
              console.log('📋 전체 경기 조회 결과:', teamGames.map(game => ({
                  date: game.date,
                  gameNumber: game.gameNumber,
                  matchup: game.matchup,
                  bettingStart: game.bettingStart
              })));
            
            console.log(`📅 ${todayString} 날짜의 경기: ${teamGames.length}개`);
            
            if (teamGames.length === 0) {
                console.log(`📅 ${todayString} 날짜에 경기가 없습니다.`);
                
                // 🔍 비슷한 날짜의 데이터가 있는지 확인
                const recentGames = await teamGamesCollection.find({}).sort({ date: -1 }).limit(3).toArray();
                console.log('🔍 최근 3개 경기 날짜:', recentGames.map(game => ({
                    date: game.date,
                    gameNumber: game.gameNumber,
                    matchup: game.matchup
                })));
            }
        } catch (error) {
            console.log('❌ team-games 컬렉션 조회 실패:', error.message);
        }
        
        if (teamGames && teamGames.length > 0) {
            console.log(`✅ ${todayString}의 경기 조회 완료: ${teamGames.length}개 경기`);
            console.log('📋 경기 목록:', teamGames.map(g => `${g.gameNumber}. ${g.matchup} (${g.gameStatus})`));
            
            // 클라이언트 호환성을 위해 데이터 변환
            const convertedGames = teamGames.map(game => {
                // 필드명 통일 처리
                const gameNumber = game.gameNumber || game.number || 1;
                const matchup = game.matchup || `${game.homeTeam || ''} vs ${game.awayTeam || ''}`;
                const homeTeam = game.homeTeam || (game.matchup ? game.matchup.split(' vs ')[0] : '');
                const awayTeam = game.awayTeam || (game.matchup ? game.matchup.split(' vs ')[1] : '');
                const gameStatus = game.gameStatus || game.situationStatus || '정상게임';
                const progressStatus = game.progressStatus || '경기전';
                
                return {
                    number: gameNumber,
                    gameNumber: gameNumber,
                    homeTeam: homeTeam,
                    awayTeam: awayTeam,
                    matchup: matchup,
                    startTime: game.startTime || '18:00',
                    endTime: game.endTime || '21:00',
                    noGame: gameStatus,
                    progressStatus: progressStatus,
                    gameType: game.gameType || 'batter',
                    bettingStart: game.bettingStart || '중지',
                    bettingStop: game.bettingStop || '중지',
                    predictionResult: game.predictionResult || '',
                    date: game.date || game.gameDate || todayString,
                    isActive: progressStatus === '경기중' || progressStatus === '경기전'
                };
            });
            
            res.json({ 
                success: true,
                games: convertedGames 
            });
        } else {
            console.log(`❌ ${todayString} 날짜의 경기 데이터가 없습니다.`);
            
            res.json({ 
                success: true,
                games: [] 
            });
        }
    } catch (error) {
        console.error('❌ 오늘의 경기 조회 오류:', error);
        res.status(500).json({ 
            success: false,
            games: [],
            message: '경기 조회 중 오류가 발생했습니다.',
            error: error.message 
        });
    }
});

// 경기 날짜를 오늘로 업데이트하는 API
app.post('/api/update-games-to-today', async (req, res) => {
    try {
        console.log('📅 경기 날짜를 오늘로 업데이트 요청');
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false,
                message: 'DB 연결 오류'
            });
        }
        
        // 한국 시간대로 현재 날짜 계산
        const todayString = getKoreaDateString();
        
        console.log('🔄 업데이트할 날짜:', todayString);
        
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        
        // 기존 데이터 확인
        const existingGames = await teamGamesCollection.find({}).toArray();
        console.log('📋 기존 경기 데이터:', existingGames.map(game => ({
            _id: game._id,
            date: game.date,
            gameNumber: game.gameNumber,
            matchup: game.matchup
        })));
        
        // 모든 경기의 날짜를 오늘로 업데이트
        const updateResult = await teamGamesCollection.updateMany(
            {}, // 모든 문서
            { 
                $set: { 
                    date: todayString,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log('✅ 업데이트 완료:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            newDate: todayString
        });
        
        // 업데이트된 데이터 확인
        const updatedGames = await teamGamesCollection.find({}).toArray();
        console.log('📋 업데이트된 경기 데이터:', updatedGames.map(game => ({
            _id: game._id,
            date: game.date,
            gameNumber: game.gameNumber,
            matchup: game.matchup
        })));
        
        res.json({
            success: true,
            message: `${updateResult.modifiedCount}개 경기의 날짜가 ${todayString}로 업데이트되었습니다.`,
            updatedCount: updateResult.modifiedCount,
            newDate: todayString,
            games: updatedGames.map(game => ({
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                date: game.date,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop
            }))
        });
        
    } catch (error) {
        console.error('❌ 날짜 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '날짜 업데이트 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 오늘의 경기 조회 API