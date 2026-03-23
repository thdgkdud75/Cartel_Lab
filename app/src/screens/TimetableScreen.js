import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTimetable } from '../api/client';

const DAYS = ['월', '화', '수', '목', '금'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function scheduleNotifications(timetable) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  for (const entry of timetable) {
    const [hour, minute] = entry.start_time.split(':').map(Number);

    // 10분 전
    let notifyMinute = minute - 10;
    let notifyHour = hour;
    if (notifyMinute < 0) {
      notifyMinute += 60;
      notifyHour -= 1;
    }
    if (notifyHour < 0) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📚 ${entry.subject} 10분 전`,
        body: `${entry.start_time} 시작`,
      },
      trigger: {
        weekday: entry.weekday + 2, // Expo: 1=일, 2=월 ... 6=금
        hour: notifyHour,
        minute: notifyMinute,
        repeats: true,
      },
    });
  }
}

export default function TimetableScreen() {
  const [timetable, setTimetable] = useState([]);
  const [classGroup, setClassGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTimetable()
      .then(res => {
        if (res.error) { setError(res.error); return; }
        setClassGroup(res.class_group);
        setTimetable(res.timetable);
        scheduleNotifications(res.timetable);
      })
      .catch(() => setError('시간표를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{classGroup}반 시간표</Text>
      {DAYS.map((day, idx) => {
        const entries = timetable.filter(e => e.weekday === idx);
        return (
          <View key={idx} style={styles.dayBlock}>
            <Text style={styles.dayLabel}>{day}</Text>
            {entries.length === 0 ? (
              <Text style={styles.empty}>수업 없음</Text>
            ) : (
              entries.map(e => (
                <View key={e.id} style={styles.entry}>
                  <Text style={styles.time}>{e.start_time} ~ {e.end_time}</Text>
                  <Text style={styles.subject}>{e.subject}</Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111', marginBottom: 24 },
  dayBlock: { marginBottom: 20 },
  dayLabel: { fontSize: 16, fontWeight: '700', color: '#2563eb', marginBottom: 8 },
  entry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  time: { fontSize: 14, color: '#555' },
  subject: { fontSize: 14, fontWeight: '600', color: '#111' },
  empty: { fontSize: 13, color: '#aaa' },
  errorText: { fontSize: 15, color: '#ef4444' },
});
