const mongoose = require('mongoose');

// MongoDB 연결 설정
const MONGODB_URI = 'mongodb://127.0.0.1:27017/baseball_fan';

// 사용자 스키마 정의
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

// 초기 데이터
const initialUsers = [
    {
        userId: 'test123',
        password: 'Test123!@#',
        name: '테스트',
        email: 'test@example.com',
        phone: '010-1234-5678',
        favoriteTeam: '두산',
        points: 3000
    }
];

// 데이터베이스 초기화 함수
async function initializeDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB 연결 성공');

        // 기존 데이터 삭제
        await User.deleteMany({});
        console.log('기존 데이터 삭제 완료');

        // 초기 데이터 삽입
        await User.insertMany(initialUsers);
        console.log('초기 데이터 삽입 완료');

        console.log('데이터베이스 초기화 완료');
        process.exit(0);
    } catch (error) {
        console.error('데이터베이스 초기화 중 오류:', error);
        process.exit(1);
    }
}

initializeDatabase(); 