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

// MongoDB 연결 (Render 전용)
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            return false;
        }
        
        console.log('🔗 연결 문자열 확인:', mongoURI.substring(0, 20) + '...');
        
        await mongoose.connect(mongoURI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            dbName: 'test'  // MongoDB Atlas의 데이터베이스 이름을 명시
        });
        
        console.log('✅ MongoDB 연결 성공!');
        console.log('📊 데이터베이스:', mongoose.connection.db.databaseName);
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

// 헬스체크 엔드포인트 (Render 배포용)
app.get('/health', (req, res) => {
    const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
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

// 간단한 DB 진단 API
app.get('/api/debug/users', async (req, res) => {
    try {
        const dbStatus = {
            connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            databaseName: mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown',
            userCount: 0,
            sampleUsers: [],
            collections: []
        };
        
        if (mongoose.connection.readyState === 1) {
            try {
                const userCount = await User.countDocuments();
                const sampleUsers = await User.find({}, { userId: 1, name: 1 }).limit(3);
                const collections = await mongoose.connection.db.listCollections().toArray();
                
                dbStatus.userCount = userCount;
                dbStatus.sampleUsers = sampleUsers;
                dbStatus.collections = collections.map(col => col.name);
            } catch (dbError) {
                console.error('데이터베이스 쿼리 오류:', dbError);
                dbStatus.error = dbError.message;
            }
        }
        
        res.json(dbStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 초대 목록 조회
app.get('/api/invites', async (req, res) => {
    try {
        // MongoDB 연결 상태 확인
        if (mongoose.connection.readyState !== 1) {
            console.log('MongoDB 연결 안됨, 기본 응답 반환');
            return res.json({ invites: [] });
        }
        
        // 모든 초대 데이터 조회
        const invites = await Invite.find({}).sort({ inviteDate: -1 });
        
        console.log('조회된 초대 데이터:', invites);
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
        
        if (!phoneNumber || !verificationCode || !inputCode || !memberName || !memberId || !memberPhone || !inviterPhone) {
            return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
        }
        
        if (verificationCode === inputCode) {
            const invite = new Invite({
                memberName,
                memberId,
                memberPhone,
                inviterPhone,
                status: 'completed'
            });
            
            await invite.save();
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

// 로그인
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        
        if (!userId || !password) {
            return res.status(400).json({ error: 'ID와 비밀번호를 입력해주세요.' });
        }
        
        const user = await User.findOne({ userId, password });
        if (!user) {
            return res.status(401).json({ error: 'ID 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        res.json({
            message: '로그인 성공',
            user: {
                userId: user.userId,
                name: user.name,
                points: user.points,
                favoriteTeam: user.favoriteTeam
            }
        });
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
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
            points: updatedUser.points
        });
    } catch (error) {
        console.error('출석체크 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
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
        
        const total = await Board.countDocuments(query);
        
        res.json({
            boards,
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
app.get('/game-records-all', async (req, res) => {
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
            points: user.points,
            favoriteTeam: user.favoriteTeam,
            attendance: user.attendance
        });
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 아이디 찾기
app.post('/api/find-id', async (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: '이름과 이메일을 입력해주세요.' });
        }
        
        const user = await User.findOne({ name, email });
        if (!user) {
            return res.status(404).json({ error: '해당 정보로 가입된 사용자를 찾을 수 없습니다.' });
        }
        
        res.json({ 
            message: '아이디 찾기 성공',
            userId: user.userId 
        });
    } catch (error) {
        console.error('아이디 찾기 오류:', error);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
});

// 비밀번호 찾기
app.post('/api/find-password', async (req, res) => {
    try {
        const { userId, email } = req.body;
        
        if (!userId || !email) {
            return res.status(400).json({ error: '아이디와 이메일을 입력해주세요.' });
        }
        
        const user = await User.findOne({ userId, email });
        if (!user) {
            return res.status(404).json({ error: '해당 정보로 가입된 사용자를 찾을 수 없습니다.' });
        }
        
        // 실제 구현에서는 이메일로 임시 비밀번호를 발송해야 합니다.
        // 여기서는 간단히 성공 메시지만 반환합니다.
        res.json({ 
            message: '비밀번호 재설정 이메일이 발송되었습니다.',
            note: '실제 구현에서는 이메일로 임시 비밀번호를 발송합니다.'
        });
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
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