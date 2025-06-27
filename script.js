// 배팅 처리 함수
async function handleBet(bettingType) {
    try {
        const response = await fetch('/api/bet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.userId,
                bettingPoints: parseInt(document.getElementById('bettingPoints').value),
                matchId: 'game1',
                gameType: 'batter',
                bettingType: bettingType
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // 포인트 업데이트
            currentUser.points = data.currentPoints;
            updatePointsDisplay();
            
            // 배팅 결과 표시
            const resultMessage = document.getElementById('resultMessage');
            resultMessage.textContent = data.message;
            resultMessage.className = data.status === 'WIN' ? 'success' : 'error';
            
            // 배팅 버튼 상태 업데이트
            updateBettingButtons(data.status === 'WIN');
            
            // 배팅 결과 상세 정보 표시
            const resultDetails = document.getElementById('resultDetails');
            resultDetails.innerHTML = `
                <p>배팅 유형: ${data.bettingType}</p>
                <p>배당률: ${data.odds}배</p>
                <p>성공 확률: ${data.successRate}%</p>
                <p>랜덤값: ${data.randomValue.toFixed(2)}</p>
                <p>승리 포인트: ${data.winPoints}</p>
                <p>기부 포인트: ${data.donatedPoints}</p>
            `;
            resultDetails.style.display = 'block';
            
            // 배팅 기록 업데이트
            updateBettingHistory();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('배팅 처리 오류:', error);
        alert('배팅 처리 중 오류가 발생했습니다.');
    }
}

// 배팅 버튼 상태 업데이트 함수
function updateBettingButtons(isWin) {
    const buttons = document.querySelectorAll('.betting-button');
    buttons.forEach(button => {
        if (isWin) {
            button.classList.add('disabled');
            button.disabled = true;
        } else {
            button.classList.remove('disabled');
            button.disabled = false;
        }
    });
}

// 기부하기 버튼 클릭 이벤트
document.getElementById('donateButton').addEventListener('click', async () => {
    try {
        const donationPoints = parseInt(document.getElementById('donationPoints').value);
        if (!donationPoints || donationPoints <= 0) {
            alert('올바른 기부 금액을 입력해주세요.');
            return;
        }

        const response = await fetch('/api/donate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.userId,
                points: donationPoints
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // 포인트 업데이트
            currentUser.points = data.currentPoints;
            updatePointsDisplay();
            
            // 기부 결과 표시
            const resultMessage = document.getElementById('resultMessage');
            resultMessage.textContent = data.message;
            resultMessage.className = 'success';
            
            // 기부 기록 업데이트
            updateDonationHistory();
            
            // 기부 금액 입력 필드 초기화
            document.getElementById('donationPoints').value = '';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('기부 처리 오류:', error);
        alert('기부 처리 중 오류가 발생했습니다.');
    }
});

// 전역 변수
let currentUser = null;

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', () => {
    // 로그인 폼 제출 이벤트
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userId = document.getElementById('userId').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId, password })
                });

                const data = await response.json();
                
                if (data.success) {
                    // 로그인 성공
                    currentUser = data.user;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    window.location.href = '/index.html';
                } else {
                    alert(data.message || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('로그인 오류:', error);
                alert('로그인 처리 중 오류가 발생했습니다.');
            }
        });
    }

    // 게스트 로그인 버튼 이벤트
    const guestLoginButton = document.getElementById('guestLogin');
    if (guestLoginButton) {
        guestLoginButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/guest-login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (data.success) {
                    // 게스트 로그인 성공
                    currentUser = data.user;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    window.location.href = '/index.html';
                } else {
                    alert(data.message || '게스트 로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('게스트 로그인 오류:', error);
                alert('게스트 로그인 처리 중 오류가 발생했습니다.');
            }
        });
    }
}); 