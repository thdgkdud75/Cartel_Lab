import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://cartellab-production.up.railway.app';

export async function apiLogin(studentId, password) {
  const response = await fetch(`${BASE_URL}/users/api/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '로그인 실패');
  }
  return response.json(); // { token, name }
}

export async function getAuthHeaders() {
  const token = await AsyncStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  };
}

export async function checkIn(latitude, longitude) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/check-in/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ latitude, longitude }),
  });
  return response.json();
}

export async function checkOut(latitude, longitude) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/check-out/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ latitude, longitude }),
  });
  return response.json();
}

export async function getTodayStatus() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/today/`, { headers });
  return response.json();
}

export async function triggerAutoCheckout() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/auth/admin/api/auto-checkout/`, {
    method: 'POST',
    headers,
  });
  return response.json();
}

export async function getWeeklyAttendance(grade = '2', classGroup = '') {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ grade });
  if (classGroup) params.append('class', classGroup);
  const response = await fetch(`${BASE_URL}/auth/admin/api/weekly/?${params}`, { headers });
  return response.json();
}

export async function getTimetable() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/timetable/api/`, { headers });
  return response.json();
}

export async function registerPushToken(token) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/register-push-token/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token }),
  });
  return response.json();
}

export async function submitCheckoutRequest(requestedTime) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/checkout-request/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ requested_time: requestedTime }),
  });
  return response.json();
}

export async function listCheckoutRequests() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/checkout-requests/`, { headers });
  return response.json();
}

export async function approveCheckoutRequest(requestId) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/checkout-request/${requestId}/approve/`, {
    method: 'POST',
    headers,
  });
  return response.json();
}

export async function rejectCheckoutRequest(requestId) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}/attendance/checkout-request/${requestId}/reject/`, {
    method: 'POST',
    headers,
  });
  return response.json();
}
