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
