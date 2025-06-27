const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // CloudType 환경에서 MongoDB 정보 가져오기
        const username = process.env.MONGODB_USERNAME || 'ppadun9_user';
        const password = process.env.MONGODB_PASSWORD || 'ppadun8267';
        const database = process.env.MONGODB_DATABASE || 'member-management';
        const host = process.env.MONGODB_HOST || 'mongodb';
        const port = process.env.MONGODB_PORT || '27017';
        
        // MongoDB URI 구성 (CloudType 환경)
        const mongoURI = process.env.MONGODB_URI || 
            `mongodb://${username}:${password}@${host}:${port}/${database}`;
        
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            // CloudType 환경에서 안정적인 연결을 위한 옵션들
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0
        });
        
        console.log(`MongoDB 연결 성공: ${conn.connection.host}`);
        console.log(`데이터베이스: ${conn.connection.name}`);
        console.log(`사용자: ${username}`);
    } catch (error) {
        console.error(`MongoDB 연결 오류: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB; 