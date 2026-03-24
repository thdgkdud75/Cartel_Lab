import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerPushToken } from './src/api/client';
import AttendanceScreen from './src/screens/AttendanceScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoginScreen from './src/screens/LoginScreen';
import MembersScreen from './src/screens/MembersScreen';
import TimetableScreen from './src/screens/TimetableScreen';

async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

export default function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('attendance');

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'name', 'is_staff']).then(([[, t], [, n], [, s]]) => {
      if (t) {
        setToken(t);
        setName(n || '');
        setIsStaff(s === 'true');
        registerForPushNotifications().then(pushToken => {
          if (pushToken) registerPushToken(pushToken).catch(() => {});
        });
      }
      setLoading(false);
    });
  }, []);

  // 알림 탭 시 출결 탭으로 이동
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const type = response.notification.request.content.data?.type;
      if (type === 'checkout_approval_request' || type === 'checkout_reminder') {
        setTab('attendance');
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={(t, n, staff) => {
          setToken(t); setName(n); setIsStaff(staff);
          registerForPushNotifications().then(pushToken => {
            if (pushToken) registerPushToken(pushToken).catch(() => {});
          });
        }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppShell
        tab={tab} setTab={setTab} isStaff={isStaff}
        name={name}
        onLogout={() => { setToken(null); setName(''); setIsStaff(false); }}
      />
    </SafeAreaProvider>
  );
}

function AppShell({ tab, setTab, isStaff, name, onLogout }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      {/* 상단 safe area 배경 */}
      <View style={{ height: insets.top, backgroundColor: '#f8fafc' }} />

      <View style={{ flex: 1 }}>
        {tab === 'attendance' && <AttendanceScreen name={name} onLogout={onLogout} />}
        {tab === 'timetable' && <TimetableScreen />}
        {tab === 'members'   && <MembersScreen />}
        {tab === 'dashboard' && <DashboardScreen />}
      </View>

      {/* 탭바 + 하단 홈 인디케이터 */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('attendance')}>
          <Text style={[styles.tabText, tab === 'attendance' && styles.tabActive]}>출결</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('timetable')}>
          <Text style={[styles.tabText, tab === 'timetable' && styles.tabActive]}>시간표</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab('members')}>
          <Text style={[styles.tabText, tab === 'members' && styles.tabActive]}>팀원</Text>
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
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  tabActive: { color: '#2563eb', fontWeight: '700' },
});
