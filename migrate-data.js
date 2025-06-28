require('dotenv').config();
const mongoose = require('mongoose');

const mongoURI = process.env.MONGODB_URI;

async function migrateData() {
    try {
        console.log('🔗 MongoDB 연결 중...');
        console.log('📡 연결 문자열:', mongoURI ? mongoURI.substring(0, 30) + '...' : 'NOT SET');
        
        if (!mongoURI) {
            console.error('❌ MONGODB_URI 환경변수가 설정되지 않았습니다.');
            return;
        }
        
        // test 데이터베이스에 연결
        console.log('🔗 test 데이터베이스 연결 중...');
        const testConnection = await mongoose.createConnection(mongoURI, {
            dbName: 'test'
        });
        
        // member-management 데이터베이스에 연결
        console.log('🔗 member-management 데이터베이스 연결 중...');
        const memberConnection = await mongoose.createConnection(mongoURI, {
            dbName: 'member-management'
        });
        
        console.log('✅ 두 데이터베이스 모두 연결 성공!');
        
        // 이동할 컬렉션 목록
        const collections = [
            'game-member',
            'game-attendance', 
            'game-board',
            'game-charging',
            'game-invite',
            'game-comment',
            'game-record'
        ];
        
        for (const collectionName of collections) {
            try {
                console.log(`\n📦 ${collectionName} 컬렉션 처리 중...`);
                
                // test 데이터베이스에서 데이터 조회
                const testCollection = testConnection.db.collection(collectionName);
                const documents = await testCollection.find({}).toArray();
                
                console.log(`📊 ${collectionName}: ${documents.length}개 문서 발견`);
                
                if (documents.length > 0) {
                    console.log(`📄 샘플 데이터:`, JSON.stringify(documents[0], null, 2));
                    
                    // member-management 데이터베이스에 데이터 삽입
                    const memberCollection = memberConnection.db.collection(collectionName);
                    
                    // 기존 데이터 삭제 (중복 방지)
                    await memberCollection.deleteMany({});
                    console.log(`🗑️ ${collectionName}: 기존 데이터 삭제 완료`);
                    
                    // 새 데이터 삽입
                    const result = await memberCollection.insertMany(documents);
                    console.log(`✅ ${collectionName}: ${result.length}개 문서 이동 완료`);
                    
                    // 이동 확인
                    const movedCount = await memberCollection.countDocuments();
                    console.log(`🔍 ${collectionName}: 이동 후 문서 수 - ${movedCount}개`);
                    
                } else {
                    console.log(`ℹ️ ${collectionName}: 이동할 데이터 없음`);
                }
                
            } catch (error) {
                console.error(`❌ ${collectionName} 처리 실패:`, error.message);
                console.error('상세 오류:', error);
            }
        }
        
        console.log('\n🎉 모든 컬렉션 처리 완료!');
        
        // 최종 확인
        console.log('\n📋 최종 데이터 현황:');
        for (const collectionName of collections) {
            try {
                const testCount = await testConnection.db.collection(collectionName).countDocuments();
                const memberCount = await memberConnection.db.collection(collectionName).countDocuments();
                console.log(`${collectionName}: test(${testCount}) → member-management(${memberCount})`);
            } catch (error) {
                console.log(`${collectionName}: 확인 실패 - ${error.message}`);
            }
        }
        
        // 연결 종료
        await testConnection.close();
        await memberConnection.close();
        console.log('\n🔌 데이터베이스 연결 종료');
        
    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        console.error('상세 오류:', error);
    }
}

// 마이그레이션 실행
migrateData(); 