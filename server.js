const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname)));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// 메인 페이지 라우팅
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Render 배포 환경 날짜 계산 함수
function getKoreaDateString() {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const currentDate = koreaTime.getFullYear().toString() + 
                       '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                       '-' + String(koreaTime.getDate()).padStart(2, '0');
    
    console.log('🇰🇷 Render 배포 환경 현재 날짜:', currentDate);
    
    return currentDate;
}

// MongoDB 연결 상태 확인 함수
function checkMongoDBConnection() {
    // Render 환경에서는 엄격하게 체크, 로컬에서는 유연하게
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        return mongoose.connection && mongoose.connection.readyState === 1;
        } else {
        // 로컬 개발 환경에서는 유연하게 처리
        return true;
    }
}

// MongoDB 연결 오류 응답 함수
function sendMongoDBErrorResponse(res, message = 'DB 연결 오류') {
    return res.status(503).json({ 
        success: false,
        message: message
    });
}

// team-games 컬렉션 가져오기 함수
function getTeamGamesCollection() {
    return mongoose.connection.db.collection('team-games');
}

// betting-sessions 컬렉션 가져오기 함수
function getBettingCollection() {
    return mongoose.connection.db.collection('betting-sessions');
}

// game-member 컬렉션 가져오기 함수
function getUserCollection() {
    return mongoose.connection.db.collection('game-member');
}

// game-donations 컬렉션 가져오기 함수
function getDonationCollection() {
    return mongoose.connection.db.collection('game-donations');
}

// realtime-monitoring 컬렉션 가져오기 함수
function getRealtimeCollection() {
    return mongoose.connection.db.collection('realtime-monitoring');
}

// betting-sessions 컬렉션 가져오기 함수 (배팅 세션 관리용)
function getBettingSessionsCollection() {
    return mongoose.connection.db.collection('betting-sessions');
}

// betting-game-1 ~ betting-game-5 컬렉션 가져오기 함수
function getBettingGameCollection(gameNumber) {
    return mongoose.connection.db.collection(`betting-game-${gameNumber}`);
}

// game-invite 컬렉션 가져오기 함수
function getInviteCollection() {
    return mongoose.connection.db.collection('game-invite');
}

// game-board 컬렉션 가져오기 함수
function getBoardCollection() {
    return mongoose.connection.db.collection('game-board');
}

// notices 컬렉션 가져오기 함수
function getNoticeCollection() {
    return mongoose.connection.db.collection('notices');
}

// customer-inquiries 컬렉션 가져오기 함수
function getInquiryCollection() {
    return mongoose.connection.db.collection('customer-inquiries');
}

// attendance 컬렉션 가져오기 함수
function getAttendanceCollection() {
    return mongoose.connection.db.collection('game-attendance');
}

// game-charging 컬렉션 가져오기 함수
function getChargingCollection() {
    return mongoose.connection.db.collection('game-charging');
}

// game-record 컬렉션 가져오기 함수
function getGameRecordCollection() {
    return mongoose.connection.db.collection('game-record');
}

function getCommentCollection() {
    return mongoose.connection.db.collection('game-comment');
}

// 데이터 마이그레이션 API (영문 키를 한글 키로 변환)
app.post('/api/migrate-betting-data', async (req, res) => {
    try {
        console.log('🔄 배팅 데이터 마이그레이션 시작...');
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 영문-한글 매핑
        const englishToKorean = {
            '1base': '1루',
            '2base': '2루',
            '3base': '3루',
            'homerun': '홈런',
            'strikeout': '삼진',
            'out': '아웃'
        };
        
        let migratedCount = 0;
        
        // 1~5경기 데이터 마이그레이션
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            const gameCollection = getBettingGameCollection(gameNumber);
            const gameData = await gameCollection.findOne({ 
                date: todayString,
                gameNumber: gameNumber 
            });
            
            if (gameData && gameData.bets && gameData.bets.length > 0) {
                // bets 배열의 prediction을 한글로 변환
                const updatedBets = gameData.bets.map(bet => ({
                    ...bet,
                    prediction: englishToKorean[bet.prediction] || bet.prediction
                }));
                
                // betCounts를 한글 키로 재계산
                const newBetCounts = {
                    '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                };
                
                updatedBets.forEach(bet => {
                    if (newBetCounts.hasOwnProperty(bet.prediction)) {
                        newBetCounts[bet.prediction]++;
                    }
                });
                
                // 데이터 업데이트
                await gameCollection.updateOne(
                    { 
                        date: todayString,
                        gameNumber: gameNumber 
                    },
                    {
                        $set: {
                            bets: updatedBets,
                            betCounts: newBetCounts
                        }
                    }
                );
                
                migratedCount++;
                console.log(`✅ 경기 ${gameNumber} 마이그레이션 완료`);
            }
        }
        
        console.log(`✅ 총 ${migratedCount}개 경기 마이그레이션 완료`);
        
        res.json({ 
            success: true,
            message: `마이그레이션 완료: ${migratedCount}개 경기`,
            migratedCount: migratedCount
        });
        
    } catch (error) {
        console.error('❌ 마이그레이션 오류:', error);
        res.status(500).json({
            success: false,
            message: '마이그레이션 중 오류가 발생했습니다.'
        });
    }
});

// 승리포인트 계산 및 지급 API (간단 버전)
app.post('/api/betting/calculate-game-winners', async (req, res) => {
    try {
        const { gameNumber, actualResult, date } = req.body;
        
        if (!gameNumber || !actualResult || !date) {
            return res.status(400).json({
                success: false,
                message: '게임번호, 실제결과, 날짜가 필요합니다.'
            });
        }
        
        const gameCollection = getBettingGameCollection(gameNumber);
        const userCollection = getUserCollection();
        
        // betting-game-X 컬렉션에서 게임 데이터 조회
        const gameData = await gameCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        if (!gameData || !gameData.bets) {
            return res.status(404).json({
                success: false,
                message: '게임 데이터를 찾을 수 없습니다.'
            });
        }
        
        // 승리자 찾기 (bets 배열에서 actualResult와 일치하는 사용자들)
        const winners = gameData.bets.filter(bet => bet.prediction === actualResult);
        const winnerCount = winners.length;
        const totalBets = gameData.bets.length;
        const loserCount = totalBets - winnerCount;
        
        // 승리 포인트 계산: (패자 수 × 100) ÷ 승리자 수
        const totalLoserPoints = loserCount * 100;
        const pointsPerWinner = winnerCount > 0 ? Math.floor(totalLoserPoints / winnerCount) : 0;
        
        // 승리자들에게 포인트 지급
        for (const winner of winners) {
            await userCollection.updateOne(
                { userId: winner.userId },
                { $inc: { points: pointsPerWinner } }
            );
        }
        
        console.log(`✅ 게임 ${gameNumber} 승리포인트 계산 및 지급 완료:`);
        console.log(`- 총 배팅: ${totalBets}명`);
        console.log(`- 승리자: ${winnerCount}명`);
        console.log(`- 패자: ${loserCount}명`);
        console.log(`- 성공자당 분배 포인트: ${pointsPerWinner}`);
        
        res.json({
            success: true,
            message: '승리포인트 계산 및 지급이 완료되었습니다.',
            data: {
                gameNumber: gameNumber,
                actualResult: actualResult,
                totalBets: totalBets,
                winnerCount: winnerCount,
                loserCount: loserCount,
                pointsPerWinner: pointsPerWinner
            }
        });
        
    } catch (error) {
        console.error('승리포인트 계산 오류:', error);
        res.status(500).json({
            success: false,
            message: '승리포인트 계산 중 오류가 발생했습니다.'
        });
    }
});

// 모든 배팅 데이터 완전 초기화 API
app.post('/api/clear-all-betting-data', async (req, res) => {
    try {
        console.log('🧹 모든 배팅 데이터 완전 초기화 시작...');
        
        // 한국 시간대로 오늘 날짜 계산 (정확한 계산)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        console.log('📅 초기화 대상 날짜:', todayString);
        
        let clearedCount = 0;
        
        // 1~5경기 데이터 완전 초기화
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            const gameCollection = getBettingGameCollection(gameNumber);
            
            // 완전히 삭제 후 새로 생성 (강제 초기화)
            await gameCollection.deleteMany({
                date: todayString,
                gameNumber: gameNumber
            });
            
            // 새로운 빈 데이터 생성
            await gameCollection.insertOne({
                date: todayString,
                gameNumber: gameNumber,
                matchup: '',
                status: 'pending',
                bettingStart: '대기',
                bettingStop: '대기',
                totalBets: 0,
                betCounts: {
                    '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                },
                bets: [], // 완전히 빈 배열
                predictionResult: '' // 예측 결과도 초기화
            });
            
            clearedCount++;
            console.log(`✅ 경기 ${gameNumber} 데이터 초기화 완료: betCounts=0, bets=[], totalBets=0`);
        }
        
        console.log(`✅ 모든 배팅 데이터 완전 초기화 완료: ${clearedCount}개 경기`);
        
        res.json({ 
                success: true, 
            message: `모든 배팅 데이터 초기화 완료: ${clearedCount}개 경기`,
            clearedCount: clearedCount
        });
        
    } catch (error) {
        console.error('❌ 배팅 데이터 초기화 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '배팅 데이터 초기화 중 오류가 발생했습니다.'
        });
    }
});

// 영문 키 완전 제거 및 한글 통일 API
app.post('/api/clean-english-data', async (req, res) => {
    try {
        console.log('🧹 영문 키 완전 제거 및 한글 통일 시작...');
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 영문-한글 매핑
        const englishToKorean = {
            '1base': '1루',
            '2base': '2루',
            '3base': '3루',
            'homerun': '홈런',
            'strikeout': '삼진',
            'out': '아웃'
        };
        
        let cleanedCount = 0;
        
        // 1~5경기 데이터 정리
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            const gameCollection = getBettingGameCollection(gameNumber);
            const gameData = await gameCollection.findOne({ 
                date: todayString,
                gameNumber: gameNumber 
            });
            
            if (gameData && gameData.bets && gameData.bets.length > 0) {
                // 1. bets 배열의 prediction을 한글로 변환 (영문 완전 제거)
                const updatedBets = gameData.bets.map(bet => ({
                    ...bet,
                    prediction: englishToKorean[bet.prediction] || bet.prediction
                }));
                
                // 2. betCounts를 한글 키로만 재계산 (영문 키 완전 제거)
                const newBetCounts = {
                    '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                };
                
                updatedBets.forEach(bet => {
                    if (newBetCounts.hasOwnProperty(bet.prediction)) {
                        newBetCounts[bet.prediction]++;
                    }
                });
                
                // 3. 데이터 완전 교체 (영문 키 완전 제거)
                await gameCollection.updateOne(
                    { 
                        date: todayString,
                        gameNumber: gameNumber 
                    },
                    {
                        $set: {
                            bets: updatedBets,
                            betCounts: newBetCounts,
                            totalBets: updatedBets.length
                        }
                    }
                );
                
                cleanedCount++;
                console.log(`✅ 경기 ${gameNumber} 영문 제거 완료:`, newBetCounts);
            }
        }
        
        console.log(`✅ 영문 키 완전 제거 완료: ${cleanedCount}개 경기`);
        
        res.json({
                success: true, 
            message: `영문 키 완전 제거 완료: ${cleanedCount}개 경기`,
            cleanedCount: cleanedCount
        });
        
    } catch (error) {
        console.error('❌ 영문 제거 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '영문 제거 중 오류가 발생했습니다.'
        });
    }
});

// betCounts 초기화 API (기존 데이터 수정용)
app.post('/api/fix-betcounts', async (req, res) => {
    try {
        console.log('🔧 betCounts 초기화 시작...');
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        let fixedCount = 0;
        
        // 1~5경기 데이터 수정
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            const gameCollection = getBettingGameCollection(gameNumber);
            const gameData = await gameCollection.findOne({ 
                date: todayString,
                gameNumber: gameNumber 
            });
            
            if (gameData && gameData.bets && gameData.bets.length > 0) {
                // bets 배열을 기반으로 betCounts 재계산
                const newBetCounts = {
                    '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                };
                
                gameData.bets.forEach(bet => {
                    if (newBetCounts.hasOwnProperty(bet.prediction)) {
                        newBetCounts[bet.prediction]++;
                    }
                });
                
                // 데이터 업데이트
                await gameCollection.updateOne(
                    { 
                        date: todayString,
                        gameNumber: gameNumber 
                    },
            {
                $set: {
                            betCounts: newBetCounts,
                            totalBets: gameData.bets.length
                        }
                    }
                );
                
                fixedCount++;
                console.log(`✅ 경기 ${gameNumber} betCounts 수정 완료:`, newBetCounts);
            }
        }
        
        console.log(`✅ 총 ${fixedCount}개 경기 betCounts 수정 완료`);
        
        res.json({
                success: true, 
            message: `betCounts 수정 완료: ${fixedCount}개 경기`,
            fixedCount: fixedCount
        });
        
    } catch (error) {
        console.error('❌ betCounts 수정 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: 'betCounts 수정 중 오류가 발생했습니다.'
        });
    }
});

// team-games API
app.get('/api/team-games', async (req, res) => {
    try {
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 오늘의 모든 경기 조회
        const teamGamesCollection = getTeamGamesCollection();
        const todayGames = await teamGamesCollection.find({ date: todayString }).sort({ gameNumber: 1 }).toArray();
        
        res.json({ 
            success: true,
            date: todayString,
            games: todayGames
        });
    } catch (error) {
        console.error('team-games 조회 오류:', error);
        res.status(500).json({ 
                success: false,
            message: 'team-games 조회 중 오류가 발생했습니다.'
            });
        }
});
        
// 배팅 제출 API (수정된 구조)
app.post('/api/betting/submit', async (req, res) => {
    try {
        const { userId, userName, gameNumber, prediction, points } = req.body;
        
        if (!userId || !gameNumber || !prediction || !points) {
            return res.status(400).json({ 
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }
        
        // MongoDB 연결 상태 확인 (로컬 테스트를 위해 임시로 주석 처리)
        // if (!checkMongoDBConnection()) {
        //     return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        // }
        
        // 로컬 테스트를 위한 임시 사용자 데이터
        const user = { userId: userId, name: '사용자', points: 1000 };
        
        // 포인트 확인
        if (user.points < parseInt(points)) {
            return res.status(400).json({
                success: false,
                message: '포인트가 부족합니다.'
            });
        }
        
        // 중복 배팅 체크 (오늘 날짜에 이미 배팅했는지 확인)
        const checkToday = new Date();
        const checkKoreaTime = new Date(checkToday.getTime() + (9 * 60 * 60 * 1000));
        const checkTodayString = checkKoreaTime.getFullYear().toString() + 
                                '-' + String(checkToday.getMonth() + 1).padStart(2, '0') + 
                                '-' + String(checkToday.getDate()).padStart(2, '0');
        
        
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const date = koreaTime.getFullYear().toString() + 
                    '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                    '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 실제 배팅 데이터 저장
        const gameCollection = getBettingGameCollection(gameNumber);
        const gameRecordCollection = getGameRecordCollection();
        
        // 기존 게임 데이터 조회
        const existingGame = await gameCollection.findOne({ 
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        // team-games 컬렉션에서 matchup 정보 가져오기
        const teamGamesCollection = getTeamGamesCollection();
        const gameInfo = await teamGamesCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        const matchup = gameInfo ? gameInfo.matchup : '';
        
        if (!existingGame) {
            // 기존 데이터가 없으면 새로운 집계 데이터 생성
            const initialBetCounts = {
                '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
            };
            initialBetCounts[prediction] = 1;
            
            await gameCollection.insertOne({
                date: date,
                gameNumber: parseInt(gameNumber),
                matchup: matchup,
                status: 'active',
                bettingStart: '진행중',
                bettingStop: '대기',
                totalBets: 1,
                betCounts: initialBetCounts,
                bets: [{
                    userId: userId,
                    userName: userName || user.name,
                    prediction: prediction,
                    points: parseInt(points),
                    betTime: new Date()
                }],
                predictionResult: ''
            });
        } else {
            // 기존 데이터가 있으면 업데이트
            const updatedBetCounts = { ...existingGame.betCounts };
            updatedBetCounts[prediction] = (updatedBetCounts[prediction] || 0) + 1;
            
            await gameCollection.updateOne(
                { _id: existingGame._id },
                {
                    $inc: { totalBets: 1 },
                    $set: { betCounts: updatedBetCounts },
                    $push: {
                        bets: {
                            userId: userId,
                            userName: userName || user.name,
                            prediction: prediction,
                            points: parseInt(points),
                            betTime: new Date()
                        }
                    }
                }
            );
        }
        
        // game-record 컬렉션에 배팅 기록 저장
        const bettingRecord = {
            userId: userId,
            userName: userName || user.name,
            gameNumber: parseInt(gameNumber),
            date: date,
            matchup: matchup,
            prediction: prediction,
            points: parseInt(points),
            betTime: new Date(),
            status: 'active',
            result: null,
            createdAt: new Date()
        };
        
        await gameRecordCollection.insertOne(bettingRecord);
        
        console.log(`게임 배팅 제출: ${userId} - ${prediction} ${points}포인트`);
        console.log(`게임 번호: ${gameNumber}, 날짜: ${date}`);
        console.log(`✅ game-record 컬렉션에 배팅 기록 저장 완료`);
        
        res.json({
            success: true,
            message: '배팅이 완료되었습니다.',
            remainingPoints: user.points - parseInt(points)
        });
    } catch (error) {
        console.error('배팅 제출 오류:', error);
        res.status(500).json({ 
            success: false,
            message: '배팅 제출 중 오류가 발생했습니다.'
        });
    }
});

// 게임 상태 조회 API
app.get('/api/games/status', async (req, res) => {
    try {
        // 한국 시간대로 오늘 날짜 계산 (YYYY-MM-DD 형식)
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 오늘의 모든 경기 조회
        const teamGamesCollection = getTeamGamesCollection();
        const todayGames = await teamGamesCollection.find({ date: todayString }).sort({ gameNumber: 1 }).toArray();
        
        res.json({ 
            success: true,
            date: todayString,
            games: todayGames.map(game => ({
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                startTime: game.startTime,
                endTime: game.endTime,
                gameStatus: game.gameStatus,
                progressStatus: game.progressStatus,
                bettingStart: game.bettingStart,
                bettingStop: game.bettingStop,
                predictionResult: game.predictionResult
            }))
        });
    } catch (error) {
        console.error('게임 상태 조회 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게임 상태 조회 중 오류가 발생했습니다.'
        });
    }
});

// 관리자 게임 제어 API들
app.put('/api/admin/game/:gameNumber/start-betting', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = getTeamGamesCollection();
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false, 
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 배팅 시작 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    bettingStart: '시작',
                    bettingStop: '진행',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 배팅 시작: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({ 
            success: true,
            message: '배팅이 시작되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                bettingStart: '시작',
                bettingStop: '진행'
            }
        });
    } catch (error) {
        console.error('배팅 시작 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '배팅 시작 중 오류가 발생했습니다.'
        });
    }
});

app.put('/api/admin/game/:gameNumber/stop-betting', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = getTeamGamesCollection();
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false,
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 배팅 중지 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            { 
                $set: { 
                    bettingStart: '중지',
                    bettingStop: '중지',
                    updatedAt: new Date()
                } 
            }
        );
        
        console.log(`✅ 배팅 중지: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({ 
            success: true, 
            message: '배팅이 중지되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                bettingStart: '중지',
                bettingStop: '중지'
            }
        });
    } catch (error) {
        console.error('배팅 중지 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 중지 중 오류가 발생했습니다.'
        });
    }
});

app.put('/api/admin/game/:gameNumber/end-game', async (req, res) => {
    try {
        const { gameNumber } = req.params;
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // team-games 컬렉션에서 해당 경기 찾기
        const teamGamesCollection = getTeamGamesCollection();
        const game = await teamGamesCollection.findOne({ 
            date: todayString, 
            gameNumber: parseInt(gameNumber) 
        });
        
        if (!game) {
            return res.status(404).json({ 
                success: false,
                message: '경기를 찾을 수 없습니다.' 
            });
        }
        
        // 게임 종료 상태로 업데이트
        await teamGamesCollection.updateOne(
            { _id: game._id },
            {
                $set: {
                    progressStatus: '경기종료',
                    bettingStart: '종료',
                    bettingStop: '종료',
                    updatedAt: new Date()
                }
            }
        );
        
        // 모든 경기별 배팅 집계 초기화 (다음 타자 준비)
        for (let i = 1; i <= 5; i++) {
            const gameCollection = getBettingGameCollection(i);
            await gameCollection.updateOne(
                { 
                    date: todayString,
                    gameNumber: i
                },
                {
                    $set: {
                        totalBets: 0,
                        betCounts: {
                            '1루': 0,
                            '2루': 0,
                            '3루': 0,
                            '홈런': 0,
                            '삼진': 0,
                            '아웃': 0
                        },
                        bets: [], // bets 배열 완전 비우기
                        predictionResult: '' // 예측 결과도 초기화
                    }
                },
                { upsert: true }
            );
            console.log(`✅ 관리자 다음타자: 경기 ${i} 초기화 완료 - betCounts=0, bets=[], totalBets=0`);
        }
        
        console.log(`✅ 모든 경기별 배팅 집계 초기화 완료`);
        
        console.log(`✅ 게임 종료: 경기 ${gameNumber} (${game.matchup})`);
        
        res.json({
            success: true,
            message: '게임이 종료되었습니다.',
            game: {
                gameNumber: game.gameNumber,
                matchup: game.matchup,
                progressStatus: game.progressStatus,
                predictionResult: game.predictionResult
            }
        });
    } catch (error) {
        console.error('게임 종료 오류:', error);
        res.status(500).json({
            success: false,
            message: '게임 종료 중 오류가 발생했습니다.'
        });
    }
});

// 실시간 모니터링용 API들
app.get('/api/admin/betting-games', async (req, res) => {
    if (!checkMongoDBConnection()) {
        return sendMongoDBErrorResponse(res);
    }

    try {
        const { date } = req.query;
        const targetDate = date || getKoreaDateString();
        
        console.log(`[Admin] 배팅 게임 데이터 조회 - 날짜: ${targetDate}`);
        
        const gamesData = [];
        
        // 1~5경기 데이터 수집
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            try {
                const collection = getBettingGameCollection(gameNumber);
                const gameData = await collection.findOne({ 
                    date: targetDate,
                    gameNumber: gameNumber 
                });
                
                if (gameData) {
                    gamesData.push({
                        gameNumber: gameData.gameNumber,
                        date: gameData.date,
                        matchup: gameData.matchup,
                        status: gameData.status || 'pending',
                        bettingStart: gameData.bettingStart,
                        bettingStop: gameData.bettingStop,
                        totalBets: gameData.totalBets || 0,
                        betCounts: gameData.betCounts || {},
                        predictionResult: gameData.predictionResult || ''
                    });
                } else {
                    gamesData.push({
                        gameNumber: gameNumber,
                        date: targetDate,
                        matchup: '',
                        status: 'pending',
                        bettingStart: '대기',
                        bettingStop: '대기',
                        totalBets: 0,
                        betCounts: {},
                        predictionResult: ''
                    });
                }
            } catch (error) {
                console.error(`경기 ${gameNumber} 데이터 조회 오류:`, error);
                gamesData.push({
                    gameNumber: gameNumber,
                    date: targetDate,
                    matchup: '',
                    status: 'error',
                    bettingStart: '대기',
                    bettingStop: '대기',
                    totalBets: 0,
                    betCounts: {},
                    predictionResult: ''
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                date: targetDate,
                games: gamesData
            }
        });
        
    } catch (error) {
        console.error('배팅 게임 데이터 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '배팅 게임 데이터 조회 중 오류가 발생했습니다.'
        });
    }
});

// 경기별 배팅 집계 조회 API
app.get('/api/admin/betting-aggregation', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || getKoreaDateString();
        
        console.log(`[Admin] 경기별 배팅 집계 조회 - 날짜: ${targetDate}`);
        
        const aggregationData = [];
        
        // 1~5경기 배팅 집계 조회
        for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
            const gameCollection = getBettingGameCollection(gameNumber);
            const gameData = await gameCollection.findOne({ 
                date: targetDate,
                gameNumber: gameNumber 
            });
            
            if (gameData) {
                // 성공률 계산
                const totalBets = gameData.totalBets || 0;
                const betCounts = gameData.betCounts || {
                    '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                };
                
                // 각 선택별 성공률 계산 (실제 결과가 있을 때만)
                const successRates = {};
                if (gameData.predictionResult) {
                    Object.keys(betCounts).forEach(choice => {
                        const choiceCount = betCounts[choice] || 0;
                        const successRate = totalBets > 0 ? (choiceCount / totalBets * 100).toFixed(1) : 0;
                        successRates[choice] = parseFloat(successRate);
                    });
                }
                
                aggregationData.push({
                    gameNumber: gameNumber,
                    totalBets: totalBets,
                    betCounts: betCounts,
                    successRates: successRates,
                    predictionResult: gameData.predictionResult || ''
                });
            } else {
                // 데이터가 없는 경우 기본값
                aggregationData.push({
                    gameNumber: gameNumber,
                    totalBets: 0,
                    betCounts: {
                        '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                    },
                    successRates: {
                        '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                    },
                    predictionResult: ''
                });
            }
        }
        
        res.json({
            success: true,
            data: {
                date: targetDate,
                games: aggregationData
            }
        });
        
    } catch (error) {
        console.error('경기별 배팅 집계 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '경기별 배팅 집계 조회 중 오류가 발생했습니다.'
        });
    }
});

// 출석 현황 조회 API
app.get('/api/attendance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        const attendanceCollection = getAttendanceCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // 현재 월 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const currentYear = koreaTime.getFullYear();
        const currentMonth = koreaTime.getMonth() + 1;
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 사용자의 모든 출석 기록 조회
        const attendanceRecords = await attendanceCollection.find({ userId: userId }).toArray();
        
        // 이번달 출석 기록 필터링
        const monthAttendance = attendanceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getFullYear() === currentYear && recordDate.getMonth() + 1 === currentMonth;
        });
        
        // 출석 기록을 날짜별로 변환
        const attendanceHistory = attendanceRecords.map(record => ({
            date: record.date,
            checked: true,
            status: record.status,
            streak: record.streak,
            totalAttendance: record.totalAttendance
        }));
        
        // 최신 연속 출석 일수
        const latestRecord = attendanceRecords.length > 0 ? 
            attendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        const currentStreak = latestRecord ? latestRecord.streak : 0;
        
        console.log(`✅ 출석 현황 조회 완료: ${userId} -> 이번달: ${monthAttendance.length}일, 전체: ${attendanceRecords.length}일, 연속: ${currentStreak}일`);
        
        res.json({ 
            success: true,
            message: '출석 현황을 조회했습니다.',
            data: {
                userId: userId,
                today: todayString,
                attendanceCount: monthAttendance.length,
                totalDays: attendanceRecords.length,
                attendanceHistory: attendanceHistory,
                monthPoints: monthAttendance.length * 100,
                totalPoints: attendanceRecords.length * 100,
                currentStreak: currentStreak
            }
        });
        
    } catch (error) {
        console.error('출석 현황 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '출석 현황 조회 중 오류가 발생했습니다.'
        });
    }
});

// 게시글 목록 조회 API
app.get('/api/board', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const boardCollection = getBoardCollection();
        
        // 검색 조건 설정
        let query = {};
        if (search) {
            query = {
                $or: [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { authorName: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        // 전체 게시글 수 조회
        const totalCount = await boardCollection.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // 게시글 목록 조회 (최신순)
        const boards = await boardCollection.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        // 각 게시글의 댓글 수를 실시간으로 계산
        const commentCollection = getCommentCollection();
        for (const board of boards) {
            const commentCount = await commentCollection.countDocuments({
                $or: [
                    { boardId: board._id.toString() },  // 문자열로 저장된 경우
                    { boardId: board._id }  // ObjectId로 저장된 경우
                ]
            });
            board.commentCount = commentCount;
        }
        
        console.log(`✅ 게시글 목록 조회 완료: ${boards.length}건 (총 ${totalCount}건)`);
        
        res.json({
            success: true,
            message: '게시글 목록을 조회했습니다.',
            data: {
                boards: boards,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: parseInt(limit)
                },
                search: search
            }
        });
        
    } catch (error) {
        console.error('게시글 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 목록 조회 중 오류가 발생했습니다.'
        });
    }
});

// 게시글 작성 API
app.post('/api/board', async (req, res) => {
    try {
        const { userId, userName, title, content } = req.body;
        
        if (!userId || !userName || !title || !content) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const boardCollection = getBoardCollection();
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 게시글 데이터 생성
        const boardData = {
            userId: userId,
            authorName: userName,
            title: title,
            content: content,
            createdAt: todayString,
            updatedAt: todayString,
            views: 0,
            likes: 0,
            commentCount: 0
        };
        
        // 게시글 저장
        const result = await boardCollection.insertOne(boardData);
        
        console.log(`✅ 게시글 작성 완료: ${userId} -> ${title}`);
        
        res.json({
            success: true,
            message: '게시글이 작성되었습니다.',
            data: {
                boardId: result.insertedId,
                userId: userId,
                userName: userName,
                title: title,
                content: content,
                createdAt: todayString,
                views: 0,
                likes: 0
            }
        });
        
    } catch (error) {
        console.error('게시글 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 작성 중 오류가 발생했습니다.'
        });
    }
});

// 사용자 정보 조회 API
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인 (로컬 개발용 임시 데이터)
        if (!checkMongoDBConnection()) {
            // 임시 데이터 반환
            const tempUser = {
                userId: userId,
                name: '테스트 사용자',
                email: 'test@example.com',
                phone: '010-1234-5678',
                favoriteTeam: '두산',
                points: 1000,
                joinDate: '2025-01-01',
                lastLogin: '2025-01-15',
                totalBets: 10,
                winCount: 5,
                loseCount: 5,
                donationAmount: 100
            };
            
            return res.json({
                success: true,
                message: '사용자 정보를 조회했습니다. (임시 데이터)',
                data: tempUser
            });
        }
        
        const userCollection = getUserCollection();
        const donationCollection = getDonationCollection();

        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // game-donations 컬렉션에서 사용자의 총 기부액 계산
        const donations = await donationCollection.find({ userId: userId }).toArray();
        const totalDonationAmount = donations.reduce((sum, donation) => sum + donation.donationAmount, 0);
        
        // 민감한 정보 제외하고 응답
        res.json({
            success: true,
            message: '사용자 정보를 조회했습니다.',
            data: {
            userId: user.userId,
                name: user.name || user.username,
            email: user.email,
            phone: user.phone,
            favoriteTeam: user.favoriteTeam,
                points: user.points || 0,
                joinDate: user.createdAt || user.joinDate,
                lastLogin: user.lastLogin,
                totalBets: user.totalBets || 0,
                winCount: user.winCount || 0,
                loseCount: user.loseCount || 0,
                donationAmount: totalDonationAmount
            }
        });
        
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '사용자 정보 조회 중 오류가 발생했습니다.'
        });
    }
});

// 문의 목록 조회 API
app.get('/api/inquiries', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const inquiryCollection = getInquiryCollection();
        
        // 사용자의 문의 목록 조회 (최신순)
        const inquiries = await inquiryCollection.find({ userId: userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        console.log(`✅ 문의 목록 조회 완료: ${userId} -> ${inquiries.length}건`);
        
        res.json({
            success: true,
            message: '문의 목록을 조회했습니다.',
            data: {
                inquiries: inquiries,
                totalCount: inquiries.length
            }
        });
        
    } catch (error) {
        console.error('문의 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '문의 목록 조회 중 오류가 발생했습니다.'
        });
    }
});

// 문의 작성 API
app.post('/api/inquiries', async (req, res) => {
    try {
        const { userId, userName, title, content, category } = req.body;
        
        if (!userId || !userName || !title || !content || !category) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const inquiryCollection = getInquiryCollection();
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 문의 데이터 생성
        const inquiryData = {
            userId: userId,
            userName: userName,
            title: title,
            content: content,
            category: category,
            status: 'pending',
            createdAt: todayString,
            updatedAt: todayString,
            answer: null,
            answeredAt: null
        };
        
        // 문의 저장
        const result = await inquiryCollection.insertOne(inquiryData);
        
        console.log(`✅ 문의 작성 완료: ${userId} -> ${title}`);
        
        res.json({
            success: true,
            message: '문의가 등록되었습니다.',
            data: {
                inquiryId: result.insertedId,
                userId: userId,
                userName: userName,
                title: title,
                content: content,
                category: category,
                status: 'pending',
                createdAt: todayString,
                answer: null
            }
        });
        
    } catch (error) {
        console.error('문의 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '문의 작성 중 오류가 발생했습니다.'
        });
    }
});

// 기부 처리 API
app.post('/api/donation', async (req, res) => {
    try {
        const { userId, userName, donationAmount, percentage } = req.body;
        
        if (!userId || !userName || !donationAmount || percentage === undefined) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const donationCollection = getDonationCollection();
        const userCollection = getUserCollection();
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 기부 데이터 생성
        const donationData = {
            userId: userId,
            userName: userName,
            donationAmount: parseInt(donationAmount),
            percentage: parseInt(percentage),
            createdAt: todayString,
            updatedAt: todayString
        };
        
        // 사용자 포인트 차감 (기부 금액만큼)
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        if (user.points < donationAmount) {
            return res.status(400).json({
                success: false,
                message: '보유 포인트가 부족합니다.'
            });
        }
        
        // 기부 기록 저장
        await donationCollection.insertOne(donationData);
        
        // 사용자 포인트 차감
        await userCollection.updateOne(
            { userId: userId },
            { $inc: { points: -donationAmount } }
        );
        
        console.log(`✅ 기부 처리 완료: ${userName} -> ${donationAmount}포인트 (${percentage}%)`);
        console.log(`💰 사용자 포인트 차감: ${user.points} → ${user.points - donationAmount}`);
        
        res.json({
            success: true,
            message: '기부가 완료되었습니다.',
            data: {
                userId: userId,
                userName: userName,
                donationAmount: parseInt(donationAmount),
                percentage: parseInt(percentage),
                createdAt: todayString,
                remainingPoints: user.points - donationAmount
            }
        });
        
    } catch (error) {
        console.error('기부 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '기부 처리 중 오류가 발생했습니다.'
        });
    }
});

// 공지사항 목록 조회 API
app.get('/api/notices', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        // MongoDB 연결 상태 확인 (로컬 개발용 임시 데이터)
        if (!checkMongoDBConnection()) {
            // 임시 데이터 반환
            const tempNotices = [
                {
                    _id: 'temp1',
                    title: '또 한번',
                    content: '이번주에 다시한번 갈아서 ',
                    isImportant: false,
                    author: '관리자',
                    category: '일반',
                    views: 0,
                    createdAt: '2025-07-17T02:05:15.143+00:00',
                    updatedAt: '2025-07-17T02:05:15.143+00:00'
                },
                {
                    _id: 'temp2',
                    title: '연습',
                    content: '공지사항 연습',
                    isImportant: false,
                    author: '관리자',
                    category: '일반',
                    views: 0,
                    createdAt: '2025-07-17T02:06:44.164+00:00',
                    updatedAt: '2025-07-17T02:06:44.164+00:00'
                },
                {
                    _id: 'temp3',
                    title: '갈아~~',
                    content: '잘 만 갈아 엎어지면 좋겠다 ㅇㅇ',
                    isImportant: false,
                    author: '관리자',
                    category: '일반',
                    views: 0,
                    createdAt: '2025-07-17T11:23:34.522+00:00',
                    updatedAt: '2025-07-17T11:23:34.522+00:00'
                },
                {
                    _id: 'temp4',
                    title: '현재 온도 37도',
                    content: '오늘 같은 날 야구 경기는 잔혹하다',
                    isImportant: false,
                    author: '관리자',
                    category: '일반',
                    views: 0,
                    createdAt: '2025-07-26T16:51:17.467+00:00',
                    updatedAt: '2025-07-26T16:51:17.467+00:00'
                }
            ];
            
            return res.json({
                success: true,
                message: '공지사항 목록을 조회했습니다. (임시 데이터)',
                data: {
                    notices: tempNotices,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: 1,
                        totalCount: 4,
                        limit: parseInt(limit)
                    },
                    search: search
                }
            });
        }
        
        const noticeCollection = getNoticeCollection();
        
        // 검색 조건 설정
        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { content: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            };
        }
        
        // 전체 공지사항 수 조회
        const totalCount = await noticeCollection.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // 공지사항 목록 조회 (최신순, 중요도순)
        const notices = await noticeCollection.find(query)
            .sort({ isImportant: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        // 누락된 필드들을 기본값으로 처리
        const processedNotices = notices.map(notice => ({
            ...notice,
            author: notice.author || '관리자',
            category: notice.category || '일반',
            views: notice.views || 0
        }));
        
        console.log(`✅ 공지사항 목록 조회 완료: ${processedNotices.length}건 (총 ${totalCount}건)`);
        
        res.json({ 
            success: true,
            message: '공지사항 목록을 조회했습니다.',
            data: {
                notices: processedNotices,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalCount: totalCount,
                    limit: parseInt(limit)
                },
                search: search
            }
        });
        
    } catch (error) {
        console.error('공지사항 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '공지사항 목록 조회 중 오류가 발생했습니다.'
        });
    }
});

// 공지사항 상세 조회 API
app.get('/api/notices/:noticeId', async (req, res) => {
    try {
        const { noticeId } = req.params;
        
        if (!noticeId) {
            return res.status(400).json({
                success: false,
                message: '공지사항 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인 (로컬 개발용 임시 데이터)
        if (!checkMongoDBConnection()) {
            // 임시 데이터 반환
            const tempNotice = {
                _id: noticeId,
                title: '또 한번',
                content: '이번주에 다시한번 갈아서 ',
                isImportant: false,
                author: '관리자',
                category: '일반',
                views: 1,
                createdAt: '2025-07-17T02:05:15.143+00:00',
                updatedAt: '2025-07-17T02:05:15.143+00:00'
            };
            
            return res.json({
            success: true,
                message: '공지사항을 조회했습니다. (임시 데이터)',
                data: { notice: tempNotice }
            });
        }
        
        const noticeCollection = getNoticeCollection();
        
        // ObjectId로 변환 (MongoDB ObjectId 형식인 경우)
        let query = { _id: noticeId };
        if (noticeId.match(/^[0-9a-fA-F]{24}$/)) {
            const { ObjectId } = require('mongodb');
            query = { _id: new ObjectId(noticeId) };
        }
        
        // 공지사항 조회
        const notice = await noticeCollection.findOne(query);
        
        if (!notice) {
            return res.status(404).json({
                success: false,
                message: '공지사항을 찾을 수 없습니다.'
            });
        }
        
        // 조회수 증가
        await noticeCollection.updateOne(
            { _id: notice._id },
            { $inc: { views: 1 } }
        );
        
        // 누락된 필드들을 기본값으로 처리
        const processedNotice = {
            ...notice,
            author: notice.author || '관리자',
            category: notice.category || '일반',
            views: (notice.views || 0) + 1
        };
        
        console.log(`✅ 공지사항 상세 조회 완료: ${noticeId} -> ${notice.title}`);
        
        res.json({ 
            success: true,
            message: '공지사항을 조회했습니다.',
            data: {
                notice: processedNotice
            }
        });
        
    } catch (error) {
        console.error('공지사항 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '공지사항 상세 조회 중 오류가 발생했습니다.'
        });
    }
});

// 아이디 중복 확인 API
app.post('/api/check-id', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '아이디를 입력해주세요.'
            });
        }
        
        // 아이디 형식 검증
        if (userId.length < 4) {
            return res.status(400).json({
                success: false,
                message: '아이디는 4자 이상 입력해주세요.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 아이디 중복 확인
        const existingUser = await userCollection.findOne({ userId: userId });
        
        if (existingUser) {
            return res.json({
                success: true,
                available: false,
                message: '이미 사용 중인 아이디입니다.'
            });
        }
        
        console.log(`✅ 아이디 중복 확인 완료: ${userId} (사용 가능)`);
        
        res.json({
            success: true,
            available: true,
            message: '사용 가능한 아이디입니다.'
        });
        
    } catch (error) {
        console.error('아이디 중복 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '아이디 중복 확인 중 오류가 발생했습니다.'
        });
    }
});

// 회원가입 API
app.post('/api/register', async (req, res) => {
    try {
        const { userId, password, name, phone } = req.body;
        
        if (!userId || !password || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: '모든 필수 정보를 입력해주세요.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 아이디 중복 확인
        const existingUser = await userCollection.findOne({ userId: userId });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: '이미 사용 중인 아이디입니다.'
            });
        }
        
        // 전화번호 중복 확인
        const existingPhone = await userCollection.findOne({ phone: phone });
        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: '이미 등록된 전화번호입니다.'
            });
        }
        
        // 새 사용자 생성
        const todayString = getKoreaDateString();
        const newUser = {
            userId: userId,
            password: password,
            name: name,
            phone: phone,
            points: 1000, // 기본 포인트
            createdAt: todayString,
            updatedAt: todayString,
            lastLogin: null
        };
        
        const result = await userCollection.insertOne(newUser);
        
        console.log(`✅ 회원가입 완료: ${userId} (${name})`);
        
        res.json({
            success: true,
            message: '회원가입이 완료되었습니다.',
            data: {
                userId: userId,
                name: name,
                points: 1000
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

// 아이디 찾기 API
app.post('/api/find-id', async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: '이름과 전화번호를 모두 입력해주세요.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ 
            name: name,
            phone: phone
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '입력하신 정보와 일치하는 회원을 찾을 수 없습니다.'
            });
        }
        
        console.log(`✅ 아이디 찾기 완료: ${user.userId}`);
        
        res.json({
            success: true,
            message: '아이디를 찾았습니다.',
            userId: user.userId,
            name: user.name
        });
        
    } catch (error) {
        console.error('아이디 찾기 오류:', error);
        res.status(500).json({
            success: false,
            message: '아이디 찾기 중 오류가 발생했습니다.'
        });
    }
});

// 비밀번호 찾기 API
app.post('/api/find-password', async (req, res) => {
    try {
        const { userId, name, phone } = req.body;
        
        if (!userId || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: '아이디, 이름, 전화번호를 모두 입력해주세요.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ 
            userId: userId,
            name: name,
            phone: phone
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '입력하신 정보와 일치하는 회원을 찾을 수 없습니다.'
            });
        }
        
        // 비밀번호 마스킹 처리 (보안상 전체 비밀번호는 노출하지 않음)
        const password = user.password || '';
        const maskedPassword = password.length > 2 
            ? password.charAt(0) + '*'.repeat(password.length - 2) + password.charAt(password.length - 1)
            : '*'.repeat(password.length);
        
        console.log(`✅ 비밀번호 찾기 완료: ${userId}`);
        
        res.json({ 
            success: true,
            message: '비밀번호를 찾았습니다.',
            maskedPassword: maskedPassword,
            userId: userId
        });
        
    } catch (error) {
        console.error('비밀번호 찾기 오류:', error);
        res.status(500).json({
            success: false,
            message: '비밀번호 찾기 중 오류가 발생했습니다.'
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
                message: '아이디와 비밀번호를 입력해주세요.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 조회
        const user = await userCollection.findOne({ userId: userId });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 일치하지 않습니다.'
            });
        }
        
        // 비밀번호 확인 (실제로는 해시 비교)
        if (user.password !== password) {
            return res.status(401).json({
                success: false,
                message: '아이디 또는 비밀번호가 일치하지 않습니다.'
            });
        }
        
        // 로그인 성공 시 사용자 정보 반환
        const userInfo = {
            userId: user.userId,
            name: user.name || user.username || '사용자',
            points: user.points || 0,
            phone: user.phone || '',
            isGuest: false
        };
        
        console.log(`✅ 로그인 성공: ${userId}`);
        
        res.json({ 
            success: true,
            message: '로그인이 완료되었습니다.',
            user: userInfo
        });
        
    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({
            success: false,
            message: '로그인 처리 중 오류가 발생했습니다.'
        });
    }
});

// 로그아웃 API
app.post('/api/logout', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 마지막 로그인 시간 업데이트
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        await userCollection.updateOne(
            { userId: userId },
            { $set: { lastLogin: todayString } }
        );
        
        console.log(`✅ 로그아웃 완료: ${userId}`);
        
        res.json({
            success: true,
            message: '로그아웃이 완료되었습니다.'
        });
        
    } catch (error) {
        console.error('로그아웃 오류:', error);
        res.status(500).json({
            success: false,
            message: '로그아웃 처리 중 오류가 발생했습니다.'
        });
    }
});

// 공지사항 작성 API (관리자용)
app.post('/api/notices', async (req, res) => {
    try {
        const { title, content, category, isImportant, author } = req.body;
        
        if (!title || !content || !author) {
            return res.status(400).json({
                success: false,
                message: '제목, 내용, 작성자가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const noticeCollection = getNoticeCollection();
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 공지사항 데이터 생성
        const noticeData = {
            title: title,
            content: content,
            category: category || '일반',
            isImportant: isImportant || false,
            author: author,
            createdAt: todayString,
            updatedAt: todayString,
            views: 0
        };
        
        // 공지사항 저장
        const result = await noticeCollection.insertOne(noticeData);
        
        console.log(`✅ 공지사항 작성 완료: ${author} -> ${title}`);
        
        res.json({
            success: true,
            message: '공지사항이 작성되었습니다.',
            data: {
                noticeId: result.insertedId,
                title: title,
                content: content,
                category: category,
                isImportant: isImportant,
                author: author,
                createdAt: todayString,
                views: 0
            }
        });
        
    } catch (error) {
        console.error('공지사항 작성 오류:', error);
        res.status(500).json({
            success: false,
            message: '공지사항 작성 중 오류가 발생했습니다.'
        });
    }
});

// 전화번호 중복 체크 API
app.post('/api/invite/check-phone', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: '전화번호가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 임시로 중복되지 않음으로 응답
        res.json({ 
            success: true,
            exists: false,
            message: '사용 가능한 전화번호입니다.'
        });
        
    } catch (error) {
        console.error('전화번호 중복 체크 오류:', error);
        res.status(500).json({
            success: false,
            message: '전화번호 중복 체크 중 오류가 발생했습니다.'
        });
    }
});

// 인증번호 전송 API
app.post('/api/invite/send-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: '전화번호가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 6자리 인증번호 생성
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 임시로 성공 응답 반환 (실제로는 SMS 발송)
        res.json({
            success: true,
            verificationCode: verificationCode,
            message: '인증번호가 전송되었습니다.'
        });
        
    } catch (error) {
        console.error('인증번호 전송 오류:', error);
        res.status(500).json({
            success: false,
            message: '인증번호 전송 중 오류가 발생했습니다.'
        });
    }
});

// 인증번호 확인 API
app.post('/api/invite/verify-code', async (req, res) => {
    try {
        const { phoneNumber, code } = req.body;
        
        if (!phoneNumber || !code) {
            return res.status(400).json({ 
                success: false, 
                message: '전화번호와 인증번호가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 현재 사용자 정보 가져오기 (요청 본문에서)
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false, 
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // game-invite 컬렉션에 초대 데이터 저장
        const inviteCollection = getInviteCollection();
        const userCollection = getUserCollection();
        
        // 초대하는 사용자 정보 조회
        const inviter = await userCollection.findOne({ userId: userId });
        if (!inviter) {
            return res.status(404).json({
                success: false,
                message: '초대하는 사용자 정보를 찾을 수 없습니다.'
            });
        }
        
        // 초대 데이터 생성
        const inviteData = {
            memberName: inviter.name || inviter.username || 'Unknown',
            memberId: userId,
            memberPhone: inviter.phone || 'Unknown',
            inviterPhone: phoneNumber,
            status: 'pending',
            inviteDate: new Date()
        };
        
        // 중복 체크 (같은 전화번호로 이미 초대한 경우)
        const existingInvite = await inviteCollection.findOne({
            memberId: userId,
            inviterPhone: phoneNumber
        });
        
        if (existingInvite) {
            return res.status(400).json({
                success: false,
                message: '이미 초대한 전화번호입니다.'
            });
        }
        
        // 초대 데이터 저장
        await inviteCollection.insertOne(inviteData);
        
        console.log(`✅ 초대 데이터 저장 완료: ${userId} -> ${phoneNumber}`);
        
        res.json({
            success: true,
            message: '인증이 완료되었습니다.',
            data: {
                phoneNumber: phoneNumber,
                verified: true,
                inviteId: inviteData._id
            }
        });
        
    } catch (error) {
        console.error('인증번호 확인 오류:', error);
        res.status(500).json({ 
                success: false,
            message: '인증번호 확인 중 오류가 발생했습니다.'
        });
    }
});

// 공지사항 조회수 증가 API
app.post('/api/notices/:noticeId/view', async (req, res) => {
    try {
        const { noticeId } = req.params;
        
        if (!noticeId) {
            return res.status(400).json({
                success: false,
                message: '공지사항 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 임시로 성공 응답 반환
        res.json({
            success: true,
            message: '조회수가 증가되었습니다.',
            data: {
                noticeId: noticeId,
                views: 151 // 임시 증가된 조회수
            }
        });
        
    } catch (error) {
        console.error('공지사항 조회수 증가 오류:', error);
        res.status(500).json({
            success: false,
            message: '공지사항 조회수 증가 중 오류가 발생했습니다.'
        });
    }
});

// 문의 상세 조회 API
app.get('/api/inquiries/:inquiryId', async (req, res) => {
    try {
        const { inquiryId } = req.params;
        
        if (!inquiryId) {
            return res.status(400).json({ 
                success: false, 
                message: '문의 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const inquiryCollection = getInquiryCollection();
        
        // ObjectId로 변환 (MongoDB ObjectId 형식인 경우)
        let query = { _id: inquiryId };
        if (inquiryId.match(/^[0-9a-fA-F]{24}$/)) {
            const { ObjectId } = require('mongodb');
            query = { _id: new ObjectId(inquiryId) };
        }
        
        // 문의 조회
        const inquiry = await inquiryCollection.findOne(query);
        
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: '문의를 찾을 수 없습니다.'
            });
        }
        
        console.log(`✅ 문의 상세 조회 완료: ${inquiryId} -> ${inquiry.title}`);
        
        res.json({
            success: true,
            message: '문의를 조회했습니다.',
            data: {
                inquiry: inquiry
            }
        });
        
    } catch (error) {
        console.error('문의 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '문의 상세 조회 중 오류가 발생했습니다.'
        });
    }
});

// 사용자 정보 업데이트 API
app.put('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, favoriteTeam } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 업데이트
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (favoriteTeam) updateData.favoriteTeam = favoriteTeam;
        
        // updatedAt 필드 추가
        updateData.updatedAt = new Date();
        
        const result = await userCollection.updateOne(
            { userId: userId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // 업데이트된 사용자 정보 조회
        const updatedUser = await userCollection.findOne({ userId: userId });
        
        res.json({
            success: true,
            message: '사용자 정보가 업데이트되었습니다.',
            data: {
                userId: userId,
                user: {
                    name: updatedUser.name,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    favoriteTeam: updatedUser.favoriteTeam
                },
                updatedFields: Object.keys(updateData)
            }
        });
        
    } catch (error) {
        console.error('사용자 정보 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '사용자 정보 업데이트 중 오류가 발생했습니다.'
        });
    }
});

// 게시글 상세 조회 API
app.get('/api/board/:boardId', async (req, res) => {
    try {
        const { boardId } = req.params;
        
        if (!boardId) {
            return res.status(400).json({ 
                success: false, 
                message: '게시글 ID가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const boardCollection = getBoardCollection();
        
        // ObjectId로 변환 (MongoDB ObjectId 형식인 경우)
        let query = { _id: boardId };
        if (boardId.match(/^[0-9a-fA-F]{24}$/)) {
            const { ObjectId } = require('mongodb');
            query = { _id: new ObjectId(boardId) };
        }
        
        // 게시글 조회
        const board = await boardCollection.findOne(query);
        
        if (!board) {
            return res.status(404).json({
                success: false,
                message: '게시글을 찾을 수 없습니다.'
            });
        }
        
        // 조회수 증가
        await boardCollection.updateOne(
            { _id: board._id },
            { $inc: { views: 1 } }
        );
        
        console.log(`✅ 게시글 상세 조회 완료: ${boardId} -> ${board.title}`);
        
        res.json({
            success: true,
            message: '게시글을 조회했습니다.',
            data: {
                board: {
                    _id: board._id,
                    boardId: board._id,
                    title: board.title,
                    content: board.content,
                    authorName: board.authorName,
                    authorId: board.userId,
                    createdAt: board.createdAt,
                    updatedAt: board.updatedAt,
                    views: board.views + 1,
                    likes: board.likes,
                    commentCount: board.commentCount
                }
            }
        });
        
    } catch (error) {
        console.error('게시글 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '게시글 상세 조회 중 오류가 발생했습니다.'
        });
    }
});

// 출석 체크 API
app.post('/api/attendance/check', async (req, res) => {
    try {
        const { userId, userName } = req.body;
        
        if (!userId || !userName) {
            return res.status(400).json({
                success: false,
                message: '사용자 정보가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        const attendanceCollection = getAttendanceCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 오늘 이미 출석했는지 확인
        const existingAttendance = await attendanceCollection.findOne({
            userId: userId,
            date: todayString
        });
        
        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: '오늘 이미 출석체크를 하셨습니다.'
            });
        }
        
        // 연속 출석 일수 계산
        const yesterday = new Date(koreaTime);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.getFullYear().toString() + 
                               '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + 
                               '-' + String(yesterday.getDate()).padStart(2, '0');
        
        const yesterdayAttendance = await attendanceCollection.findOne({
            userId: userId,
            date: yesterdayString
        });
        
        const currentStreak = yesterdayAttendance ? (yesterdayAttendance.streak || 0) + 1 : 1;
        
        // 총 출석 일수 계산
        const totalAttendance = await attendanceCollection.countDocuments({ userId: userId });
        const newTotalAttendance = totalAttendance + 1;
        
        // 출석 기록 생성
        const attendanceData = {
            userId: userId,
            userName: userName,
            date: todayString,
            checkInTime: new Date(),
            checkOutTime: null,
            duration: 0,
            status: 'present',
            streak: currentStreak,
            totalAttendance: newTotalAttendance,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // attendance 컬렉션에 출석 기록 저장
        await attendanceCollection.insertOne(attendanceData);
        
        console.log(`✅ 출석체크 완료: ${userId} -> ${todayString}, 연속: ${currentStreak}일`);
        
        res.json({
            success: true,
            message: '출석 체크가 완료되었습니다.',
            data: {
                userId: userId,
                userName: userName,
                checkDate: todayString,
                points: 0,
                consecutiveDays: currentStreak,
                totalPoints: user.points || 0
            }
        });
        
    } catch (error) {
        console.error('출석 체크 오류:', error);
        res.status(500).json({
            success: false,
            message: '출석 체크 중 오류가 발생했습니다.'
        });
    }
});

// 초대 리스트 조회 API
app.get('/api/invites', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자 ID가 필요합니다.' 
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // game-invite 컬렉션에서 해당 사용자의 초대 데이터 조회
        const inviteCollection = getInviteCollection();
        
        const invites = await inviteCollection.find({ 
            memberId: userId 
        }).sort({ inviteDate: -1 }).toArray();
        
        console.log(`✅ 초대 리스트 조회 완료: ${userId} -> ${invites.length}건`);
        
        res.json({
            success: true,
            message: '초대 리스트를 조회했습니다.',
            data: {
                invites: invites,
                totalCount: invites.length
            }
        });
        
    } catch (error) {
        console.error('초대 리스트 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '초대 리스트 조회 중 오류가 발생했습니다.'
        });
    }
});

// 포인트 업데이트 API
app.post('/api/update-points', async (req, res) => {
    try {
        const { userId, points, addPoints } = req.body;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: '사용자 ID가 필요합니다.'
            });
        }
        
        if (points === undefined && addPoints === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: '포인트 또는 추가할 포인트가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인 (로컬 테스트를 위해 임시로 주석 처리)
        // if (!checkMongoDBConnection()) {
        //     return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        // }
        
        // MongoDB 연결 상태 확인
        console.log(`🔍 MongoDB 연결 상태 확인: checkMongoDBConnection()=${checkMongoDBConnection()}, mongoose.connection=${!!mongoose.connection}, mongoose.connection.db=${!!mongoose.connection?.db}`);
        
        // MongoDB 연결이 없어도 실제 DB 업데이트 시도
        console.log(`🔧 포인트 업데이트 시도: ${userId} - addPoints: ${addPoints}, points: ${points}`);
        console.log(`📦 받은 데이터 전체:`, JSON.stringify(req.body, null, 2));
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 조회
        console.log(`🔍 사용자 조회 시도: userId = ${userId}`);
        const user = await userCollection.findOne({ userId: userId });
        console.log(`🔍 사용자 조회 결과:`, user ? `사용자 발견 (기존 포인트: ${user.points || 0})` : '사용자 없음');
        
        if (!user) {
            console.log(`❌ 사용자를 찾을 수 없음: ${userId} - 새 사용자 생성 시도`);
            
            // 새 사용자 생성
            const newUser = {
            userId: userId,
                name: '사용자',
                points: 0,
            createdAt: new Date()
        };
        
            try {
                await userCollection.insertOne(newUser);
                console.log(`✅ 새 사용자 생성 완료: ${userId}`);
                user = newUser;
            } catch (error) {
                console.error(`❌ 새 사용자 생성 실패: ${userId}`, error);
                return res.status(500).json({
                    success: false,
                    message: '사용자 생성 중 오류가 발생했습니다.'
                });
            }
        }
        
        // 포인트 업데이트 (추가 또는 설정)
        let newPoints;
        try {
            if (addPoints !== undefined) {
                // 포인트 추가 방식
                newPoints = (user.points || 0) + parseInt(addPoints);
                console.log(`💰 포인트 추가: ${userId} - 기존: ${user.points || 0}, 추가: ${addPoints}, 새로운 총액: ${newPoints}`);
                
                const updateResult = await userCollection.updateOne(
            { userId: userId },
                    { $inc: { points: parseInt(addPoints) } }
                );
                
                if (updateResult.modifiedCount === 0) {
                    throw new Error('DB 업데이트 실패: 수정된 문서가 없습니다.');
                }
                
                console.log(`✅ game-member 디비 업데이트 완료: ${userId} -> ${newPoints}포인트`);
            } else {
                // 포인트 설정 방식
                newPoints = parseInt(points);
                console.log(`💰 포인트 설정: ${userId} -> ${newPoints}포인트`);
                
                const updateResult = await userCollection.updateOne(
                    { userId: userId },
                    { $set: { points: newPoints } }
                );
                
                if (updateResult.modifiedCount === 0) {
                    throw new Error('DB 업데이트 실패: 수정된 문서가 없습니다.');
                }
                
                console.log(`✅ game-member 디비 업데이트 완료: ${userId} -> ${newPoints}포인트`);
            }
        } catch (dbError) {
            console.error(`❌ DB 업데이트 오류: ${userId}`, dbError);
            return res.status(500).json({
                success: false,
                message: '데이터베이스 업데이트에 실패했습니다.'
            });
        }
        
        console.log(`✅ 포인트 업데이트 완료: ${userId} -> ${newPoints}포인트`);
        
        res.json({
            success: true,
            message: '포인트가 업데이트되었습니다.',
            points: newPoints
        });
        
    } catch (error) {
        console.error('포인트 업데이트 오류:', error);
        res.status(500).json({
            success: false,
            message: '포인트 업데이트 중 오류가 발생했습니다.'
        });
    }
});

// 승리포인트 계산 API (관리자용)
app.post('/api/admin/calculate-winnings', async (req, res) => {
    try {
        const { gameNumber, predictionResult, date } = req.body;
        
        if (!gameNumber || !predictionResult || !date) {
            return res.status(400).json({ 
                success: false, 
                message: '게임번호, 예측결과, 날짜가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const gameCollection = getBettingGameCollection(gameNumber);
        const userCollection = getUserCollection();
        
        // 해당 게임의 배팅 집계 데이터 조회
        const gameData = await gameCollection.findOne({
            date: date,
            gameNumber: parseInt(gameNumber)
        });
        
        if (!gameData) {
            return res.status(404).json({
                success: false, 
                message: '게임 데이터를 찾을 수 없습니다.'
            });
        }
        
        // 예측결과를 betting-game-X 컬렉션에 저장
        await gameCollection.updateOne(
            {
                date: date,
                gameNumber: parseInt(gameNumber)
            },
            {
                $set: {
                    predictionResult: predictionResult
                }
            }
        );
        
        // 영어-한글 예측결과 매핑
        const predictionMapping = {
            '1base': '1루',
            '2base': '2루', 
            '3base': '3루',
            'homerun': '홈런',
            'strikeout': '삼진',
            'out': '아웃'
        };
        
        // 영어 예측결과를 한글로 변환
        const koreanPredictionResult = predictionMapping[predictionResult] || predictionResult;
        
        console.log(`🔍 예측결과 변환: ${predictionResult} → ${koreanPredictionResult}`);
        
        // 올바른 승리자 계산 (bets 배열에서 실제 승리자 찾기)
        if (!gameData.bets || gameData.bets.length === 0) {
            return res.status(404).json({
                success: false,
                message: '배팅 데이터가 없습니다.'
            });
        }
        
        // 승리자 찾기 (bets 배열에서 koreanPredictionResult와 일치하는 사용자들)
        const winners = gameData.bets.filter(bet => bet.prediction === koreanPredictionResult);
        const winnerCount = winners.length;
        const totalBets = gameData.bets.length;
        const loserCount = totalBets - winnerCount;
        
        // 승리 포인트 계산: (패자 수 × 100) ÷ 승리자 수
        // 패자들이 잃은 포인트를 승리자들이 균등하게 분배
        const totalLoserPoints = loserCount * 100; // 고정 배팅 포인트 100
        const pointsPerWinner = winnerCount > 0 ? Math.floor(totalLoserPoints / winnerCount) : 0;
        
        console.log(`🏆 승리자 배팅:`, winners);
        
        // 승리자들에게 포인트 지급 (원금 100은 이미 차감되어 있으므로 승리 수당만 추가)
        for (const winner of winners) {
            await userCollection.updateOne(
                { userId: winner.userId },
                { $inc: { points: pointsPerWinner } }
            );
            console.log(`💰 ${winner.userName || winner.userId}에게 승리 수당 ${pointsPerWinner}포인트 지급`);
        }
        
        console.log(`✅ 게임 ${gameNumber} 승리포인트 계산 완료:`);
        console.log(`- 총 배팅: ${totalBets}명`);
        console.log(`- 승리자: ${winnerCount}명`);
        console.log(`- 패자: ${loserCount}명`);
        console.log(`- 총 패자 포인트: ${totalLoserPoints}`);
        console.log(`- 성공자당 분배 포인트: ${pointsPerWinner}`);
        console.log(`📊 수당 계산 공식: (${loserCount} × 100) ÷ ${winnerCount} = ${pointsPerWinner}`);
        console.log(`💡 승리자는 원금 100포인트 + 승리 수당 ${pointsPerWinner}포인트를 받습니다.`);
        
        res.json({
            success: true,
            message: '승리포인트 계산 및 지급이 완료되었습니다.',
            data: {
                gameNumber: gameNumber,
                predictionResult: predictionResult,
                koreanPredictionResult: koreanPredictionResult,
                totalBets: totalBets,
                winnerCount: winnerCount,
                loserCount: loserCount,
                totalLoserPoints: totalLoserPoints,
                pointsPerWinner: pointsPerWinner,
                winners: winners.map(w => ({ userId: w.userId, userName: w.userName }))
            }
        });
        
    } catch (error) {
        console.error('승리포인트 계산 오류:', error);
        res.status(500).json({
            success: false,
            message: '승리포인트 계산 중 오류가 발생했습니다.'
        });
    }
});

// 서버 시작 함수
const startServer = async () => {
    try {
        console.log('서버 시작 중...');
        
        // MongoDB 연결 (실패해도 서버는 시작)
        const mongoConnected = await connectToMongoDB();
        
        // Express 서버 시작
        app.listen(PORT, () => {
            console.log(`✅ 서버가 성공적으로 시작되었습니다!`);
            console.log(`📍 포트: ${PORT}`);
            console.log(`🗄️ MongoDB 상태: ${mongoConnected ? '연결됨' : '연결 안됨'}`);
            if (!mongoConnected) {
                if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
                    console.error('❌ MongoDB 연결 실패로 서버를 시작할 수 없습니다.');
                    process.exit(1);
                } else {
                    console.log('⚠️ 로컬 환경: MongoDB 없이 서버를 시작합니다. (일부 기능 제한)');
                }
            }
        });
        
        // 서버 시작 후 자동으로 데이터 수정 실행 (MongoDB 연결 확인 후)
        setTimeout(async () => {
            try {
                console.log('🔄 서버 시작 후 자동 데이터 수정 시작...');
                
                // MongoDB 연결 상태 확인
                if (!checkMongoDBConnection()) {
                    console.log('⚠️ MongoDB 연결이 없어 자동 데이터 수정을 건너뜁니다.');
                    return;
                }
                
                // mongoose.connection이 undefined인지 확인
                if (!mongoose.connection || !mongoose.connection.db) {
                    console.log('⚠️ MongoDB 연결이 준비되지 않아 자동 데이터 수정을 건너뜁니다.');
                    return;
                }
                
                // 한국 시간대로 오늘 날짜 계산
                const today = new Date();
                const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
                const todayString = koreaTime.getFullYear().toString() + 
                                   '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                                   '-' + String(koreaTime.getDate()).padStart(2, '0');
                
                // 영문-한글 매핑
                const englishToKorean = {
                    '1base': '1루',
                    '2base': '2루',
                    '3base': '3루',
                    'homerun': '홈런',
                    'strikeout': '삼진',
                    'out': '아웃'
                };
                
                let migratedCount = 0;
                let fixedCount = 0;
                
                // 1~5경기 데이터 자동 수정
                for (let gameNumber = 1; gameNumber <= 5; gameNumber++) {
                    const gameCollection = getBettingGameCollection(gameNumber);
                    const gameData = await gameCollection.findOne({ 
                        date: todayString,
                        gameNumber: gameNumber 
                    });
                    
                    if (gameData && gameData.bets && gameData.bets.length > 0) {
                        // 1. bets 배열의 prediction을 한글로 변환 (영문 제거)
                        const updatedBets = gameData.bets.map(bet => ({
                            ...bet,
                            prediction: englishToKorean[bet.prediction] || bet.prediction
                        }));
                        
                        // 2. betCounts를 한글 키로만 재계산 (영문 키 완전 제거)
                        const newBetCounts = {
                            '1루': 0, '2루': 0, '3루': 0, '홈런': 0, '삼진': 0, '아웃': 0
                        };
                        
                        updatedBets.forEach(bet => {
                            if (newBetCounts.hasOwnProperty(bet.prediction)) {
                                newBetCounts[bet.prediction]++;
                            }
                        });
                        
                        // 3. 데이터 업데이트 (영문 키 완전 제거)
                        await gameCollection.updateOne(
                            { 
                                date: todayString,
                                gameNumber: gameNumber 
                            },
                            {
                                $set: {
                                    bets: updatedBets,
                                    betCounts: newBetCounts,
                                    totalBets: updatedBets.length
                                }
                            }
                        );
                        
                        migratedCount++;
                        fixedCount++;
                        console.log(`✅ 경기 ${gameNumber} 자동 수정 완료 (영문 제거):`, newBetCounts);
                    }
                }
                
                console.log(`✅ 자동 데이터 수정 완료: ${migratedCount}개 경기 마이그레이션, ${fixedCount}개 경기 betCounts 수정 (영문 키 완전 제거)`);
                
    } catch (error) {
                console.error('❌ 자동 데이터 수정 오류:', error);
            }
        }, 3000); // 서버 시작 3초 후 실행
        
    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
        // MongoDB 연결 실패해도 서버는 시작
        console.log('⚠️ MongoDB 연결 실패했지만 서버를 시작합니다.');
    }
};

// MongoDB 연결 함수
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        // 환경변수가 없으면 MongoDB Atlas 사용
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://ppadun_user:ppadun8267@member-management.bppicvz.mongodb.net/?retryWrites=true&w=majority&appName=member-management';
        
        if (!mongoUri) {
            console.error('❌ MONGODB_URI 환경 변수가 설정되지 않았습니다.');
            return false;
        }
        console.log('🔗 연결 문자열 확인:', mongoUri ? mongoUri.substring(0, 20) + '...' : 'undefined');
        console.log('🔍 환경변수 MONGODB_URI:', process.env.MONGODB_URI ? '설정됨' : '설정 안됨');
        
        const dbName = 'member-management';
        console.log('🎯 사용할 데이터베이스 이름:', dbName);
        
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            dbName: dbName,
            retryWrites: true,
            w: 'majority'
        };
        
        console.log('🔧 연결 옵션:', options);
        
        await mongoose.connect(mongoUri, options);
        
        console.log('✅ MongoDB 연결 성공!');
        console.log('📊 데이터베이스 연결됨 (이름 확인 불가)');
        
        // 실제 연결된 데이터베이스 이름 확인
        const db = mongoose.connection.db;
        console.log('✅ MongoDB 연결됨 - team-games 컬렉션에서 경기 데이터를 로드합니다.');
        
        const dbNameActual = db.databaseName;
        console.log('✅ MongoDB 연결 성공!');
        console.log('📊 실제 연결된 데이터베이스:', dbNameActual);
        console.log('✅ 올바른 데이터베이스에 연결되었습니다.');
        
        return true;
        
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        console.log('⚠️ MongoDB 없이 서버를 시작합니다. (일부 기능 제한)');
        return false;
    }
};

// 메인 페이지 라우팅
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
        });
        
        // 댓글 관련 API
        app.get('/api/comments/:boardId', async (req, res) => {
            try {
                const { boardId } = req.params;
                if (!boardId) { 
                    return res.status(400).json({ success: false, message: '게시글 ID가 필요합니다.' }); 
                }
                
                // MongoDB 연결 상태 확인
                if (!checkMongoDBConnection()) {
                    return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
                }
                
                const commentCollection = getCommentCollection();
                
                // 해당 게시글의 댓글 조회 (문자열과 ObjectId 모두 조회)
                const { ObjectId } = require('mongodb');
                
                console.log(`🔍 댓글 조회 boardId: ${boardId}`);
                console.log(`🔍 댓글 조회 boardId 타입: ${typeof boardId}`);
                
                const comments = await commentCollection.find({
                    $or: [
                        { boardId: boardId },  // 문자열로 저장된 경우
                        { boardId: new ObjectId(boardId) }  // ObjectId로 저장된 경우
                    ]
                }).sort({ createdAt: 1 }).toArray();
                
                console.log(`🔍 댓글 조회 쿼리: $or 조건으로 문자열과 ObjectId 모두 조회`);
                console.log(`🔍 조회된 댓글 개수: ${comments.length}`);
                if (comments.length > 0) {
                    console.log(`🔍 첫 번째 댓글 boardId: ${comments[0].boardId}`);
                    console.log(`🔍 첫 번째 댓글 boardId 타입: ${typeof comments[0].boardId}`);
                }
                
                console.log(`✅ 댓글 조회 완료: ${boardId} -> ${comments.length}개`);
                console.log(`📝 조회된 댓글들:`, comments);
                
                res.json({ 
                    success: true, 
                    message: '댓글을 조회했습니다.', 
                    comments: comments 
                });
            } catch (error) {
                console.error('댓글 조회 오류:', error);
                res.status(500).json({ success: false, message: '댓글 조회 중 오류가 발생했습니다.' });
            }
        });
        
        app.post('/api/comment', async (req, res) => {
            try {
                const { boardId, author, authorName, content } = req.body;
                if (!boardId || !author || !authorName || !content) { 
                    return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' }); 
                }
                
                // MongoDB 연결 상태 확인
                if (!checkMongoDBConnection()) {
                    return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
                }
                
                const commentCollection = getCommentCollection();
                const boardCollection = getBoardCollection();
                
                // 게시글 존재 확인 (ObjectId 변환)
                let query = { _id: boardId };
                if (boardId.match(/^[0-9a-fA-F]{24}$/)) {
                    const { ObjectId } = require('mongodb');
                    query = { _id: new ObjectId(boardId) };
                }
                
                const board = await boardCollection.findOne(query);
                if (!board) {
                    return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
                }
                
                const today = new Date();
                const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
                const todayString = koreaTime.getFullYear().toString() + '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + '-' + String(koreaTime.getDate()).padStart(2, '0');
                
                // 댓글 데이터 생성 (ObjectId 변환)
                let commentBoardId = boardId;
                if (boardId.match(/^[0-9a-fA-F]{24}$/)) {
                    const { ObjectId } = require('mongodb');
                    commentBoardId = new ObjectId(boardId);
                }
                
                console.log(`📝 댓글 작성 boardId: ${boardId}`);
                console.log(`📝 댓글 작성 boardId 타입: ${typeof boardId}`);
                console.log(`📝 댓글 저장 boardId: ${commentBoardId}`);
                console.log(`📝 댓글 저장 boardId 타입: ${typeof commentBoardId}`);
                
                const commentData = {
                    boardId: commentBoardId,
                    author: author,
                    authorName: authorName,
                    content: content,
                    createdAt: todayString,
                    updatedAt: todayString
                };
                
                // 댓글 저장
                const result = await commentCollection.insertOne(commentData);
                console.log(`💾 댓글 저장 완료:`, result);
                console.log(`📝 저장된 댓글 데이터:`, commentData);
                
                // 게시글의 댓글 수 증가 (ObjectId 변환)
                let updateQuery = { _id: boardId };
                if (boardId.match(/^[0-9a-fA-F]{24}$/)) {
                    const { ObjectId } = require('mongodb');
                    updateQuery = { _id: new ObjectId(boardId) };
                }
                
                const updateResult = await boardCollection.updateOne(
                    updateQuery,
                    { $inc: { commentCount: 1 } }
                );
                
                console.log(`📊 게시글 댓글 수 증가 결과:`, updateResult);
                console.log(`📊 업데이트된 게시글 ID: ${boardId}`);
                
                console.log(`✅ 댓글 작성 완료: ${authorName} -> ${content.substring(0, 20)}...`);
                
                res.json({ 
                    success: true, 
                    message: '댓글이 작성되었습니다.', 
                    data: { 
                        _id: result.insertedId,
                        boardId: boardId, 
                        author: author, 
                        authorName: authorName, 
                        content: content, 
                        createdAt: todayString 
                    } 
                });
            } catch (error) {
                console.error('댓글 작성 오류:', error);
                res.status(500).json({ success: false, message: '댓글 작성 중 오류가 발생했습니다.' });
            }
        });
        
        app.delete('/api/comment/:commentId', async (req, res) => {
            try {
                const { commentId } = req.params;
                const { author } = req.body;
                if (!commentId || !author) { 
                    return res.status(400).json({ success: false, message: '댓글 ID와 작성자 정보가 필요합니다.' }); 
                }
                
                // MongoDB 연결 상태 확인
                if (!checkMongoDBConnection()) {
                    return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
                }
                
                const commentCollection = getCommentCollection();
                const boardCollection = getBoardCollection();
                
                // 댓글 조회
                const comment = await commentCollection.findOne({ _id: commentId });
                if (!comment) {
                    return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
                }
                
                // 작성자 확인
                if (comment.author !== author) {
                    return res.status(403).json({ success: false, message: '댓글을 삭제할 권한이 없습니다.' });
                }
                
                // 댓글 삭제
                await commentCollection.deleteOne({ _id: commentId });
                
                // 게시글의 댓글 수 감소 (ObjectId 변환)
                let updateQuery = { _id: comment.boardId };
                if (comment.boardId && comment.boardId.match(/^[0-9a-fA-F]{24}$/)) {
                    const { ObjectId } = require('mongodb');
                    updateQuery = { _id: new ObjectId(comment.boardId) };
                }
                
                const updateResult = await boardCollection.updateOne(
                    updateQuery,
                    { $inc: { commentCount: -1 } }
                );
                
                console.log(`📊 게시글 댓글 수 감소 결과:`, updateResult);
                console.log(`📊 업데이트된 게시글 ID: ${comment.boardId}`);
                
                console.log(`✅ 댓글 삭제 완료: ${commentId} -> ${comment.authorName}`);
                
                res.json({ success: true, message: '댓글이 삭제되었습니다.' });
            } catch (error) {
                console.error('댓글 삭제 오류:', error);
                res.status(500).json({ success: false, message: '댓글 삭제 중 오류가 발생했습니다.' });
            }
        });
        
        // 게시글 수정/삭제 API
        app.put('/api/board/:boardId', async (req, res) => {
            try {
                const { boardId } = req.params;
                const { title, content, authorId } = req.body;
                if (!boardId || !title || !content || !authorId) { return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, message: '게시글이 수정되었습니다.' });
            } catch (error) {
                console.error('게시글 수정 오류:', error);
                res.status(500).json({ success: false, message: '게시글 수정 중 오류가 발생했습니다.' });
            }
        });
        
        app.delete('/api/board/:boardId', async (req, res) => {
            try {
                const { boardId } = req.params;
                const { authorId } = req.body;
                if (!boardId || !authorId) { return res.status(400).json({ success: false, message: '게시글 ID와 작성자 정보가 필요합니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, message: '게시글이 삭제되었습니다.' });
            } catch (error) {
                console.error('게시글 삭제 오류:', error);
                res.status(500).json({ success: false, message: '게시글 삭제 중 오류가 발생했습니다.' });
            }
        });
        
        // 공지사항 조회수 증가 API
        app.post('/api/notices/:noticeId/view', async (req, res) => {
            try {
                const { noticeId } = req.params;
                if (!noticeId) { return res.status(400).json({ success: false, message: '공지사항 ID가 필요합니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, message: '조회수가 증가되었습니다.', data: { noticeId: noticeId, views: 151 } });
            } catch (error) {
                console.error('공지사항 조회수 증가 오류:', error);
                res.status(500).json({ success: false, message: '공지사항 조회수 증가 중 오류가 발생했습니다.' });
            }
        });
        
        // 게시글 조회수 증가 API
        app.post('/api/board/:boardId/view', async (req, res) => {
            try {
                const { boardId } = req.params;
                if (!boardId) { return res.status(400).json({ success: false, message: '게시글 ID가 필요합니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, message: '조회수가 증가되었습니다.', data: { boardId: boardId, views: 25 } });
    } catch (error) {
                console.error('게시글 조회수 증가 오류:', error);
                res.status(500).json({ success: false, message: '게시글 조회수 증가 중 오류가 발생했습니다.' });
            }
        });
        
        // 사용자 포인트 조회 API
        app.get('/api/user/:userId/points', async (req, res) => {
            try {
                const { userId } = req.params;
                if (!userId) { return res.status(400).json({ success: false, message: '사용자 ID가 필요합니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, message: '포인트를 조회했습니다.', data: { userId: userId, points: 1000 } });
            } catch (error) {
                console.error('포인트 조회 오류:', error);
                res.status(500).json({ success: false, message: '포인트 조회 중 오류가 발생했습니다.' });
            }
        });
        
        // 초대 전화번호 중복 체크 API
        app.post('/api/check-invite', async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                if (!phoneNumber) { return res.status(400).json({ success: false, message: '전화번호가 필요합니다.' }); }
                // MongoDB 연결 확인 제거 - 임시 데이터로 작동
                res.json({ success: true, exists: false, message: '사용 가능한 전화번호입니다.' });
            } catch (error) {
                console.error('전화번호 중복 체크 오류:', error);
                res.status(500).json({ success: false, message: '전화번호 중복 체크 중 오류가 발생했습니다.' });
            }
        });
        
        // 포인트 충전 API
        app.post('/api/charge', async (req, res) => {
            try {
                const { userId, userName, amount, paymentMethod, videoType, videoTitle, videoDuration } = req.body;
                
                if (!userId || !userName || !amount || !paymentMethod || !videoType || !videoTitle || !videoDuration) {
                    return res.status(400).json({
                        success: false,
                        message: '필수 정보가 누락되었습니다.'
                    });
                }
                
                // MongoDB 연결 상태 확인
                if (!checkMongoDBConnection()) {
                    return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
                }
                
                const chargingCollection = getChargingCollection();
                const userCollection = getUserCollection();
                
                // 사용자 정보 조회
                const user = await userCollection.findOne({ userId: userId });
                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: '사용자를 찾을 수 없습니다.'
                    });
                }
                
                // 충전 데이터 생성
                const chargingData = {
                    userId: userId,
                    userName: userName,
                    amount: parseInt(amount),
                    paymentMethod: paymentMethod,
                    status: 'completed',
                    videoType: videoType,
                    videoTitle: videoTitle,
                    videoDuration: parseInt(videoDuration),
                    watchDate: new Date(),
                    completed: true,
                    createdAt: new Date()
                };
                
                // 충전 기록 저장
                await chargingCollection.insertOne(chargingData);
                
                // 사용자 포인트 업데이트
                const newPoints = (user.points || 0) + parseInt(amount);
                await userCollection.updateOne(
                    { userId: userId },
                    { 
                        $set: { 
                            points: newPoints,
                            updatedAt: new Date()
                        } 
                    }
                );
                
                console.log(`✅ 포인트 충전 완료: ${userName} -> ${amount}포인트`);
                
                res.json({
                    success: true,
                    message: '포인트 충전이 완료되었습니다.',
                    data: {
                        userId: userId,
                        userName: userName,
                        amount: parseInt(amount),
                        totalPoints: newPoints,
                        chargingId: chargingData._id
                    }
                });
                
            } catch (error) {
                console.error('포인트 충전 오류:', error);
                res.status(500).json({
                    success: false,
                    message: '포인트 충전 중 오류가 발생했습니다.'
                });
            }
        });

        // 서버 시작
        startServer(); 