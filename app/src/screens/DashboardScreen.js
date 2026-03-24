import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getWeeklyAttendance } from '../api/client';

const STATUS_COLOR = {
  present: '#16a34a',
  late:    '#d97706',
  leave:   '#f97316',
  absent:  '#dc2626',
  none:    '#9ca3af',
  future:  '#e5e7eb',
};

export default function DashboardScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState('');

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await getWeeklyAttendance('2', classFilter);
      setData(res);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [classFilter]);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={s.title}>이번 주 출결</Text>
      {data && <Text style={s.sub}>{data.week_start} ~ {data.week_end}</Text>}

      {/* 반 필터 */}
      <View style={s.filterRow}>
        {['', 'A', 'B'].map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, classFilter === f && s.filterActive]}
            onPress={() => setClassFilter(f)}
          >
            <Text style={[s.filterText, classFilter === f && s.filterTextActive]}>
              {f === '' ? '전체' : f + '반'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {data?.students.map((student, i) => (
        <View key={i} style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.studentName}>{student.name}</Text>
            <Text style={s.classTag}>{student.class_group}반</Text>
          </View>
          <View style={s.weekRow}>
            {student.week.map((cell, j) => (
              <View key={j} style={s.dayCell}>
                <Text style={s.dayLabel}>{cell.day}</Text>
                <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[cell.status] || '#e5e7eb' }]} />
                <Text style={[s.statusLabel, { color: STATUS_COLOR[cell.status] || '#9ca3af' }]}>
                  {cell.label}
                </Text>
                {cell.check_in_at  && <Text style={s.timeText}>입 {cell.check_in_at}</Text>}
                {cell.check_out_at && <Text style={s.timeText}>퇴 {cell.check_out_at}</Text>}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db' },
  filterActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#6b7280' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  studentName: { fontSize: 15, fontWeight: '600', color: '#111' },
  classTag: { fontSize: 12, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', flex: 1 },
  dayLabel: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 3 },
  statusLabel: { fontSize: 10 },
  timeText: { fontSize: 9, color: '#6b7280', marginTop: 1 },
});
