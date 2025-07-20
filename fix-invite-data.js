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
    isLoggedIn: { type: Boolean, default: false },
    loginCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    lastLogoutAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema, 'game-member');

const inviteSchema = new mongoose.Schema({
    memberName: { type: String, required: true },
    memberId: { type: String, required: true },
    memberPhone: { type: String, required: true },
    inviterPhone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    inviteDate: { type: Date, default: Date.now }
});

const Invite = mongoose.model('Invite', inviteSchema, 'game-invite');

// 초대 데이터 수정 함수
async function fixInviteData() {
    try {
        console.log('🔧 초대 데이터 수정 시작...');
        
        // "Unknown" 전화번호를 가진 초대 데이터 조회
        const unknownInvites = await Invite.find({ inviterPhone: 'Unknown' });
        console.log(`📊 "Unknown" 전화번호를 가진 초대 데이터: ${unknownInvites.length}건`);
        
        let fixedCount = 0;
        let errorCount = 0;
        
        for (const invite of unknownInvites) {
            try {
                // 해당 사용자의 실제 전화번호 조회
                const user = await User.findOne({ userId: invite.memberId });
                
                if (user && user.phone) {
                    // 전화번호 업데이트
                    invite.inviterPhone = user.phone;
                    await invite.save();
                    
                    console.log(`✅ 수정됨: ${invite.memberName} (${invite.memberId}) - ${user.phone}`);
                    fixedCount++;
                } else {
                    console.log(`⚠️ 사용자 정보 없음: ${invite.memberName} (${invite.memberId})`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ 수정 실패: ${invite.memberName} (${invite.memberId})`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n📈 수정 결과:');
        console.log(`✅ 성공: ${fixedCount}건`);
        console.log(`❌ 실패: ${errorCount}건`);
        console.log(`📊 총 처리: ${unknownInvites.length}건`);
        
    } catch (error) {
        console.error('❌ 초대 데이터 수정 중 오류:', error);
    }
}

// 메인 실행 함수
async function main() {
    const isConnected = await connectToMongoDB();
    
    if (!isConnected) {
        console.error('❌ 데이터베이스 연결 실패로 인해 스크립트를 종료합니다.');
        process.exit(1);
    }
    
    await fixInviteData();
    
    console.log('\n🏁 스크립트 실행 완료');
    process.exit(0);
}

// 스크립트 실행
main().catch(error => {
    console.error('❌ 스크립트 실행 중 오류:', error);
    process.exit(1);
}); 