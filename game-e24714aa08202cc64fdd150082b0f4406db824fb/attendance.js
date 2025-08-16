// 2024년 공휴일 데이터
const HOLIDAYS = {
    '2024-01-01': '신정',
    '2024-02-09': '설날',
    '2024-02-10': '설날',
    '2024-02-11': '설날',
    '2024-02-12': '대체공휴일',
    '2024-03-01': '삼일절',
    '2024-04-10': '21대 총선',
    '2024-05-05': '어린이날',
    '2024-05-06': '대체공휴일',
    '2024-05-15': '부처님오신날',
    '2024-06-06': '현충일',
    '2024-08-15': '광복절',
    '2024-09-16': '추석',
    '2024-09-17': '추석',
    '2024-09-18': '추석',
    '2024-10-03': '개천절',
    '2024-10-09': '한글날',
    '2024-12-25': '크리스마스'
};

// 날짜 포맷 함수
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 캘린더 초기화 함수
function initializeCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // 오늘 날짜 표시 (년/월만 표시)
    const formattedDate = `${year}년 ${month + 1}월`;
    document.getElementById('currentDate').textContent = formattedDate;
    
    createCalendar(year, month);
}

// 캘린더 생성 함수
function createCalendar(year, month) {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = ''; // 캘린더 초기화

    // 요일 헤더 추가
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'text-center font-bold p-1';
        dayHeader.textContent = day;
        if (day === '일') dayHeader.classList.add('text-red-500');
        if (day === '토') dayHeader.classList.add('text-blue-500');
        calendar.appendChild(dayHeader);
    });

    // 해당 월의 첫 날과 마지막 날 구하기
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 첫 날의 요일만큼 빈 칸 추가
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'p-1';
        calendar.appendChild(emptyDay);
    }

    // 날짜 추가
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'text-center p-1 relative';
        
        const currentDate = new Date(year, month, date);
        const isToday = isSameDate(currentDate, new Date());
        const dayOfWeek = currentDate.getDay();
        const formattedDate = formatDate(currentDate);
        const isHoliday = HOLIDAYS[formattedDate];
        
        // 날짜 컨테이너
        const dateContainer = document.createElement('div');
        dateContainer.className = `w-10 h-10 mx-auto flex items-center justify-center rounded-full
            ${isToday ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`;
        
        // 일요일, 공휴일은 빨간색, 토요일은 파란색
        if (dayOfWeek === 0 || isHoliday) {
            dateContainer.classList.add('text-red-500');
        } else if (dayOfWeek === 6) {
            dateContainer.classList.add('text-blue-500');
        }
        
        dateContainer.textContent = date;
        
        // 공휴일 표시
        if (isHoliday) {
            const holidayMark = document.createElement('div');
            holidayMark.className = 'absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-red-500';
            holidayMark.textContent = '●';
            dayElement.appendChild(holidayMark);
            
            // 공휴일 이름 툴팁
            dateContainer.title = HOLIDAYS[formattedDate];
        }
        
        // 출석 체크 표시
        const attendanceKey = `attendance_${formattedDate}`;
        if (localStorage.getItem(attendanceKey) === 'true') {
            const checkMark = document.createElement('div');
            checkMark.className = 'absolute bottom-0 left-1/2 transform -translate-x-1/2';
            checkMark.innerHTML = '<i class="fas fa-check text-green-500 text-xs"></i>';
            dayElement.appendChild(checkMark);
        }
        
        dayElement.appendChild(dateContainer);
        calendar.appendChild(dayElement);
    }
}

// 날짜 비교 함수
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 출석체크 함수
async function checkAttendance() {
    try {
        const today = new Date();
        const formattedDate = formatDate(today);
        
        // 현재 로그인한 사용자 ID 가져오기 (세션에서)
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            alert('로그인이 필요합니다.');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/attendance/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                userName: sessionStorage.getItem('userName') || '사용자'
            })
        });

        const data = await response.json();
        
        if (data.success) {
            const modal = document.getElementById('attendanceModal');
            document.getElementById('todayPoints').textContent = '0'; // 포인트 지급 없음
            modal.classList.remove('hidden');
            
            // 캘린더 새로고침
            createCalendar(today.getFullYear(), today.getMonth());
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('출석 체크 오류:', error);
        alert('출석 체크 중 오류가 발생했습니다.');
    }
}

// 출석 기록 로드 함수
async function loadAttendanceRecords() {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) return;

        const response = await fetch(`/api/attendance/${userId}`);
        const data = await response.json();

        if (data.success) {
            // 출석 기록을 localStorage에 저장 (캘린더 표시용)
            data.attendance.forEach(date => {
                localStorage.setItem(`attendance_${date}`, 'true');
            });
            
            // 캘린더 새로고침
            const today = new Date();
            createCalendar(today.getFullYear(), today.getMonth());
        }
    } catch (error) {
        console.error('출석 기록 로드 오류:', error);
    }
}

// 출석체크 모달 닫기 함수
function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.add('hidden');
}

// 페이지 로드 시 캘린더 초기화 및 출석 기록 로드
window.onload = function() {
    initializeCalendar();
    loadAttendanceRecords();
}; 