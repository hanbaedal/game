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

// MongoDB 연결 (Render 전용)
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            return;
        }
        
        console.log('MongoDB URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        
        await mongoose.connect(mongoURI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        
        console.log('MongoDB 연결 성공!');
        console.log(`데이터베이스: ${mongoose.connection.name}`);
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
        
        if (!userId || !password || !name || !email || !phone || !favoriteTeam) {
            return res.status(400).json({ 
                success: false,
                message: '모든 필드를 입력해주세요.' 
            });
        }
        
        const existingUser = await User.findOne({ userId });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: '이미 사용 중인 ID입니다.' 
            });
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
        
        const attendance = new Attendance({
            userId,
            date: dateString,
            month,
            year,
            points: 100
        });
        await attendance.save();
        
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
        
        user.points += amount;
        await user.save();
        
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

// 초대 리스트 조회 API
app.get('/api/invites', async (req, res) => {
    try {
        const invites = await Invite.find()
            .sort({ inviteDate: -1 })
            .lean();
        
        const totalCount = invites.length;
        
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