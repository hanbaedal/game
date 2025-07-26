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
            await gameCollection.insertOne({
                date: date,
                gameNumber: parseInt(gameNumber),
                matchup: matchup,
                status: 'active',
                bettingStart: '시작',
                bettingStop: '진행',
                totalBets: 1,
                betCounts: {
                    '1루': prediction === '1루' ? 1 : 0,
                    '2루': prediction === '2루' ? 1 : 0,
                    '3루': prediction === '3루' ? 1 : 0,
                    '홈런': prediction === '홈런' ? 1 : 0,
                    '삼진': prediction === '삼진' ? 1 : 0,
                    '아웃': prediction === '아웃' ? 1 : 0
                },
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
            await gameCollection.updateOne(
                { 
                    date: date,
                    gameNumber: parseInt(gameNumber)
                },
                {
                    $inc: {
                        totalBets: 1,
                        [`betCounts.${prediction}`]: 1
                    },
                    $push: {
                        bets: {
                            userId: userId,
                            userName: user.name || user.username,
                            prediction: prediction,
                            points: parseInt(points),
                            betTime: new Date()
                        }
                    }
                }
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
                        }
                    }
                },
                { upsert: true }
            );
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

// 승리포인트 계산 API (수정된 구조)
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
        
        // MongoDB 연결
        await connectToMongoDB();
        
        // Express 서버 시작
        app.listen(PORT, () => {
            console.log(`✅ 서버가 성공적으로 시작되었습니다!`);
            console.log(`📍 포트: ${PORT}`);
            console.log(`🗄️ MongoDB 상태: 연결됨`);
        });
        
    } catch (error) {
        console.error('❌ 서버 시작 실패:', error);
        process.exit(1);
    }
};

// MongoDB 연결 함수
const connectToMongoDB = async () => {
    try {
        console.log('MongoDB 연결 시도 중...');
        
        const mongoUri = process.env.MONGODB_URI;
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
        
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        throw error;
    }
};

// 메인 페이지 라우팅
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
startServer(); 