const express = require('express');
const app = express();
const port = 3002;

// 미들웨어
app.use(express.json());
app.use(express.static('.'));

// 간단한 테스트 API
app.get('/api/simple-test', (req, res) => {
    res.json({
        success: true,
        message: '간단한 서버가 정상 작동 중입니다',
        timestamp: new Date().toISOString()
    });
});

// team-games API (간단한 버전)
app.get('/api/team-games', (req, res) => {
    res.json({
        success: true,
        games: [
            {
                gameNumber: 1,
                matchup: '두산 vs LG',
                startTime: '01:00',
                progressStatus: '경기중',
                bettingStart: '시작'
            },
            {
                gameNumber: 2,
                matchup: 'SSG vs 키움',
                startTime: '01:00',
                progressStatus: '경기전',
                bettingStart: '대기'
            }
        ]
    });
});

app.listen(port, () => {
    console.log(`✅ 간단한 서버가 포트 ${port}에서 시작되었습니다!`);
}); 