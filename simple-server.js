const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = 3002;

// 미들웨어
app.use(express.json());
app.use(express.static('.'));

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        const mongoUri = 'mongodb+srv://ppadun:ppadun123@cluster0.mongodb.net/member-management?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            dbName: 'member-management',
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ MongoDB 연결 성공!');
        console.log('📊 연결된 데이터베이스:', mongoose.connection.db.databaseName);
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
    }
};

// 서버 시작 시 MongoDB 연결
connectToMongoDB();

// 간단한 테스트 API
app.get('/api/simple-test', (req, res) => {
    res.json({
        success: true,
        message: '간단한 서버가 정상 작동 중입니다',
        timestamp: new Date().toISOString()
    });
});

// 실제 DB에서 team-games 데이터 조회
app.get('/api/team-games', async (req, res) => {
    try {
        console.log('🏟️ /api/team-games API 호출됨');
        
        if (mongoose.connection.readyState !== 1) {
            console.log('❌ MongoDB 연결 안됨');
            return res.json({
                success: false,
                message: 'DB 연결 오류',
                games: []
            });
        }
        
        const teamGamesCollection = mongoose.connection.db.collection('team-games');
        const games = await teamGamesCollection.find({}).sort({ gameNumber: 1 }).toArray();
        
        console.log(`📋 조회된 경기 수: ${games.length}개`);
        
        res.json({ success: true, games });
    } catch (error) {
        console.error('❌ /api/team-games 오류:', error);
        res.status(500).json({ success: false, message: error.message, games: [] });
    }
});

app.listen(port, () => {
    console.log(`✅ 간단한 서버가 포트 ${port}에서 시작되었습니다!`);
}); 