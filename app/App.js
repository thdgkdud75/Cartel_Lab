import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AttendanceScreen from './src/screens/AttendanceScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import TimetableScreen from './src/screens/TimetableScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendance');

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'name', 'is_staff']).then(([[, t], [, n], [, s]]) => {
      if (t) { setToken(t); setName(n || ''); setIsStaff(s === 'true'); }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!token) {
    return <LoginScreen onLogin={(t, n, staff) => {
      setToken(t); setName(n); setIsStaff(staff);
    }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {tab === 'attendance' && <AttendanceScreen name={name} onLogout={() => { setToken(null); setName(''); setIsStaff(false); }} />}
        {tab === 'timetable' && <TimetableScreen />}
        {tab === 'dashboard' && <DashboardScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('attendance')}>
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabActive]}>출결</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('timetable')}>
          <Text style={[styles.tabText, tab === 'timetable' && styles.tabActive]}>시간표</Text>
        </TouchableOpacity>
        {isStaff && (
          <TouchableOpacity style={styles.tab} onPress={() => setTab('dashboard')}>
            <Text style={[styles.tabText, tab === 'dashboard' && styles.tabActive]}>대시보드</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingBottom: 24,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  tabActive: { color: '#2563eb', fontWeight: '700' },
});
