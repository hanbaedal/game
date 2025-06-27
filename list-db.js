const mongoose = require('mongoose');

async function listDatabase() {
    try {
        // MongoDB 연결
        await mongoose.connect('mongodb://localhost:27017/baseball_fan', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB 연결 성공!');

        // User 모델 정의
        const User = mongoose.model('User', new mongoose.Schema({
            userId: String,
            password: String,
            name: String,
            email: String,
            phone: String,
            favoriteTeam: String,
            points: Number,
            attendance: [String],
            createdAt: Date
        }));

        // 사용자 목록 조회
        const users = await User.find({});
        console.log('\n=== 사용자 목록 ===');
        users.forEach(user => {
            console.log(`\nID: ${user.userId}`);
            console.log(`이름: ${user.name}`);
            console.log(`이메일: ${user.email}`);
            console.log(`전화번호: ${user.phone}`);
            console.log(`응원팀: ${user.favoriteTeam}`);
            console.log(`포인트: ${user.points}`);
            console.log(`가입일: ${user.createdAt}`);
        });

        // 연결 종료
        await mongoose.connection.close();
    } catch (error) {
        console.error('오류 발생:', error);
    }
}

listDatabase(); 