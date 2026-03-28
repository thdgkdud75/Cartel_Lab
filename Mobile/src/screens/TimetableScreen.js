import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTimetable } from '../api/client';

const DAYS = ['월', '화', '수', '목', '금'];

function getNextClass(timetable) {
  const now = new Date();
  const todayIdx = now.getDay() - 1; // 0=월 ... 4=금
  if (todayIdx < 0 || todayIdx > 4) return null;
  const todayEntries = timetable
    .filter(e => e.weekday === todayIdx)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const e of todayEntries) {
    const [h, m] = e.start_time.split(':').map(Number);
    if (h * 60 + m > nowMinutes) return { ...e, startMinutes: h * 60 + m };
  }
  return null;
}

function formatCountdown(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}시간 ${m}분 후`;
  if (m > 0) return `${m}분 ${s}초 후`;
  return `${s}초 후`;
}

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
        type: 'weekly',
        weekday: entry.weekday + 2, // Expo: 1=일, 2=월 ... 6=금
        hour: notifyHour,
        minute: notifyMinute,
        repeats: true,
      },
    });
  }
}

export default function TimetableScreen() {
  const insets = useSafeAreaInsets();
  const [timetable, setTimetable] = useState([]);
  const [classGroup, setClassGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState('');
  const [nextClass, setNextClass] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    getTimetable()
      .then(res => {
        if (res.error) { setError(res.error); return; }
        setClassGroup(res.class_group);
        setTimetable(res.timetable);
        scheduleNotifications(res.timetable);
        scheduleToday아침Notification(res.timetable);
      })
      .catch(() => setError('시간표를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (timetable.length === 0) return;
    const update = () => {
      const next = getNextClass(timetable);
      setNextClass(next);
      if (next) {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const diffSec = (next.startMinutes - nowMinutes) * 60 - now.getSeconds();
        setCountdown(formatCountdown(Math.max(0, diffSec)));
      } else {
        setCountdown('');
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [timetable]);

  const scheduleToday아침Notification = async (tt) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const now = new Date();
    const todayIdx = now.getDay() - 1;
    if (todayIdx < 0 || todayIdx > 4) return;
    const todayClasses = tt.filter(e => e.weekday === todayIdx);
    if (todayClasses.length === 0) return;
    const sorted = [...todayClasses].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const summary = sorted.map(e => `${e.start_time} ${e.subject}`).join(', ');
    const target = new Date();
    target.setHours(8, 30, 0, 0);
    if (target <= now) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'morning_class') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘 수업 📚',
        body: summary,
        sound: 'default',
        data: { type: 'morning_class' },
      },
      trigger: { type: 'timeInterval', seconds: Math.floor((target - now) / 1000) },
    });
  };

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

  const todayIdx = new Date().getDay() - 1;
  const todayEntries = timetable.filter(e => e.weekday === todayIdx);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 16 }}>
      <Text style={styles.title}>{classGroup}반 시간표</Text>

      {nextClass && (
        <View style={styles.nextClassCard}>
          <Text style={styles.nextClassLabel}>다음 수업</Text>
          <Text style={styles.nextClassName}>{nextClass.subject}</Text>
          <Text style={styles.nextClassTime}>{nextClass.start_time} 시작 · {countdown}</Text>
        </View>
      )}

      {todayEntries.length > 0 && (
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>오늘 수업</Text>
          {todayEntries
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
            .map(e => (
              <View key={e.id} style={styles.todayEntry}>
                <Text style={styles.todayTime}>{e.start_time}~{e.end_time}</Text>
                <Text style={styles.todaySubject}>{e.subject}</Text>
              </View>
            ))}
        </View>
      )}
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
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24, paddingBottom: 40 },
  nextClassCard: {
    backgroundColor: '#2563eb', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  nextClassLabel: { fontSize: 11, color: '#bfdbfe', marginBottom: 4 },
  nextClassName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  nextClassTime: { fontSize: 13, color: '#dbeafe' },
  todayCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  todayLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  todayEntry: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  todayTime: { fontSize: 13, color: '#6b7280' },
  todaySubject: { fontSize: 13, fontWeight: '600', color: '#111' },
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
