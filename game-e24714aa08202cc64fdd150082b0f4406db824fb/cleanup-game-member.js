const mongoose = require('mongoose');

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        // Render 배포 환경 MongoDB 연결
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ppadun_user:ppadun8267@member-management.bppicvz.mongodb.net/?retryWrites=true&w=majority&appName=member-management';
        
        console.log('🔗 연결 문자열 확인:', mongoURI.substring(0, 20) + '...');
        
        const dbName = 'member-management';
        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            dbName: dbName,
            retryWrites: true,
            w: 'majority'
        };
        
        await mongoose.connect(mongoURI, connectionOptions);
        console.log('✅ MongoDB 연결 성공!');
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
        return false;
    }
};

// game-member 컬렉션에서 attendance와 bettingHistory 필드 삭제
async function cleanupGameMemberCollection() {
    try {
        console.log('🧹 game-member 컬렉션 정리 시작...');
        
        const userCollection = mongoose.connection.db.collection('game-member');
        
        // attendance와 bettingHistory 필드를 제거한 업데이트
        const updateResult = await userCollection.updateMany(
            {}, // 모든 문서
            {
                $unset: {
                    attendance: "",
                    bettingHistory: ""
                }
            }
        );
        
        console.log(`✅ 정리 완료:`);
        console.log(`- 수정된 문서 수: ${updateResult.modifiedCount}`);
        console.log(`- attendance 필드 삭제됨`);
        console.log(`- bettingHistory 필드 삭제됨`);
        
        // 정리 후 샘플 데이터 확인
        const sampleUser = await userCollection.findOne({});
        if (sampleUser) {
            console.log('\n📋 정리 후 샘플 사용자 데이터:');
            console.log('- userId:', sampleUser.userId);
            console.log('- name:', sampleUser.name);
            console.log('- points:', sampleUser.points);
            console.log('- attendance 필드 존재:', 'attendance' in sampleUser);
            console.log('- bettingHistory 필드 존재:', 'bettingHistory' in sampleUser);
        }
        
    } catch (error) {
        console.error('❌ 정리 중 오류 발생:', error.message);
    }
}

// 메인 실행 함수
async function main() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) {
            console.error('MongoDB 연결 실패로 인해 작업을 중단합니다.');
            return;
        }
        
        await cleanupGameMemberCollection();
        
        console.log('\n🎉 game-member 컬렉션 정리가 완료되었습니다!');
        
    } catch (error) {
        console.error('❌ 메인 실행 중 오류:', error.message);
    } finally {
        // 연결 종료
        await mongoose.connection.close();
        console.log('🔌 MongoDB 연결이 종료되었습니다.');
    }
}

// 스크립트 실행
if (require.main === module) {
    main();
}

module.exports = { cleanupGameMemberCollection }; 