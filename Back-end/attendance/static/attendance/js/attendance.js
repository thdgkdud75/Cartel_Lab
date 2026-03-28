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

function loadCheckoutRequests() {
    fetch(checkoutRequestsUrl)
        .then(r => r.json())
        .then(data => {
            const section = document.getElementById('checkoutRequestSection');
            const list = document.getElementById('checkoutRequestList');
            if (!section || !list) return;
            const requests = data.requests || [];
            if (requests.length === 0) {
                section.style.display = 'none';
                return;
            }
            section.style.display = 'block';
            list.innerHTML = requests.map(req => `
                <div id="req-${req.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                    <div>
                        <span style="font-weight:600;color:#111;">${req.name}</span>
                        <span style="font-size:13px;color:#6b7280;margin-left:8px;">${req.requested_time} 퇴실 신청</span>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button onclick="handleApproveRequest(${req.id})" style="padding:6px 14px;background:#2563eb;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;">승인</button>
                        <button onclick="handleRejectRequest(${req.id})" style="padding:6px 14px;background:#f3f4f6;color:#374151;border:none;border-radius:7px;font-size:13px;cursor:pointer;">반려</button>
                    </div>
                </div>
            `).join('');
        })
        .catch(() => {});
}

function handleApproveRequest(requestId) {
    fetch(approveRequestUrl.replace('0', requestId), {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' },
    })
    .then(r => r.json())
    .then(d => {
        showMessage(d.status, d.message);
        document.getElementById(`req-${requestId}`)?.remove();
        loadCheckoutRequests();
    })
    .catch(() => {});
}

function handleRejectRequest(requestId) {
    fetch(rejectRequestUrl.replace('0', requestId), {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' },
    })
    .then(r => r.json())
    .then(d => {
        showMessage(d.status, d.message);
        document.getElementById(`req-${requestId}`)?.remove();
        loadCheckoutRequests();
    })
    .catch(() => {});
}

document.addEventListener("DOMContentLoaded", function() {
    // Heatmap data is expected to be defined globally as 'heatmapRawData'
    if (typeof heatmapRawData !== 'undefined') {
        initHeatmap(heatmapRawData);
    }
    // 퇴실 승인 요청 목록 로드 (15초마다 갱신)
    if (typeof checkoutRequestsUrl !== 'undefined') {
        loadCheckoutRequests();
        setInterval(loadCheckoutRequests, 15000);
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
                    showDailyGoalModal(() => window.location.reload());
                } else {
                    btn.disabled = false;
                    btn.textContent = originalText;
                }
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

function showDailyGoalModal(onClose) {
    const modal = document.getElementById('dailyGoalModal');
    if (!modal) { onClose(); return; }
    modal.style.display = 'flex';

    const submitBtn = document.getElementById('dailyGoalSubmit');
    const skipBtn = document.getElementById('dailyGoalSkip');
    const input = document.getElementById('dailyGoalInput');

    function close() {
        modal.style.display = 'none';
        onClose();
    }

    skipBtn.onclick = close;

    submitBtn.onclick = function() {
        const content = (input.value || '').trim();
        if (!content) { close(); return; }
        fetch(dailyGoalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ content }),
        }).finally(close);
    };

    input.focus();
    input.onkeydown = function(e) {
        if (e.key === 'Enter') submitBtn.click();
        if (e.key === 'Escape') close();
    };
}

function handleCheckOutAction(btn, url, originalText, loadingText) {
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
                if (data.status === 'success') {
                    showMessage(data.status, data.message);
                    if (typeof htmx !== 'undefined') htmx.trigger('#attendanceList', 'load');
                    showTodoCheckModal(() => setTimeout(() => window.location.reload(), 1500));
                } else if (data.status === 'outside_geofence') {
                    showOutsideGeofenceModal(data.message);
                } else {
                    showMessage(data.status, data.message);
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
        () => {
            showMessage('error', '위치 정보를 가져올 수 없습니다.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    );
}

function showTodoCheckModal(onDone) {
    if (typeof dailyTodosUrl === 'undefined') { onDone(); return; }
    fetch(dailyTodosUrl)
        .then(r => r.json())
        .then(data => {
            const todos = data.todos || [];
            if (todos.length === 0) { onDone(); return; }

            const modal = document.getElementById('todoCheckModal');
            const list = document.getElementById('todoCheckList');
            if (!modal || !list) { onDone(); return; }

            let todosState = todos.map(t => ({ ...t }));

            function renderList() {
                list.innerHTML = todosState.map(t => `
                    <div onclick="window._toggleCheckoutTodo(${t.id})" style="display:flex;align-items:center;gap:10px;padding:9px 0;cursor:pointer;border-bottom:1px solid #f1f5f9;">
                        <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${t.is_checked ? '#2563eb' : '#d1d5db'};background:${t.is_checked ? '#2563eb' : '#fff'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            ${t.is_checked ? '<span style="color:#fff;font-size:13px;font-weight:700;">✓</span>' : ''}
                        </div>
                        <span style="font-size:14px;color:${t.is_checked ? '#9ca3af' : '#111'};text-decoration:${t.is_checked ? 'line-through' : 'none'};flex:1;">${t.content}</span>
                    </div>
                `).join('');
            }

            window._toggleCheckoutTodo = function(id) {
                const todo = todosState.find(t => t.id === id);
                if (!todo) return;
                todo.is_checked = !todo.is_checked;
                fetch(dailyTodoToggleUrl.replace('0', id), {
                    method: 'POST',
                    headers: { 'X-CSRFToken': csrfToken },
                }).catch(() => {});
                renderList();
            };

            renderList();
            modal.style.display = 'flex';

            function close() {
                modal.style.display = 'none';
                onDone();
            }

            document.getElementById('todoCheckSkip').onclick = close;
            document.getElementById('todoCheckConfirm').onclick = close;
        })
        .catch(() => onDone());
}

function showOutsideGeofenceModal(message) {
    const modal = document.getElementById('outsideGeofenceModal');
    if (!modal) return;
    document.getElementById('outsideGeofenceMsg').textContent = message || '범위 밖입니다. 몇 시에 퇴실했나요?';
    modal.style.display = 'flex';

    const input = document.getElementById('outsideGeofenceTime');
    const submitBtn = document.getElementById('outsideGeofenceSubmit');
    const cancelBtn = document.getElementById('outsideGeofenceCancel');

    // 현재 시각 기본값
    const now = new Date();
    input.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    function close() { modal.style.display = 'none'; }

    cancelBtn.onclick = close;
    submitBtn.onclick = function() {
        const time = input.value;
        if (!time) return;
        fetch(checkOutRequestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ requested_time: time }),
        })
        .then(r => r.json())
        .then(d => {
            showMessage(d.status === 'success' ? 'success' : 'error', d.message);
            close();
        })
        .catch(() => { showMessage('error', '신청 중 오류가 발생했습니다.'); close(); });
    };
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
