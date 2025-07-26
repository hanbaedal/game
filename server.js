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
    return mongoose.connection.readyState === 1;
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
        const { userId, gameNumber, prediction, points } = req.body;
        
        if (!userId || !gameNumber || !prediction || !points) {
            return res.status(400).json({
                success: false,
                message: '필수 정보가 누락되었습니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        const gameCollection = getBettingGameCollection(gameNumber);
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
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
        
        // 모든 게임에서 오늘 배팅했는지 확인
        for (let i = 1; i <= 5; i++) {
            const checkCollection = getBettingGameCollection(i);
            const existingBet = await checkCollection.findOne({
                date: checkTodayString,
                'bets.userId': userId
            });
            
            if (existingBet) {
                return res.status(400).json({
                    success: false,
                    message: '오늘 이미 배팅하셨습니다. 다음 타자까지 기다려주세요.'
                });
            }
        }
        
        // 한국 시간대로 오늘 날짜 계산
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const date = koreaTime.getFullYear().toString() + 
                    '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                    '-' + String(koreaTime.getDate()).padStart(2, '0');
        
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
                bettingStart: '시작',
                bettingStop: '진행',
                totalBets: 1,
                betCounts: initialBetCounts,
                bets: [{
                    userId: userId,
                    userName: user.name || user.username,
                    prediction: prediction,
                    points: parseInt(points),
                    betTime: new Date()
                }]
            });
        } else {
            // 기존 데이터가 있으면 집계 업데이트 및 bets 배열에 추가
            // betCounts가 없거나 한글 키가 없으면 초기화
            const updateData = {
                $inc: { totalBets: 1 },
                $push: {
                    bets: {
                        userId: userId,
                        userName: user.name || user.username,
                        prediction: prediction,
                        points: parseInt(points),
                        betTime: new Date()
                    }
                }
            };
            
            // betCounts 업데이트 (한글 키 사용)
            updateData.$inc[`betCounts.${prediction}`] = 1;
            
            await gameCollection.updateOne(
                { 
                    date: date,
                    gameNumber: parseInt(gameNumber)
                },
                updateData
            );
        }
        
        // 사용자 포인트 차감
        await userCollection.updateOne(
            { userId: userId },
            { $inc: { points: -parseInt(points) } }
        );
        
        console.log(`게임 배팅 제출: ${userId} - ${prediction} ${points}포인트`);
        
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
        
        // 임시로 빈 출석 데이터 반환
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        res.json({
            success: true,
            message: '출석 현황을 조회했습니다.',
            data: {
                userId: userId,
                today: todayString,
                attendanceCount: 0,
                consecutiveDays: 0,
                totalDays: 0,
                attendanceHistory: [],
                rewards: []
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
        
        // 임시로 빈 게시글 목록 반환
        const totalCount = 0;
        const totalPages = Math.ceil(totalCount / limit);
        
        res.json({
            success: true,
            message: '게시글 목록을 조회했습니다.',
            data: {
                boards: [],
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
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 임시로 성공 응답 반환
        res.json({
            success: true,
            message: '게시글이 작성되었습니다.',
            data: {
                boardId: 'temp_' + Date.now(),
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
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // 민감한 정보 제외하고 응답
        res.json({
            success: true,
            message: '사용자 정보를 조회했습니다.',
            data: {
                userId: user.userId,
                name: user.name || user.username,
                email: user.email,
                points: user.points || 0,
                joinDate: user.createdAt || user.joinDate,
                lastLogin: user.lastLogin,
                totalBets: user.totalBets || 0,
                winCount: user.winCount || 0,
                loseCount: user.loseCount || 0,
                donationAmount: user.donationAmount || 0
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
        
        // 임시로 빈 문의 목록 반환
        res.json({
            success: true,
            message: '문의 목록을 조회했습니다.',
            data: {
                inquiries: [],
                totalCount: 0
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
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 임시로 성공 응답 반환
        res.json({
            success: true,
            message: '문의가 등록되었습니다.',
            data: {
                inquiryId: 'temp_' + Date.now(),
                userId: userId,
                userName: userName,
                title: title,
                content: content,
                category: category,
                status: '대기중',
                createdAt: todayString,
                adminResponse: null
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

// 공지사항 목록 조회 API
app.get('/api/notices', async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 임시로 샘플 공지사항 반환
        const sampleNotices = [
            {
                noticeId: 'notice_1',
                title: '게임 이용 안내',
                content: '배팅 게임 이용 방법을 안내드립니다.',
                category: '안내',
                isImportant: true,
                createdAt: '2025-01-01',
                views: 150
            },
            {
                noticeId: 'notice_2',
                title: '포인트 충전 방법',
                content: '광고 시청을 통해 포인트를 충전할 수 있습니다.',
                category: '안내',
                isImportant: false,
                createdAt: '2025-01-02',
                views: 89
            },
            {
                noticeId: 'notice_3',
                title: '시스템 점검 안내',
                content: '정기 시스템 점검이 예정되어 있습니다.',
                category: '점검',
                isImportant: true,
                createdAt: '2025-01-03',
                views: 234
            }
        ];
        
        const totalCount = sampleNotices.length;
        const totalPages = Math.ceil(totalCount / limit);
        
        res.json({
            success: true,
            message: '공지사항 목록을 조회했습니다.',
            data: {
                notices: sampleNotices,
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
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        // 임시로 샘플 공지사항 데이터 반환
        const sampleNotice = {
            noticeId: noticeId,
            title: '샘플 공지사항',
            content: '이것은 샘플 공지사항의 내용입니다. 실제 공지사항 내용이 여기에 표시됩니다.',
            category: '안내',
            isImportant: true,
            createdAt: '2025-01-01',
            views: 150,
            author: '관리자',
            attachments: []
        };
        
        res.json({
            success: true,
            message: '공지사항을 조회했습니다.',
            data: sampleNotice
        });
        
    } catch (error) {
        console.error('공지사항 상세 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '공지사항 상세 조회 중 오류가 발생했습니다.'
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
        
        // 임시로 성공 응답 반환 (실제로는 저장된 인증번호와 비교)
        res.json({
            success: true,
            message: '인증이 완료되었습니다.',
            data: {
                phoneNumber: phoneNumber,
                verified: true
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
        
        // 임시로 빈 문의 데이터 반환
        res.json({
            success: true,
            message: '문의를 조회했습니다.',
            data: {
                inquiryId: inquiryId,
                title: '임시 문의',
                content: '문의 내용이 여기에 표시됩니다.',
                category: '일반',
                status: '대기중',
                createdAt: '2025-01-01',
                adminResponse: null
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
        const { name, email } = req.body;
        
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
        
        res.json({
            success: true,
            message: '사용자 정보가 업데이트되었습니다.',
            data: {
                userId: userId,
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
        
        // 임시로 빈 게시글 데이터 반환
        res.json({
            success: true,
            message: '게시글을 조회했습니다.',
            data: {
                boardId: boardId,
                title: '임시 게시글',
                content: '게시글 내용이 여기에 표시됩니다.',
                author: '작성자',
                createdAt: '2025-01-01',
                views: 0,
                likes: 0,
                comments: []
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
        
        const today = new Date();
        const koreaTime = new Date(today.getTime() + (9 * 60 * 60 * 1000));
        const todayString = koreaTime.getFullYear().toString() + 
                           '-' + String(koreaTime.getMonth() + 1).padStart(2, '0') + 
                           '-' + String(koreaTime.getDate()).padStart(2, '0');
        
        // 임시로 성공 응답 반환
        res.json({
            success: true,
            message: '출석 체크가 완료되었습니다.',
            data: {
                userId: userId,
                userName: userName,
                checkDate: todayString,
                points: 100,
                consecutiveDays: 1
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
        
        // 임시로 빈 배열 반환 (초대 기능은 나중에 구현)
        res.json({
            success: true,
            message: '초대 리스트를 조회했습니다.',
            data: {
                invites: [],
                totalCount: 0
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
        const { userId, points } = req.body;
        
        if (!userId || points === undefined) {
            return res.status(400).json({
                success: false,
                message: '사용자 ID와 포인트가 필요합니다.'
            });
        }
        
        // MongoDB 연결 상태 확인
        if (!checkMongoDBConnection()) {
            return sendMongoDBErrorResponse(res, '데이터베이스 연결이 준비되지 않았습니다.');
        }
        
        const userCollection = getUserCollection();
        
        // 사용자 정보 조회
        const user = await userCollection.findOne({ userId: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        // 포인트 업데이트
        await userCollection.updateOne(
            { userId: userId },
            { $set: { points: parseInt(points) } }
        );
        
        console.log(`✅ 포인트 업데이트 완료: ${userId} -> ${points}포인트`);
        
        res.json({
            success: true,
            message: '포인트가 업데이트되었습니다.',
            points: parseInt(points)
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
        
        // 승리자 수와 패자 포인트 계산
        const totalBets = gameData.totalBets || 0;
        const betCounts = gameData.betCounts || {};
        const winnerCount = betCounts[predictionResult] || 0;
        const loserCount = totalBets - winnerCount;
        const totalLoserPoints = loserCount * 100; // 고정 배팅 포인트 100
        
        // 성공자당 분배 포인트 계산
        const pointsPerWinner = winnerCount > 0 ? Math.floor(totalLoserPoints / winnerCount) : 0;
        
        // 승리자들에게 포인트 지급 (bets 배열에서 승리자 찾기)
        if (winnerCount > 0 && gameData.bets) {
            const winningBets = gameData.bets.filter(bet => bet.prediction === predictionResult);
            
            // 승리자들에게 포인트 지급
            for (const bet of winningBets) {
                await userCollection.updateOne(
                    { userId: bet.userId },
                    { $inc: { points: pointsPerWinner } }
                );
            }
        }
        
        console.log(`✅ 게임 ${gameNumber} 승리포인트 계산 완료:`);
        console.log(`- 총 배팅: ${totalBets}명`);
        console.log(`- 승리자: ${winnerCount}명`);
        console.log(`- 패자: ${loserCount}명`);
        console.log(`- 총 패자 포인트: ${totalLoserPoints}`);
        console.log(`- 성공자당 분배 포인트: ${pointsPerWinner}`);
        
        res.json({
            success: true,
            message: '승리포인트 계산 및 지급이 완료되었습니다.',
            data: {
                gameNumber: gameNumber,
                predictionResult: predictionResult,
                totalBets: totalBets,
                winnerCount: winnerCount,
                loserCount: loserCount,
                totalLoserPoints: totalLoserPoints,
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
                console.log('⚠️ MongoDB 연결 없이 서버가 실행 중입니다. (일부 기능 제한)');
            }
        });
        
        // 서버 시작 후 자동으로 데이터 수정 실행
        setTimeout(async () => {
            try {
                console.log('🔄 서버 시작 후 자동 데이터 수정 시작...');
                
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
        process.exit(1);
    }
};

// MongoDB 연결 함수
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/member-management';
        console.log('🔗 연결 문자열 확인:', mongoUri ? mongoUri.substring(0, 20) + '...' : 'undefined');
        
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

// 서버 시작
startServer(); 