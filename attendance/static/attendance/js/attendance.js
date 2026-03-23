/* Attendance Dashboard JavaScript */

const statusDiv = document.getElementById('statusMessage');

function showMessage(status, message) {
    if (!statusDiv) return;
    statusDiv.className = `status-message status-${status}`;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
}

function initHeatmap(heatmapData) {
    const container = document.getElementById('attendanceHeatmap');
    if (!container) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    let startDate = new Date(currentYear, 0, 1);
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    let currentDate = new Date(startDate);
    const monthsContainer = document.getElementById('heatmapMonths');
    let currentMonthPrinted = -1;
    
    for (let col = 0; col < 54; col++) {
        if (currentDate.getFullYear() > currentYear && currentDate.getDay() === 0) break;

        const colDiv = document.createElement('div');
        colDiv.className = 'heatmap-week';
        
        let tempDate = new Date(currentDate);
        tempDate.setDate(tempDate.getDate() + 3);
        let colMonth = tempDate.getMonth();
        
        if (colMonth !== currentMonthPrinted && tempDate.getFullYear() === currentYear) {
            const monthLabel = document.createElement('span');
            monthLabel.className = 'month-label';
            monthLabel.textContent = (colMonth + 1) + '월';
            monthLabel.style.left = (col * 13) + 'px';
            monthsContainer.appendChild(monthLabel);
            currentMonthPrinted = colMonth;
        }
        
        for (let row = 0; row < 7; row++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            if (currentDate.getFullYear() !== currentYear) {
                cell.style.backgroundColor = 'transparent';
                cell.style.border = 'none';
            } else {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;
                
                if (heatmapData[dateString]) {
                    const inStatus = heatmapData[dateString].in;
                    const outStatus = heatmapData[dateString].out;
                    
                    if (inStatus === 'late' && outStatus === 'leave') {
                        cell.classList.add('status-late-leave-color');
                        cell.title = `${dateString} - 지각 & 조퇴`;
                    } else if (inStatus === 'present' && outStatus === 'leave') {
                        cell.classList.add('status-present-leave-color');
                        cell.title = `${dateString} - 출석 & 조퇴`;
                    } else if (inStatus === 'late' && outStatus === 'present') {
                        cell.classList.add('status-late-present-color');
                        cell.title = `${dateString} - 지각 & 정상퇴근`;
                    } else if (inStatus === 'present' && outStatus === 'present') {
                        cell.classList.add('status-present-color');
                        cell.title = `${dateString} - 정상 출결`;
                    } else if (inStatus === 'late') {
                        cell.classList.add('status-late-color');
                        cell.title = `${dateString} - 지각 (퇴근 전)`;
                    } else if (inStatus === 'present') {
                        cell.classList.add('status-present-color');
                        cell.title = `${dateString} - 출석 (퇴근 전)`;
                    } else {
                        const legacyStatus = heatmapData[dateString].status || heatmapData[dateString];
                        cell.classList.add(`status-${legacyStatus}-color`);
                        cell.title = `${dateString} - ${legacyStatus}`;
                    }
                } else {
                    cell.title = currentDate > today ? `${dateString} - 예정` : `${dateString} - 기록 없음`;
                }
            }
            colDiv.appendChild(cell);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        container.appendChild(colDiv);
    }
    
    container.addEventListener('scroll', () => {
        monthsContainer.style.transform = `translateX(-${container.scrollLeft}px)`;
    });

    // 현재 월을 중앙으로 스크롤 (모바일 대응)
    setTimeout(() => {
        const startOfMonth = new Date(currentYear, today.getMonth(), 1);
        const endOfMonth = new Date(currentYear, today.getMonth() + 1, 0);
        
        // 히트맵 시작일(startDate)로부터의 주차 계산
        const startWeek = Math.floor((startOfMonth - startDate) / (7 * 24 * 60 * 60 * 1000));
        const endWeek = Math.floor((endOfMonth - startDate) / (7 * 24 * 60 * 60 * 1000));
        const middleWeek = (startWeek + endWeek) / 2;
        
        // 주차별 너비(13px = 셀11px + 갭2px)를 기준으로 중앙 위치 계산
        const scrollPos = (middleWeek * 13) - (container.clientWidth / 2) + 6.5;
        
        container.scrollTo({
            left: Math.max(0, scrollPos),
            behavior: 'smooth'
        });
    }, 300);
}

document.addEventListener("DOMContentLoaded", function() {
    // Heatmap data is expected to be defined globally as 'heatmapRawData'
    if (typeof heatmapRawData !== 'undefined') {
        initHeatmap(heatmapRawData);
    }

    // URL 파라미터 확인 (QR 코드 접속 여부)
    const urlParams = new URLSearchParams(window.location.search);
    const isQR = urlParams.get('qr') === 'true';

    // Event Handlers
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
        checkInBtn.addEventListener('click', function() {
            handleCheckInAction(this, checkInUrl, '출석체크 하기', '위치 확인 중...');
        });

        // QR 코드로 접속했고 아직 출석 전이라면 자동 출석 트리거
        if (isQR) {
            console.log("QR 접속 감지: 자동 출석을 시도합니다.");
            handleCheckInAction(checkInBtn, checkInUrl, '출석체크 하기', '자동 출석 시도 중...');
        }
    }

    const checkOutBtn = document.getElementById('checkOutBtn');
    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', function() {
            if (confirm('퇴실 처리를 하시겠습니까?')) {
                handleCheckOutAction(this, checkOutUrl, '퇴실하기', '처리 중...');
            }
        });
    }

    const setLocBtn = document.getElementById('setLocationBtn');
    if (setLocBtn) {
        setLocBtn.addEventListener('click', function() {
            if (confirm('현재 위치를 새로운 출결 허용 위치로 설정하시겠습니까?')) {
                handleAdminLocation(this);
            }
        });
    }

    const setTimeBtn = document.getElementById('setTimeBtn');
    if (setTimeBtn) {
        setTimeBtn.addEventListener('click', function() {
            handleAdminTime(this);
        });
    }
});

function handleCheckInAction(btn, url, originalText, loadingText) {
    btn.disabled = true;
    btn.textContent = loadingText;
    statusDiv.style.display = 'none';

    if (!navigator.geolocation) {
        showMessage('error', '이 브라우저는 위치 서비스를 지원하지 않습니다.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                })
            })
            .then(response => response.json())
            .then(data => {
                showMessage(data.status, data.message);
                if (data.status === 'success') {
                    if (typeof htmx !== 'undefined') htmx.trigger('#attendanceList', 'load');
                    setTimeout(() => window.location.reload(), 1500);
                }
                btn.disabled = false;
                btn.textContent = originalText;
            })
            .catch(() => {
                showMessage('error', '서버 통신 중 오류가 발생했습니다.');
                btn.disabled = false;
                btn.textContent = originalText;
            });
        },
        (error) => {
            let msg = error.code === 1 ? '위치 정보 접근 권한이 거부되었습니다.' : '위치 정보를 가져올 수 없습니다.';
            showMessage('error', msg);
            btn.disabled = false;
            btn.textContent = originalText;
        }
    );
}

function handleCheckOutAction(btn, url, originalText, loadingText) {
    btn.disabled = true;
    btn.textContent = loadingText;
    statusDiv.style.display = 'none';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({}) // 위치 정보 필요 없음
    })
    .then(response => response.json())
    .then(data => {
        showMessage(data.status, data.message);
        if (data.status === 'success') {
            if (typeof htmx !== 'undefined') htmx.trigger('#attendanceList', 'load');
            setTimeout(() => window.location.reload(), 1500);
        }
        btn.disabled = false;
        btn.textContent = originalText;
    })
    .catch(() => {
        showMessage('error', '서버 통신 중 오류가 발생했습니다.');
        btn.disabled = false;
        btn.textContent = originalText;
    });
}

function handleAdminLocation(btn) {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '위치 설정 중...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const locationName = prompt('위치 이름을 입력하세요 (예: 연구실)', '연구실') || '연구실';
            fetch(setLocationUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    name: locationName
                })
            })
            .then(response => response.json())
            .then(data => {
                showMessage(data.status, data.message);
                btn.disabled = false;
                btn.textContent = originalText;
            })
            .catch(() => {
                showMessage('error', '서버 통신 중 오류가 발생했습니다.');
                btn.disabled = false;
                btn.textContent = originalText;
            });
        },
        () => {
            showMessage('error', '위치 정보를 가져올 수 없습니다.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    );
}

function handleAdminTime(btn) {
    const checkInTime = prompt('지각 기준 시간을 입력하세요 (예: 10:00)', '10:00');
    if (!checkInTime) return;
    const checkOutTime = prompt('조퇴 기준 시간을 입력하세요 (예: 18:00)', '18:00');
    if (!checkOutTime) return;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(checkInTime) || !timeRegex.test(checkOutTime)) {
        alert('시간 형식이 잘못되었습니다. HH:MM 형식으로 입력해주세요.');
        return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '설정 중...';

    fetch(setTimeUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            check_in: checkInTime,
            check_out: checkOutTime
        })
    })
    .then(response => response.json())
    .then(data => {
        showMessage(data.status, data.message);
        btn.disabled = false;
        btn.textContent = originalText;
    })
    .catch(() => {
        showMessage('error', '서버 통신 중 오류가 발생했습니다.');
        btn.disabled = false;
        btn.textContent = originalText;
    });
}
