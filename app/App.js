import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LoginScreen from './src/screens/LoginScreen';
import TimetableScreen from './src/screens/TimetableScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'timetable'

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'name']).then(([[, t], [, n]]) => {
      if (t) { setToken(t); setName(n || ''); }
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
    return <LoginScreen onLogin={(t, n) => { setToken(t); setName(n); }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {tab === 'attendance'
          ? <AttendanceScreen name={name} onLogout={() => { setToken(null); setName(''); }} />
          : <TimetableScreen />
        }
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('attendance')}>
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabActive]}>출결</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('timetable')}>
          <Text style={[styles.tabText, tab === 'timetable' && styles.tabActive]}>시간표</Text>
        </TouchableOpacity>
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
