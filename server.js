require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            return false;
        }
        
        console.log('🔗 연결 문자열 확인:', mongoURI.substring(0, 20) + '...');
        
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
        
        await mongoose.connect(mongoURI, connectionOptions);
        
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
        timestamp: new Date().toISOString()
    });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
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

// 포인트 충전 스키마 정의
const chargingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    createdAt: { type: Date, default: Date.now }
});

const Charging = mongoose.model('Charging', chargingSchema, 'game-charging');

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

// 에러 핸들링
app.use((err, req, res, next) => {
    console.error('서버 오류:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 404 핸들링
app.use((req, res) => {
    res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
}); 