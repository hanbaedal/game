require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 정적 파일 라우팅
app.get('/index.html', (req, res) => {
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

// MongoDB 연결 설정 - Render 배포용
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        // 환경 변수에서 MongoDB 정보 가져오기
        const username = process.env.MONGODB_USERNAME || 'ppadun9_user';
        const password = process.env.MONGODB_PASSWORD || 'ppadun8267';
        const database = process.env.MONGODB_DATABASE || 'member-management';
        const host = process.env.MONGODB_HOST || 'mongodb';
        const port = process.env.MONGODB_PORT || '27017';
        
        // MongoDB URI 구성 (Render 환경)
        const mongoURI = process.env.MONGODB_URI || 
            `mongodb://${username}:${password}@${host}:${port}/${database}`;
        
        console.log('MongoDB URI:', mongoURI.replace(password, '***'));
        
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log('MongoDB 연결 성공!');
        console.log(`데이터베이스: ${mongoose.connection.name}`);
        console.log(`사용자: ${username}`);
    } catch (error) {
        console.error('MongoDB 연결 실패:', error.message);
        console.log('MongoDB 연결 없이 서버를 시작합니다...');
    }
};

// 서버 시작
const startServer = async () => {
    try {
        console.log('서버 시작 중...');
        console.log('환경 변수 확인:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- PORT:', process.env.PORT);
        console.log('- MONGODB_USERNAME:', process.env.MONGODB_USERNAME);
        console.log('- MONGODB_DATABASE:', process.env.MONGODB_DATABASE);
        console.log('- MONGODB_URI 존재:', !!process.env.MONGODB_URI);
        
        // MongoDB 연결 시도
        await connectToMongoDB();
        
        // 서버 시작
        app.listen(PORT, '0.0.0.0', () => {
            console.log('✅ 서버가 성공적으로 시작되었습니다!');
            console.log(`📍 포트: ${PORT}`);
            console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️ MongoDB 상태: ${mongoose.connection.readyState === 1 ? '연결됨' : '연결 안됨'}`);
            console.log(`🔗 서버 URL: http://localhost:${PORT}`);
            console.log(`🏥 헬스체크: http://localhost:${PORT}/health`);
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
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            health: '/health',
            test: '/test',
            api: '/api/*'
        }
    });
});

// 테스트 엔드포인트
app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 헬스체크 엔드포인트 (Render 배포용)
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage(),
        version: process.version
    };
    
    const statusCode = health.database === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
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

const User = mongoose.model('User', userSchema, 'game-member');

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

const Bet = mongoose.model('Bet', betSchema, 'game-betting');

// Donation 스키마 정의
const donationSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    points: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    type: { type: String, enum: ['manual', 'auto_donate'], default: 'manual' },
    source: { type: String, enum: ['direct', 'betting_win'], default: 'direct' }
});

const Donation = mongoose.model('Donation', donationSchema, 'game-donation');

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

const GameRecord = mongoose.model('GameRecord', gameRecordSchema, 'game-records');

// 기부 포인트 스키마 정의
const donationPointsSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    donationAmount: { type: Number, required: true },
    originalPoints: { type: Number, required: true },
    remainingPoints: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const DonationPoints = mongoose.model('DonationPoints', donationPointsSchema, 'game-donation');

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
    phoneNumber: { type: String, required: true },
    inviteDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

const Invite = mongoose.model('Invite', inviteSchema, 'game-invite');

// API 엔드포인트들
// ID 중복 확인 API
app.post('/api/check-id', async (req, res) => {
    const { userId } = req.body;
    
    try {
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: '사용자 ID를 입력해주세요.' 
            });
        }
        
        const existingUser = await User.findOne({ userId });
        
        res.json({
            success: true,
            available: !existingUser,
            message: existingUser ? '이미 사용 중인 ID입니다.' : '사용 가능한 ID입니다.'
        });
    } catch (error) {
        console.error('ID 중복 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: 'ID 중복 확인 중 오류가 발생했습니다.' 
        });
    }
});

// 회원가입 API
app.post('/api/users', async (req, res) => {
    try {
        const { userId, password, name, email, phone, favoriteTeam } = req.body;
        
        // 입력값 검증
        if (!userId || !password || !name || !email || !phone || !favoriteTeam) {
            return res.status(400).json({ 
                success: false,
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        // ID 중복 확인
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: '이미 사용 중인 ID입니다.' 
            });
        }
        
        // 새 사용자 생성
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
        
        res.status(201).json({ 
            success: true,
            message: '회원가입이 완료되었습니다.',
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                points: user.points
            }
        });
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '회원가입 중 오류가 발생했습니다.' 
        });
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        if (!userId || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'ID와 비밀번호를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId, password });
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'ID 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        res.json({
            success: true,
            message: '로그인 성공',
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
        console.error('로그인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '로그인 중 오류가 발생했습니다.' 
        });
    }
});

// 게스트 로그인 API
app.post('/api/guest-login', async (req, res) => {
    try {
        const guestId = `guest_${uuidv4().substring(0, 8)}`;
        
        const guestUser = {
            userId: guestId,
            name: '게스트',
            email: 'guest@example.com',
            phone: '000-0000-0000',
            favoriteTeam: '기타',
            points: 1000
        };
        
        res.json({
            success: true,
            message: '게스트 로그인 성공',
            user: guestUser
        });
    } catch (error) {
        console.error('게스트 로그인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게스트 로그인 중 오류가 발생했습니다.' 
        });
    }
});

// 포인트 업데이트 API
app.post('/api/update-points', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        user.points = points;
        await user.save();
        
        res.json({ 
            success: true,
            message: '포인트가 업데이트되었습니다.',
            points: user.points
        });
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '포인트 업데이트 중 오류가 발생했습니다.' 
        });
    }
});

// 사용자 목록 조회 API
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.json({ 
            success: true,
            users: users
        });
    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '사용자 목록 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 특정 사용자 조회 API
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId }, { password: 0 });
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        res.json({ 
            success: true,
            user: user
        });
    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '사용자 조회 중 오류가 발생했습니다.' 
        });
    }
});

// ID 찾기 API
app.post('/api/find-id', async (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ 
                success: false,
                message: '이름과 이메일을 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ name, email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '일치하는 정보를 찾을 수 없습니다.' 
            });
        }
        
        res.json({
            success: true,
            message: 'ID 찾기 성공',
            userId: user.userId
        });
    } catch (error) {
        console.error('ID 찾기 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: 'ID 찾기 중 오류가 발생했습니다.' 
        });
    }
});

// 비밀번호 찾기 API
app.post('/api/find-password', async (req, res) => {
    try {
        const { userId, email } = req.body;
        
        if (!userId || !email) {
            return res.status(400).json({ 
                success: false,
                message: 'ID와 이메일을 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId, email });
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '일치하는 정보를 찾을 수 없습니다.' 
            });
        }
        
        res.json({
            success: true,
            message: '비밀번호 찾기 성공',
            password: user.password
        });
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '비밀번호 찾기 중 오류가 발생했습니다.' 
        });
    }
});

// 출석체크 API
app.post('/api/attendance', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: '사용자 ID를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear().toString();
        
        // 오늘 이미 출석했는지 확인
        const existingAttendance = await Attendance.findOne({
            userId,
            date: dateString
        });
        
        if (existingAttendance) {
            return res.status(400).json({ 
                success: false,
                message: '오늘 이미 출석체크를 하셨습니다.' 
            });
        }
        
        // 출석 기록 생성
        const attendance = new Attendance({
            userId,
            date: dateString,
            month,
            year,
            points: 100
        });
        await attendance.save();
        
        // 사용자 포인트 증가
        user.points += 100;
        user.attendance.push(dateString);
        await user.save();
        
        res.json({
            success: true,
            message: '출석체크가 완료되었습니다!',
            points: user.points,
            attendanceDate: dateString
        });
    } catch (error) {
        console.error('출석체크 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '출석체크 중 오류가 발생했습니다.' 
        });
    }
});

// 출석 내역 조회 API
app.get('/api/attendance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        const attendanceRecords = await Attendance.find({ userId })
            .sort({ date: -1 })
            .limit(30);
        
        res.json({
            success: true,
            attendance: attendanceRecords,
            totalPoints: user.points
        });
    } catch (error) {
        console.error('출석 내역 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '출석 내역 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 배팅 API
app.post('/api/bet', async (req, res) => {
    try {
        const { userId, matchId, gameType, bettingType, points } = req.body;
        
        if (!userId || !matchId || !gameType || !bettingType || !points) {
            return res.status(400).json({ 
                success: false,
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        if (user.points < points) {
            return res.status(400).json({ 
                success: false,
                message: '포인트가 부족합니다.' 
            });
        }
        
        // 배팅 기록 생성
        const bet = new Bet({
            userId,
            matchId,
            gameType,
            bettingType,
            points
        });
        await bet.save();
        
        // 사용자 포인트 차감
        user.points -= points;
        await user.save();
        
        res.json({
            success: true,
            message: '배팅이 완료되었습니다.',
            points: user.points,
            betId: bet._id
        });
    } catch (error) {
        console.error('배팅 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '배팅 중 오류가 발생했습니다.' 
        });
    }
});

// 기부 API
app.post('/api/donate', async (req, res) => {
    try {
        const { userId, points } = req.body;
        
        if (!userId || !points) {
            return res.status(400).json({ 
                success: false,
                message: '사용자 ID와 기부 포인트를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        if (user.points < points) {
            return res.status(400).json({ 
                success: false,
                message: '포인트가 부족합니다.' 
            });
        }
        
        // 기부 기록 생성
        const donation = new Donation({
            userId,
            points
        });
        await donation.save();
        
        // 사용자 포인트 차감
        user.points -= points;
        await user.save();
        
        res.json({
            success: true,
            message: '기부가 완료되었습니다.',
            points: user.points
        });
    } catch (error) {
        console.error('기부 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '기부 중 오류가 발생했습니다.' 
        });
    }
});

// 기부 내역 조회 API
app.get('/api/donations', async (req, res) => {
    try {
        const donations = await Donation.find()
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({
            success: true,
            donations: donations
        });
    } catch (error) {
        console.error('기부 내역 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '기부 내역 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 게임 기록 API
app.post('/api/game-record', async (req, res) => {
    try {
        const { userId, gameType, bettingType, bettingPoints, result, winPoints } = req.body;
        
        if (!userId || !gameType || !bettingType || !bettingPoints || !result) {
            return res.status(400).json({ 
                success: false,
                message: '필수 필드를 입력해주세요.' 
            });
        }
        
        const gameRecord = new GameRecord({
            userId,
            gameType,
            bettingType,
            bettingPoints,
            result,
            winPoints: result === 'WIN' ? winPoints : 0
        });
        await gameRecord.save();
        
        res.json({
            success: true,
            message: '게임 기록이 저장되었습니다.',
            recordId: gameRecord._id
        });
    } catch (error) {
        console.error('게임 기록 저장 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게임 기록 저장 중 오류가 발생했습니다.' 
        });
    }
});

// 게임 기록 조회 API
app.get('/api/game-records/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const records = await GameRecord.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({
            success: true,
            records: records
        });
    } catch (error) {
        console.error('게임 기록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게임 기록 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 기부 포인트 기록 API
app.post('/api/donation-points', async (req, res) => {
    try {
        const { userId, donationAmount, originalPoints, remainingPoints } = req.body;
        
        if (!userId || !donationAmount || !originalPoints || !remainingPoints) {
            return res.status(400).json({ 
                success: false,
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        const donationPoints = new DonationPoints({
            userId,
            donationAmount,
            originalPoints,
            remainingPoints
        });
        await donationPoints.save();
        
        res.json({
            success: true,
            message: '기부 포인트 기록이 저장되었습니다.'
        });
    } catch (error) {
        console.error('기부 포인트 기록 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '기부 포인트 기록 중 오류가 발생했습니다.' 
        });
    }
});

// 기부 포인트 내역 조회 API
app.get('/api/donation-points/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const donationPoints = await DonationPoints.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({
            success: true,
            donationPoints: donationPoints
        });
    } catch (error) {
        console.error('기부 포인트 내역 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '기부 포인트 내역 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 게시판 목록 조회 API
app.get('/api/boards', async (req, res) => {
    try {
        const boards = await Board.find()
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.json({
            success: true,
            boards: boards
        });
    } catch (error) {
        console.error('게시판 목록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게시판 목록 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 게시판 상세 조회 API
app.get('/api/boards/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        
        const board = await Board.findById(boardId);
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
            message: '게시판 상세 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 게시판 글쓰기 API
app.post('/api/boards', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        
        if (!title || !content || !author) {
            return res.status(400).json({ 
                success: false,
                message: '제목, 내용, 작성자를 입력해주세요.' 
            });
        }
        
        const board = new Board({
            title,
            content,
            author
        });
        await board.save();
        
        res.status(201).json({
            success: true,
            message: '게시글이 작성되었습니다.',
            boardId: board._id
        });
    } catch (error) {
        console.error('게시판 글쓰기 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게시판 글쓰기 중 오류가 발생했습니다.' 
        });
    }
});

// 포인트 충전 API
app.post('/api/charge-points', async (req, res) => {
    try {
        const { userId, amount, paymentMethod } = req.body;
        
        if (!userId || !amount || !paymentMethod) {
            return res.status(400).json({ 
                success: false,
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: '사용자를 찾을 수 없습니다.' 
            });
        }
        
        // 포인트 충전
        user.points += amount;
        await user.save();
        
        // 충전 기록 생성
        const charging = new Charging({
            userId,
            amount,
            paymentMethod,
            status: 'completed'
        });
        await charging.save();
        
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
        
        const invite = new Invite({
            phoneNumber,
            inviteDate: inviteDate || new Date()
        });
        await invite.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error('초대 데이터 저장 오류:', error);
        res.status(500).json({ success: false, error: '초대 데이터 저장 중 오류가 발생했습니다.' });
    }
});

// 초대 리스트 조회 API
app.get('/api/invites', async (req, res) => {
    try {
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