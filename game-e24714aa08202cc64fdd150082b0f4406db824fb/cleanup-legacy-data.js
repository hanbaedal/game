const mongoose = require('mongoose');

// MongoDB 연결
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            return false;
        }
        
        console.log('🔗 연결 문자열 확인:', mongoURI.substring(0, 20) + '...');
        
        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
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

// 레거시 데이터 정리 함수
async function cleanupLegacyData() {
    try {
        console.log('🧹 레거시 데이터 정리 시작...');
        
        const db = mongoose.connection.db;
        
        // member-management 컬렉션 확인
        const legacyCollection = db.collection('member-management');
        const legacyCount = await legacyCollection.countDocuments();
        
        console.log(`📊 레거시 컬렉션 문서 수: ${legacyCount}`);
        
        if (legacyCount === 0) {
            console.log('✅ 레거시 데이터가 없습니다.');
            return;
        }
        
        // 레거시 데이터 샘플 확인
        const sampleDocs = await legacyCollection.find({}).limit(5).toArray();
        console.log('📋 레거시 데이터 샘플:', sampleDocs.map(doc => ({
            _id: doc._id,
            type: doc.type || 'unknown',
            userId: doc.userId || 'N/A'
        })));
        
        // 사용자 확인
        const userCollection = db.collection('game-member');
        const userCount = await userCollection.countDocuments();
        console.log(`👥 현재 사용자 수: ${userCount}`);
        
        // 정리 여부 확인
        console.log('\n⚠️ 레거시 데이터를 삭제하시겠습니까? (y/N)');
        console.log('   이 작업은 되돌릴 수 없습니다.');
        
        // 실제로는 사용자 입력을 받아야 하지만, 스크립트에서는 주석 처리
        // const shouldDelete = await getUserInput('정리하시겠습니까? (y/N): ');
        
        // 임시로 false로 설정 (안전을 위해)
        const shouldDelete = false;
        
        if (shouldDelete) {
            const result = await legacyCollection.deleteMany({});
            console.log(`🗑️ 삭제된 문서 수: ${result.deletedCount}`);
        } else {
            console.log('❌ 정리가 취소되었습니다.');
        }
        
    } catch (error) {
        console.error('❌ 레거시 데이터 정리 중 오류:', error);
    }
}

// 컬렉션 상태 확인 함수
async function checkCollectionStatus() {
    try {
        console.log('\n📊 컬렉션 상태 확인...');
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        console.log('📋 전체 컬렉션 목록:');
        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments();
            console.log(`  - ${collection.name}: ${count}개 문서`);
        }
        
    } catch (error) {
        console.error('❌ 컬렉션 상태 확인 중 오류:', error);
    }
}

// 메인 실행 함수
async function main() {
    const isConnected = await connectToMongoDB();
    
    if (!isConnected) {
        console.error('❌ 데이터베이스 연결 실패로 인해 스크립트를 종료합니다.');
        process.exit(1);
    }
    
    await checkCollectionStatus();
    await cleanupLegacyData();
    
    console.log('\n🏁 스크립트 실행 완료');
    process.exit(0);
}

// 스크립트 실행
main().catch(error => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
}); 