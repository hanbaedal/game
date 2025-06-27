require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const redis = require('redis');
const mysql = require('mysql2/promise');
const connectDB = require('./config/db');

const app = express();
const port = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Twilio 클라이언트 초기화 (주석 처리)
// const twilioClient = twilio(
//     process.env.TWILIO_ACCOUNT_SID,
//     process.env.TWILIO_AUTH_TOKEN
// );

// Redis 클라이언트 초기화 (주석 처리)
// const redisClient = Redis.createClient({
//     url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
//     password: process.env.REDIS_PASSWORD
// });

// redisClient.on('error', (err) => console.error('Redis Client Error', err));
// redisClient.connect();

// MySQL 연결 풀 생성 (주석 처리)
// const pool = mysql.createPool({
//     host: process.env.DB_HOST || 'localhost',
//     user: process.env.DB_USER || 'root',
//     password: process.env.DB_PASSWORD || '',
//     database: process.env.DB_NAME || 'baseball_fan',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// MongoDB 연결 설정 - CloudType 배포용
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        // CloudType 환경에서 MongoDB 정보 가져오기
        const username = process.env.MONGODB_USERNAME || 'ppadun9_user';
        const password = process.env.MONGODB_PASSWORD || 'ppadun8267';
        const database = process.env.MONGODB_DATABASE || 'member-management';
        const host = process.env.MONGODB_HOST || 'mongodb';
        const port = process.env.MONGODB_PORT || '27017';
        
        // MongoDB URI 구성 (CloudType 환경)
        const mongoURI = process.env.MONGODB_URI || 
            `mongodb://${username}:${password}@${host}:${port}/${database}`;
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // CloudType 환경에서 안정적인 연결을 위한 옵션들
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0
        });
        
        console.log('MongoDB 연결 성공!');
        console.log(`데이터베이스: ${mongoose.connection.name}`);
        console.log(`사용자: ${username}`);
    } catch (error) {
        console.error('MongoDB 연결 실패:', error);
        process.exit(1);
    }
};

// 서버 시작 시 MongoDB 연결
connectToMongoDB();

// 기본 라우팅
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/list', (req, res) => {
    res.sendFile(path.join(__dirname, 'list.html'));
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
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 배팅 스키마 정의
const betSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    matchId: { type: String, required: true },
    gameType: { type: String, required: true },
    bettingType: { type: String, required: true },
    points: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'WIN', 'LOSE'], default: 'PENDING' },
    winPoints: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

// 배팅 모델 생성
const Bet = mongoose.model('Bet', betSchema, 'bets');

// Donation 스키마 정의
const donationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    points: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['manual', 'auto_donate'], default: 'manual' },
    source: { type: String, enum: ['direct', 'betting_win'], default: 'direct' }
});

const Donation = mongoose.model('Donation', donationSchema);

// 게임 기록 스키마 정의
const gameRecordSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    gameType: { type: String, required: true },
    bettingType: { type: String, required: true },
    bettingPoints: { type: Number, required: true },
    result: { type: String, enum: ['WIN', 'LOSE'], required: true },
    winPoints: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

// 게임 기록 모델 생성
const GameRecord = mongoose.model('GameRecord', gameRecordSchema, 'game_records');

// 기부 포인트 스키마 정의
const donationPointsSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    donationAmount: { type: Number, required: true },
    originalPoints: { type: Number, required: true },
    remainingPoints: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

// 기부 포인트 모델 생성
const DonationPoints = mongoose.model('DonationPoints', donationPointsSchema, 'donation_points');

// 출석부 스키마 정의
const attendanceSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: String, required: true },
    points: { type: Number, default: 100 },
    month: { type: String, required: true },
    year: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// 출석부 모델 생성
const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendances');

// ID 중복 확인 API
app.post('/api/check-id', async (req, res) => {
    const { userId } = req.body;
    
    try {
        // 입력값 검증
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: '아이디를 입력해주세요.' 
            });
        }

        // 아이디 길이 검사 (4~16자)
        if (userId.length < 4 || userId.length > 16) {
            return res.status(400).json({
                success: false,
                message: '아이디는 4~16자 사이여야 합니다.'
            });
        }

        // 영문자와 숫자만 허용
        if (!/^[a-zA-Z0-9]+$/.test(userId)) {
            return res.status(400).json({
                success: false,
                message: '아이디는 영문자와 숫자만 사용 가능합니다.'
            });
        }

        const exists = await User.exists({ userId });
        res.json({
            success: true,
            available: !exists,
            message: exists ? '이미 사용 중인 아이디입니다.' : '사용 가능한 아이디입니다.'
        });
    } catch (error) {
        console.error('ID 중복 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 회원가입 API
app.post('/api/users', async (req, res) => {
    try {
        const userData = req.body;

        // 필수 필드 검증
        const requiredFields = {
            userId: '아이디',
            password: '비밀번호',
            name: '이름',
            email: '이메일',
            phone: '휴대폰 번호',
            favoriteTeam: '응원하는 팀'
        };

        const missingFields = [];
        for (const [field, fieldName] of Object.entries(requiredFields)) {
            if (!userData[field]) {
                missingFields.push(fieldName);
            }
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `다음 항목을 입력해주세요: ${missingFields.join(', ')}`
            });
        }

        // ID 중복 확인
        const exists = await User.exists({ userId: userData.userId });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: '이미 사용 중인 아이디입니다.'
            });
        }

        // 비밀번호 유효성 검사 (8~16자, 영문/숫자/특수문자)
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,16}$/;
        if (!passwordRegex.test(userData.password)) {
            return res.status(400).json({
                success: false,
                message: '비밀번호는 8~16자의 영문, 숫자, 특수문자를 포함해야 합니다.'
            });
        }

        // 이메일 형식 검증
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(userData.email)) {
            return res.status(400).json({
                success: false,
                message: '올바른 이메일 형식이 아닙니다.'
            });
        }

        // 휴대폰 번호 형식 검증
        const phoneRegex = /^010\d{8}$/;
        const cleanPhone = userData.phone.replace(/-/g, '');
        if (!phoneRegex.test(cleanPhone)) {
            return res.status(400).json({
                success: false,
                message: '올바른 휴대폰 번호 형식이 아닙니다.'
            });
        }

        // 새 사용자 생성
        const user = new User({
            ...userData,
            phone: cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: '회원가입이 완료되었습니다.'
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        // 사용자 찾기
        const user = await User.findOne({ userId });
        
        if (!user) {
            return res.json({ 
                success: false, 
                message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
            });
        }
        
        // 비밀번호 확인
        if (user.password !== password) {
            return res.json({ 
                success: false, 
                message: '아이디 또는 비밀번호가 일치하지 않습니다.' 
            });
        }
        
        // 로그인 성공
        res.json({
            success: true,
            message: '로그인 성공',
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                points: user.points,
                favoriteTeam: user.favoriteTeam
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.json({ 
            success: false, 
            message: '로그인 처리 중 오류가 발생했습니다.' 
        });
    }
});

// 게스트 로그인 API
app.post('/api/guest-login', async (req, res) => {
    try {
        const guestUser = {
            userId: 'guest_' + Date.now(),
            name: '게스트',
            points: 1000
        };
        
        // 게스트 사용자 정보를 데이터베이스에 저장
        const user = new User(guestUser);
        await user.save();
        
        res.json({
            success: true,
            user: guestUser
        });
    } catch (error) {
        console.error('게스트 로그인 오류:', error);
        res.json({ 
            success: false, 
            message: '게스트 로그인 처리 중 오류가 발생했습니다.' 
        });
    }
});

// 포인트 업데이트 API
app.post('/api/update-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        // 사용자 찾기 및 포인트 업데이트
        const user = await User.findOne({ userId });
        if (!user) {
            return res.json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        
        user.points = points;
        await user.save();
        
        res.json({ success: true, message: '포인트가 업데이트되었습니다.' });
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
        res.json({ success: false, message: '포인트 업데이트 중 오류가 발생했습니다.' });
    }
});

// 리스트 API
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }); // 비밀번호 제외
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        console.error('리스트 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 단일 사용자 조회 API
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId }, '-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 아이디 찾기 API
app.post('/api/find-id', async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: '이름과 전화번호를 모두 입력해주세요.'
            });
        }

        const user = await User.findOne({ name, phone });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '일치하는 회원 정보를 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            userId: user.userId,
            message: '아이디 찾기 성공'
        });
    } catch (error) {
        console.error('아이디 찾기 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 비밀번호 찾기 API
app.post('/api/find-password', async (req, res) => {
    try {
        const { userId, name, phone } = req.body;

        if (!userId || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: '아이디, 이름, 전화번호를 모두 입력해주세요.'
            });
        }

        const user = await User.findOne({ userId, name, phone });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '일치하는 회원 정보를 찾을 수 없습니다.'
            });
        }

        // 비밀번호 마스킹 처리 (앞 4자리만 표시)
        const maskedPassword = user.password.slice(0, 4) + '*'.repeat(user.password.length - 4);

        res.json({
            success: true,
            maskedPassword: maskedPassword,
            message: '비밀번호 찾기 성공'
        });
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 출석 체크 API
app.post('/api/attendance', async (req, res) => {
    try {
        const { userId, date } = req.body;
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        if (!userId || !date) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }

        // 사용자 찾기
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 이미 출석했는지 확인
        const existingAttendance = await Attendance.findOne({ userId, date });
        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: '이미 출석한 날짜입니다.'
            });
        }

        // 출석 기록 저장
        const attendance = new Attendance({
            userId,
            date,
            points: 100,
            month: month.toString(),
            year: year.toString()
        });
        await attendance.save();

        // 사용자 포인트 업데이트
        user.points = (user.points || 0) + 100;
        await user.save();

        // 이번달 출석 현황 조회
        const monthAttendance = await Attendance.find({
            userId,
            month: month.toString(),
            year: year.toString()
        });

        // 전체 출석 현황 조회
        const totalAttendance = await Attendance.find({ userId });

        res.json({
            success: true,
            message: '출석이 완료되었습니다.',
            points: 100,
            totalPoints: user.points,
            monthAttendance: monthAttendance.length,
            totalAttendance: totalAttendance.length,
            monthPoints: monthAttendance.reduce((sum, record) => sum + record.points, 0),
            totalPoints: totalAttendance.reduce((sum, record) => sum + record.points, 0)
        });
    } catch (error) {
        console.error('출석 체크 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 출석 기록 조회 API
app.get('/api/attendance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        // 이번달 출석 기록 조회
        const monthAttendance = await Attendance.find({
            userId,
            month: month.toString(),
            year: year.toString()
        });

        // 전체 출석 기록 조회
        const totalAttendance = await Attendance.find({ userId });

        // 최근 30일 기록 조회
        const recentAttendance = await Attendance.find({ userId })
            .sort({ date: -1 })
            .limit(30);

        res.json({
            success: true,
            monthAttendance: monthAttendance.length,
            totalAttendance: totalAttendance.length,
            monthPoints: monthAttendance.reduce((sum, record) => sum + record.points, 0),
            totalPoints: totalAttendance.reduce((sum, record) => sum + record.points, 0),
            attendances: recentAttendance
        });
    } catch (error) {
        console.error('출석 기록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// KBO 배팅 설정
const kboOdds = {
    'first': { success: 260, odds: 3.8 },    // 1루타 확률 (약 260명 성공 예상)
    'second': { success: 130, odds: 7.5 },   // 2루타 확률 (약 130명 성공 예상)
    'third': { success: 65, odds: 15.0 },    // 3루타 확률 (약 65명 성공 예상)
    'homerun': { success: 40, odds: 25.0 },  // 홈런 확률 (약 40명 성공 예상)
    'out': { success: 500, odds: 1.8 }       // 아웃 확률 (약 500명 성공 예상)
};

// 배팅 처리 API
app.post('/api/bet', async (req, res) => {
    try {
        const { userId, bettingPoints, matchId, gameType, bettingType } = req.body;
        console.log('[배팅 요청]', { userId, bettingPoints, matchId, gameType, bettingType });

        // 1. 사용자 조회
        const user = await User.findOne({ userId });
        if (!user) {
            throw new Error(`사용자를 찾을 수 없습니다. (ID: ${userId})`);
        }
        console.log('[사용자 조회 완료]', user);

        // 2. 포인트 검증
        const numBettingPoints = parseInt(bettingPoints);
        if (isNaN(numBettingPoints) || numBettingPoints <= 0) {
            throw new Error('올바른 배팅 포인트를 입력해주세요.');
        }

        if (!user.points || user.points < numBettingPoints) {
            throw new Error(`보유 포인트가 부족합니다. (보유: ${user.points}, 배팅: ${numBettingPoints})`);
        }

        // 3. 배팅 유형 검증
        if (!kboOdds[bettingType]) {
            throw new Error(`올바르지 않은 배팅 유형입니다. (${bettingType})`);
        }

        // 4. 배팅 포인트 차감
        user.points -= numBettingPoints;

        // 5. 승패 결정 (KBO 확률 기반)
        const randomValue = Math.random() * 1000;
        const isWin = randomValue < kboOdds[bettingType].success;
        console.log('[승패 결정]', { randomValue, isWin, successRate: kboOdds[bettingType].success });

        // 6. 승리 시 포인트 추가 및 자동 기부
        let winPoints = 0;
        let donatedPoints = 0;
        if (isWin) {
            winPoints = Math.floor(numBettingPoints * kboOdds[bettingType].odds);
            user.points += winPoints;
            
            // 승리 금액의 10%를 자동 기부
            donatedPoints = Math.floor(winPoints * 0.1);
            user.points -= donatedPoints;

            // 기부 기록 저장
            const donation = new Donation({
                userId: user.userId,
                points: donatedPoints,
                createdAt: new Date(),
                type: 'auto_donate',
                source: 'betting_win'
            });
            await donation.save();
            console.log('[기부 기록 저장 완료]', donation);
        }

        // 7. 데이터베이스 업데이트
        await user.save();
        console.log('[사용자 포인트 업데이트 완료]', { userId: user.userId, points: user.points });

        // 8. 배팅 기록 저장
        const bet = new Bet({
            userId: user.userId,
            matchId: matchId || 'default_match',
            gameType: gameType || 'default_game',
            bettingType: bettingType,
            points: numBettingPoints,
            status: isWin ? 'WIN' : 'LOSE',
            winPoints: isWin ? winPoints : 0,
            createdAt: new Date()
        });
        
        // 배팅 기록 저장
        const savedBet = await bet.save();
        console.log('[배팅 기록 저장 완료]', savedBet);

        // 9. JSON 응답 전송
        res.json({
            success: true,
            message: isWin ? '배팅에 성공했습니다!' : '배팅에 실패했습니다.',
            currentPoints: user.points,
            winPoints: winPoints,
            donatedPoints: donatedPoints,
            status: isWin ? 'WIN' : 'LOSE',
            bettingType: bettingType,
            odds: kboOdds[bettingType].odds,
            successRate: kboOdds[bettingType].success / 10
        });

    } catch (error) {
        console.error('[배팅 처리 오류]:', error);
        res.status(400).json({
            success: false,
            message: error.message || '배팅 처리 중 오류가 발생했습니다.'
        });
    }
});

// 기부 처리 API
app.post('/api/donate', async (req, res) => {
    try {
        const { userId, points, donationAmount } = req.body;
        
        // 사용자 찾기 및 포인트 업데이트
        const user = await User.findOne({ userId });
        if (!user) {
            return res.json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }
        
        // 포인트 업데이트 및 기부 내역 저장
        user.points = points;
        if (!user.donations) {
            user.donations = [];
        }
        user.donations.push({
            amount: donationAmount,
            date: new Date()
        });
        
        await user.save();
        
        res.json({ success: true, message: '기부가 처리되었습니다.' });
    } catch (error) {
        console.error('기부 처리 오류:', error);
        res.json({ success: false, message: '기부 처리 중 오류가 발생했습니다.' });
    }
});

// 기부 내역 조회 API
app.get('/api/donations', async (req, res) => {
    try {
        const donations = await Donation.find()
            .sort({ createdAt: -1 })
            .limit(10);
        
        res.json({
            success: true,
            donations: donations
        });
    } catch (error) {
        console.error('[기부 내역 조회 오류]:', error);
        res.status(500).json({
            success: false,
            message: '기부 내역 조회 중 오류가 발생했습니다.'
        });
    }
});

// 게임 기록 저장 API
app.post('/api/game-record', async (req, res) => {
    try {
        const { userId, gameType, bettingType, bettingPoints, result, winPoints } = req.body;
        console.log('[게임 기록 저장 요청]', { userId, gameType, bettingType, bettingPoints, result, winPoints });

        const gameRecord = new GameRecord({
            userId,
            gameType,
            bettingType,
            bettingPoints,
            result,
            winPoints: result === 'WIN' ? winPoints : 0,
            createdAt: new Date()
        });

        const savedRecord = await gameRecord.save();
        console.log('[게임 기록 저장 완료]', savedRecord);

        res.json({
            success: true,
            message: '게임 기록이 저장되었습니다.',
            record: savedRecord
        });
    } catch (error) {
        console.error('[게임 기록 저장 오류]:', error);
        res.status(400).json({
            success: false,
            message: error.message || '게임 기록 저장 중 오류가 발생했습니다.'
        });
    }
});

// 게임 기록 조회 API
app.get('/api/game-records/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const records = await GameRecord.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            records: records
        });
    } catch (error) {
        console.error('[게임 기록 조회 오류]:', error);
        res.status(500).json({
            success: false,
            message: '게임 기록 조회 중 오류가 발생했습니다.'
        });
    }
});

// 기부 포인트 저장 API
app.post('/api/donation-points', async (req, res) => {
    try {
        const { userId, donationAmount, originalPoints, remainingPoints } = req.body;
        console.log('[기부 포인트 저장 요청]', { userId, donationAmount, originalPoints, remainingPoints });

        const donationPoints = new DonationPoints({
            userId,
            donationAmount,
            originalPoints,
            remainingPoints,
            createdAt: new Date()
        });

        const savedDonation = await donationPoints.save();
        console.log('[기부 포인트 저장 완료]', savedDonation);

        res.json({
            success: true,
            message: '기부 포인트가 저장되었습니다.',
            donation: savedDonation
        });
    } catch (error) {
        console.error('[기부 포인트 저장 오류]:', error);
        res.status(400).json({
            success: false,
            message: error.message || '기부 포인트 저장 중 오류가 발생했습니다.'
        });
    }
});

// 기부 포인트 조회 API
app.get('/api/donation-points/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const donations = await DonationPoints.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            donations: donations
        });
    } catch (error) {
        console.error('[기부 포인트 조회 오류]:', error);
        res.status(500).json({
            success: false,
            message: '기부 포인트 조회 중 오류가 발생했습니다.'
        });
    }
});

// 게시판 스키마 정의
const boardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// 게시판 모델 생성
const Board = mongoose.model('Board', boardSchema, 'boards');

// 게시판 목록 조회 API
app.get('/api/boards', async (req, res) => {
    try {
        const boards = await Board.find()
            .sort({ createdAt: -1 })
            .select('title authorName createdAt');
        
        res.json({
            success: true,
            boards: boards
        });
    } catch (error) {
        console.error('게시판 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시판 상세 조회 API
app.get('/api/boards/:boardId', async (req, res) => {
    try {
        const board = await Board.findById(req.params.boardId);
        if (!board) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }
        res.json({
            success: true,
            board: board
        });
    } catch (error) {
        console.error('게시판 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시판 작성 API
app.post('/api/boards', async (req, res) => {
    try {
        const { title, content, userId, userName } = req.body;

        if (!title || !content || !userId || !userName) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }

        const board = new Board({
            title,
            content,
            authorId: userId,
            authorName: userName
        });

        await board.save();

        res.json({
            success: true,
            message: '게시글이 작성되었습니다.',
            board: board
        });
    } catch (error) {
        console.error('게시판 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시판 수정 API
app.put('/api/boards/:boardId', async (req, res) => {
    try {
        const { title, content, userId } = req.body;
        const board = await Board.findById(req.params.boardId);

        if (!board) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        if (board.authorId !== userId) {
            return res.status(403).json({
                success: false,
                message: '게시글을 수정할 권한이 없습니다.'
            });
        }

        board.title = title;
        board.content = content;
        board.updatedAt = new Date();
        await board.save();

        res.json({
            success: true,
            message: '게시글이 수정되었습니다.',
            board: board
        });
    } catch (error) {
        console.error('게시판 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 게시판 삭제 API
app.delete('/api/boards/:boardId', async (req, res) => {
    try {
        const { userId } = req.body;
        const board = await Board.findById(req.params.boardId);

        if (!board) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }

        if (board.authorId !== userId) {
            return res.status(403).json({
                success: false,
                message: '게시글을 삭제할 권한이 없습니다.'
            });
        }

        await board.deleteOne();

        res.json({
            success: true,
            message: '게시글이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('게시판 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 포인트 충전 API
app.post('/api/charge-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        // 사용자 찾기
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        // 포인트 업데이트
        user.points += points;
        await user.save();

        res.json({ 
            success: true, 
            message: '포인트가 충전되었습니다.',
            points: user.points
        });
    } catch (error) {
        console.error('포인트 충전 오류:', error);
        res.status(500).json({ success: false, message: '포인트 충전 중 오류가 발생했습니다.' });
    }
});

// 인증번호 저장을 위한 임시 객체
const verificationCodes = {};

// 인증번호 전송 API
app.post('/api/send-verification', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        // 중복 확인
        const existingInvite = await Invite.findOne({ phoneNumber });
        if (existingInvite) {
            return res.json({ 
                success: false, 
                message: '이미 초대된 전화번호입니다.' 
            });
        }
        
        // 6자리 랜덤 인증번호 생성
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 인증번호 저장
        const invite = new Invite({
            phoneNumber,
            status: 'pending'
        });
        await invite.save();
        
        res.json({ 
            success: true, 
            code,
            message: '인증번호가 전송되었습니다.' 
        });
    } catch (error) {
        console.error('인증번호 전송 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증번호 전송 중 오류가 발생했습니다.' 
        });
    }
});

// 인증번호 확인 API
app.post('/api/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        // 초대 내역 찾기
        const invite = await Invite.findOne({ 
            phoneNumber,
            status: 'pending'
        });
        
        if (!invite) {
            return res.json({ 
                success: false, 
                message: '유효하지 않은 인증번호입니다.' 
            });
        }
        
        // 초대 상태 업데이트
        invite.status = 'completed';
        await invite.save();
        
        res.json({ 
            success: true, 
            message: '초대가 완료되었습니다.' 
        });
    } catch (error) {
        console.error('인증번호 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증번호 확인 중 오류가 발생했습니다.' 
        });
    }
});

// 초대 데이터 저장 API
app.post('/api/add-invite', async (req, res) => {
    try {
        const { phoneNumber, inviteDate } = req.body;
        
        // const connection = await pool.getConnection();
        try {
            // await connection.execute(
            //     'CALL sp_add_friend_invite(?, ?)',
            //     [phoneNumber, inviteDate]
            // );
            res.json({ success: true });
        } finally {
            // connection.release();
        }
    } catch (error) {
        console.error('초대 데이터 저장 오류:', error);
        res.status(500).json({ success: false, error: '초대 데이터 저장 중 오류가 발생했습니다.' });
    }
});

// 초대 리스트 조회 API
app.get('/api/invites', async (req, res) => {
    try {
        // MongoDB 연결 확인
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB 연결이 끊어졌습니다. 재연결을 시도합니다...');
            await mongoose.connect('mongodb://localhost:27017/baseball_fan', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
        }

        // 모든 초대 내역 조회
        const invites = await Invite.find()
            .sort({ inviteDate: -1 })
            .lean();
        
        // 총 건수 계산
        const totalCount = invites.length;
        
        console.log('초대 리스트 조회 성공:', totalCount, '개 항목');
        
        res.json({
            success: true,
            totalCount: totalCount,
            invites: invites.map(invite => ({
                phoneNumber: invite.phoneNumber,
                inviteDate: invite.inviteDate,
                status: invite.status
            }))
        });
    } catch (error) {
        console.error('초대 리스트 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '초대 리스트 조회 중 오류가 발생했습니다.',
            error: error.message 
        });
    }
});

// 초대 중복 확인 API
app.post('/api/check-invite', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        const existingInvite = await Invite.findOne({ phoneNumber });
        
        res.json({
            success: true,
            exists: !!existingInvite
        });
    } catch (error) {
        console.error('초대 중복 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '초대 중복 확인 중 오류가 발생했습니다.' 
        });
    }
});

// 초대 스키마 정의
const inviteSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    inviteDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

// 초대 모델 생성
const Invite = mongoose.model('Invite', inviteSchema, 'invites');

// 헬스체크 엔드포인트 (CloudType 배포용)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB 상태: ${mongoose.connection.readyState === 1 ? '연결됨' : '연결 안됨'}`);
});
