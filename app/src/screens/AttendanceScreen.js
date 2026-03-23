import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkIn, checkOut } from '../api/client';

export default function AttendanceScreen({ name, onLogout }) {
  const [status, setStatus] = useState('idle'); // idle | checking-in | checking-out
  const [message, setMessage] = useState('');

  const getLocation = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('위치 권한 필요', '출결 체크를 위해 위치 권한이 필요합니다.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return loc.coords;
  };

  const handleCheckIn = async () => {
    setStatus('checking-in');
    setMessage('');
    try {
      const coords = await getLocation();
      if (!coords) { setStatus('idle'); return; }
      const res = await checkIn(coords.latitude, coords.longitude);
      setMessage(res.message || '출석 완료!');
    } catch (e) {
      setMessage('오류: ' + e.message);
    } finally {
      setStatus('idle');
    }
  };

  const handleCheckOut = async () => {
    setStatus('checking-out');
    setMessage('');
    try {
      const coords = await getLocation();
      if (!coords) { setStatus('idle'); return; }
      const res = await checkOut(coords.latitude, coords.longitude);
      setMessage(res.message || '퇴실 완료!');
    } catch (e) {
      setMessage('오류: ' + e.message);
    } finally {
      setStatus('idle');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'name']);
    onLogout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{name}님, 안녕하세요 👋</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>출결 체크</Text>

      <TouchableOpacity
        style={[styles.button, styles.checkInBtn, status !== 'idle' && styles.disabled]}
        onPress={handleCheckIn}
        disabled={status !== 'idle'}
      >
        <Text style={styles.btnText}>
          {status === 'checking-in' ? '처리 중...' : '출석 체크인'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.checkOutBtn, status !== 'idle' && styles.disabled]}
        onPress={handleCheckOut}
        disabled={status !== 'idle'}
      >
        <Text style={styles.btnText}>
          {status === 'checking-out' ? '처리 중...' : '퇴실 체크아웃'}
        </Text>
      </TouchableOpacity>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 32,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkInBtn: {
    backgroundColor: '#2563eb',
  },
  checkOutBtn: {
    backgroundColor: '#7c3aed',
  },
  disabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    marginTop: 24,
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    backgroundColor: '#e0f2fe',
    padding: 14,
    borderRadius: 8,
  },
});
