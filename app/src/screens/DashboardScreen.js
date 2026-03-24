import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { editAttendance, getMonthlyStats, getWeeklyAttendance, triggerAutoCheckout } from '../api/client';

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
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classFilter, setClassFilter] = useState('');
  const [tab, setTab] = useState('weekly'); // 'weekly' | 'monthly'
  const insets = useSafeAreaInsets();

  // 출결 수정 모달
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const load = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [weekly, stats] = await Promise.all([
        getWeeklyAttendance('2', classFilter),
        getMonthlyStats(),
      ]);
      setData(weekly);
      if (stats.stats) setMonthly(stats.stats);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [classFilter]);

  const handleAutoCheckout = () => {
    Alert.alert('퇴실시간 맞추기', '어제 미퇴실 인원을 오후 5시로 처리할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '처리',
        onPress: async () => {
          const res = await triggerAutoCheckout();
          Alert.alert('완료', res.message || '처리됐습니다.');
          if (res.count > 0) load(true);
        },
      },
    ]);
  };

  const handleEditSubmit = async () => {
    if (!editName || !editDate) {
      Alert.alert('오류', '이름과 날짜는 필수입니다.');
      return;
    }
    setEditLoading(true);
    try {
      const res = await editAttendance(editName, editDate, editCheckIn || null, editCheckOut || null);
      if (res.status === 'ok') {
        Alert.alert('완료', res.message);
        setEditModal(false);
        load(true);
      } else {
        Alert.alert('오류', res.error || '수정 실패');
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const maxTotal = monthly ? Math.max(...monthly.map(m => m.total), 1) : 1;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingTop: insets.top + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={s.titleRow}>
          <Text style={s.title}>관리자 대시보드</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditModal(true)}>
            <Text style={s.editBtnText}>출결 수정</Text>
          </TouchableOpacity>
        </View>

        {/* 탭 */}
        <View style={s.tabRow}>
          {['weekly', 'monthly'].map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, tab === t && s.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabBtnText, tab === t && s.tabBtnTextActive]}>
                {t === 'weekly' ? '이번 주 출결' : '월별 통계'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'weekly' && (
          <>
            <View style={s.weekHeader}>
              {data && <Text style={s.sub}>{data.week_start} ~ {data.week_end}</Text>}
              <TouchableOpacity style={s.autoBtn} onPress={handleAutoCheckout}>
                <Text style={s.autoBtnText}>퇴실시간 맞추기</Text>
              </TouchableOpacity>
            </View>

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
          </>
        )}

        {tab === 'monthly' && monthly && (
          <View style={s.monthlySection}>
            <Text style={s.monthlyTitle}>최근 6개월 출결 현황</Text>
            {monthly.map((m, i) => (
              <View key={i} style={s.monthRow}>
                <Text style={s.monthLabel}>{m.month}</Text>
                <View style={s.barContainer}>
                  <View style={[s.bar, s.barPresent, { flex: m.present / maxTotal }]} />
                  <View style={[s.bar, s.barLate,    { flex: m.late    / maxTotal }]} />
                  <View style={[s.bar, s.barLeave,   { flex: m.leave   / maxTotal }]} />
                  <View style={{ flex: (maxTotal - m.total) / maxTotal }} />
                </View>
                <Text style={s.monthTotal}>{m.total}건</Text>
              </View>
            ))}
            <View style={s.legend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#16a34a' }]} /><Text style={s.legendText}>출석</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#d97706' }]} /><Text style={s.legendText}>지각</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: '#f97316' }]} /><Text style={s.legendText}>조퇴</Text></View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 출결 수정 모달 */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>출결 수동 수정</Text>
            <TextInput style={s.input} placeholder="이름" value={editName} onChangeText={setEditName} />
            <TextInput style={s.input} placeholder="날짜 (YYYY-MM-DD)" value={editDate} onChangeText={setEditDate} />
            <TextInput style={s.input} placeholder="입실 시간 (HH:MM)" value={editCheckIn} onChangeText={setEditCheckIn} />
            <TextInput style={s.input} placeholder="퇴실 시간 (HH:MM)" value={editCheckOut} onChangeText={setEditCheckOut} />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setEditModal(false)}>
                <Text style={s.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSubmitBtn, editLoading && s.disabled]}
                onPress={handleEditSubmit}
                disabled={editLoading}
              >
                <Text style={s.modalSubmitText}>{editLoading ? '수정 중...' : '수정'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  editBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabBtnTextActive: { color: '#fff' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  autoBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  autoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  sub: { fontSize: 13, color: '#6b7280' },
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
  // 월별 통계
  monthlySection: { paddingBottom: 40 },
  monthlyTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 16 },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  monthLabel: { width: 36, fontSize: 12, color: '#374151', fontWeight: '600' },
  barContainer: { flex: 1, flexDirection: 'row', height: 18, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f3f4f6', marginHorizontal: 8 },
  bar: { height: '100%' },
  barPresent: { backgroundColor: '#16a34a' },
  barLate:    { backgroundColor: '#d97706' },
  barLeave:   { backgroundColor: '#f97316' },
  monthTotal: { width: 36, fontSize: 11, color: '#6b7280', textAlign: 'right' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6b7280' },
  // 수정 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#374151' },
  modalSubmitBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center' },
  modalSubmitText: { fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.6 },
});
