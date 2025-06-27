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
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            console.log('💡 해결 방법:');
            console.log('   1. .env 파일에 MONGODB_URI를 설정하세요');
            console.log('   2. 또는 환경 변수로 직접 설정하세요');
            return false;
        }
        
        console.log('MongoDB URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        
        await mongoose.connect(mongoURI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000
        });
        
        console.log('✅ MongoDB 연결 성공!');
        console.log(`📊 데이터베이스: ${mongoose.connection.name}`);
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
        console.log('🔍 연결 상태:', mongoose.connection.readyState);
        console.log('💡 해결 방법:');
        console.log('   1. MongoDB Atlas에서 IP 화이트리스트 확인');
        console.log('   2. 사용자명/비밀번호 확인');
        console.log('   3. 데이터베이스 이름 확인');
        return false;
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
        const isConnected = await connectToMongoDB();
        
        // 서버 시작
        app.listen(PORT, '0.0.0.0', () => {
            console.log('✅ 서버가 성공적으로 시작되었습니다!');
            console.log(`📍 포트: ${PORT}`);
            console.log(`🌍 환경: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️ MongoDB 상태: ${isConnected ? '연결됨' : '연결 안됨'}`);
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
    phoneNumber: { type: String, required: true },
    inviteDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
});

const Invite = mongoose.model('Invite', inviteSchema, 'game-invite');

// 댓글 스키마 정의
const commentSchema = new mongoose.Schema({
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema, 'game-comment');

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
        
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.error('MongoDB 연결 상태:', mongoose.connection.readyState);
            return res.status(503).json({ 
                success: false, 
                message: '데이터베이스 연결이 되지 않았습니다. 잠시 후 다시 시도해주세요.',
                error: 'DATABASE_CONNECTION_ERROR'
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
            message: 'ID 중복 확인 중 오류가 발생했습니다.',
            error: error.message
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
        
        // 이번달 출석 계산
        const today = new Date();
        const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = today.getFullYear().toString();
        
        const thisMonthAttendance = await Attendance.find({
            userId,
            month: currentMonth,
            year: currentYear
        });
        
        // 이번달 포인트 계산
        const thisMonthPoints = thisMonthAttendance.reduce((total, record) => total + (record.points || 0), 0);
        
        // 전체 출석 계산
        const totalAttendance = await Attendance.countDocuments({ userId });
        
        res.json({
            success: true,
            attendance: attendanceRecords,
            totalPoints: user.points,
            monthAttendance: thisMonthAttendance.length,
            totalAttendance: totalAttendance,
            monthPoints: thisMonthPoints,
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const type = req.query.type || 'title';
        
        const skip = (page - 1) * limit;
        
        // 검색 조건 구성
        let searchCondition = {};
        if (search) {
            switch (type) {
                case 'title':
                    searchCondition.title = { $regex: search, $options: 'i' };
                    break;
                case 'content':
                    searchCondition.content = { $regex: search, $options: 'i' };
                    break;
                case 'author':
                    searchCondition.authorName = { $regex: search, $options: 'i' };
                    break;
                default:
                    searchCondition = {
                        $or: [
                            { title: { $regex: search, $options: 'i' } },
                            { content: { $regex: search, $options: 'i' } },
                            { authorName: { $regex: search, $options: 'i' } }
                        ]
                    };
            }
        }
        
        // 전체 게시글 수 조회
        const total = await Board.countDocuments(searchCondition);
        
        // 게시글 목록 조회
        const boards = await Board.find(searchCondition)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // 각 게시글의 댓글 수 조회
        const boardsWithComments = await Promise.all(
            boards.map(async (board) => {
                const commentCount = await Comment.countDocuments({ boardId: board._id });
                return {
                    ...board,
                    comments: commentCount
                };
            })
        );
        
        res.json({
            success: true,
            boards: boardsWithComments,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit)
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
        const { title, content, userName, userId } = req.body;
        
        if (!title || !content || !userName) {
            return res.status(400).json({ 
                success: false,
                message: '제목, 내용, 작성자를 입력해주세요.' 
            });
        }
        
        const board = new Board({
            title,
            content,
            author: userName,
            authorName: userName,
            authorId: userId
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
        
        // 조회수 증가
        board.views = (board.views || 0) + 1;
        await board.save();
        
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

// 게시판 수정 API
app.put('/api/boards/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const { title, content, userId } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ 
                success: false,
                message: '제목과 내용을 입력해주세요.' 
            });
        }
        
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ 
                success: false,
                message: '게시글을 찾을 수 없습니다.' 
            });
        }
        
        // 작성자 확인
        if (board.authorId !== userId) {
            return res.status(403).json({ 
                success: false,
                message: '수정 권한이 없습니다.' 
            });
        }
        
        board.title = title;
        board.content = content;
        board.updatedAt = new Date();
        await board.save();
        
        res.json({
            success: true,
            message: '게시글이 수정되었습니다.'
        });
    } catch (error) {
        console.error('게시판 수정 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게시판 수정 중 오류가 발생했습니다.' 
        });
    }
});

// 게시판 삭제 API
app.delete('/api/boards/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        const { userId } = req.body;
        
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ 
                success: false,
                message: '게시글을 찾을 수 없습니다.' 
            });
        }
        
        // 작성자 확인
        if (board.authorId !== userId) {
            return res.status(403).json({ 
                success: false,
                message: '삭제 권한이 없습니다.' 
            });
        }
        
        // 게시글과 관련된 댓글도 함께 삭제
        await Comment.deleteMany({ boardId });
        await Board.findByIdAndDelete(boardId);
        
        res.json({
            success: true,
            message: '게시글이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('게시판 삭제 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게시판 삭제 중 오류가 발생했습니다.' 
        });
    }
});

// 댓글 목록 조회 API
app.get('/api/boards/:boardId/comments', async (req, res) => {
    try {
        const { boardId } = req.params;
        
        const comments = await Comment.find({ boardId })
            .sort({ createdAt: 1 })
            .lean();
        
        res.json({
            success: true,
            comments: comments
        });
    } catch (error) {
        console.error('댓글 목록 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '댓글 목록 조회 중 오류가 발생했습니다.' 
        });
    }
});

// 댓글 작성 API
app.post('/api/boards/:boardId/comments', async (req, res) => {
    try {
        const { boardId } = req.params;
        const { content, userId, userName } = req.body;
        
        if (!content || !userId || !userName) {
            return res.status(400).json({ 
                success: false,
                message: '댓글 내용과 사용자 정보를 입력해주세요.' 
            });
        }
        
        // 게시글 존재 확인
        const board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ 
                success: false,
                message: '게시글을 찾을 수 없습니다.' 
            });
        }
        
        const comment = new Comment({
            boardId,
            content,
            authorId: userId,
            authorName: userName
        });
        await comment.save();
        
        res.status(201).json({
            success: true,
            message: '댓글이 작성되었습니다.',
            comment: comment
        });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '댓글 작성 중 오류가 발생했습니다.' 
        });
    }
});

// 댓글 삭제 API
app.delete('/api/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;
        
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ 
                success: false,
                message: '댓글을 찾을 수 없습니다.' 
            });
        }
        
        // 작성자 확인
        if (comment.authorId !== userId) {
            return res.status(403).json({ 
                success: false,
                message: '삭제 권한이 없습니다.' 
            });
        }
        
        await Comment.findByIdAndDelete(commentId);
        
        res.json({
            success: true,
            message: '댓글이 삭제되었습니다.'
        });
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '댓글 삭제 중 오류가 발생했습니다.' 
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

// 전화번호 중복 확인 API
app.post('/api/check-invite', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false,
                message: '전화번호를 입력해주세요.' 
            });
        }
        
        // 전화번호 형식 검증
        const phoneRegex = /^01[0-9]{8,9}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ 
                success: false,
                message: '올바른 전화번호 형식이 아닙니다.' 
            });
        }
        
        // 기존 초대 내역 확인
        const existingInvite = await Invite.findOne({ phoneNumber });
        
        res.json({
            success: true,
            exists: !!existingInvite,
            message: existingInvite ? '이미 초대된 전화번호입니다.' : '초대 가능한 전화번호입니다.'
        });
    } catch (error) {
        console.error('전화번호 중복 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '전화번호 확인 중 오류가 발생했습니다.' 
        });
    }
});

// 인증번호 전송 API (테스트용)
app.post('/api/send-verification', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false,
                message: '전화번호를 입력해주세요.' 
            });
        }
        
        // 테스트용 인증번호 생성 (실제로는 SMS 서비스 사용)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 실제 SMS 전송 대신 콘솔에 출력 (테스트용)
        console.log(`인증번호 전송: ${phoneNumber} -> ${verificationCode}`);
        
        // 세션에 인증번호 저장 (실제로는 Redis 등 사용)
        // 여기서는 간단히 전송된 인증번호를 반환
        res.json({
            success: true,
            message: '인증번호가 전송되었습니다.',
            code: verificationCode // 테스트용으로만 전송
        });
    } catch (error) {
        console.error('인증번호 전송 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증번호 전송 중 오류가 발생했습니다.' 
        });
    }
});

// 인증번호 확인 API (테스트용)
app.post('/api/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        if (!phoneNumber || !code) {
            return res.status(400).json({ 
                success: false,
                message: '전화번호와 인증번호를 입력해주세요.' 
            });
        }
        
        // 테스트용으로는 모든 인증번호를 허용 (실제로는 저장된 인증번호와 비교)
        // 실제 구현에서는 Redis나 세션에서 저장된 인증번호와 비교
        
        // 초대 내역 저장
        const invite = new Invite({
            phoneNumber,
            status: 'pending'
        });
        await invite.save();
        
        res.json({
            success: true,
            message: '인증이 완료되었습니다. 초대 메시지가 전송되었습니다.'
        });
    } catch (error) {
        console.error('인증번호 확인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '인증번호 확인 중 오류가 발생했습니다.' 
        });
    }
}); 