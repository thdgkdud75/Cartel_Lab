import { useEffect, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addDailyTodo,
  deleteDailyTodo,
  getDailyTodos,
  getLabGoals,
  getWeeklyAchievement,
  toggleDailyTodo,
} from '../api/client';

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState([]);
  const [labGoals, setLabGoals] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    getDailyTodos().then(r => { if (r.todos) setTodos(r.todos); }).catch(() => {});
    getLabGoals().then(r => { if (r.goals) setLabGoals(r.goals); }).catch(() => {});
    getWeeklyAchievement().then(r => { if (r.days) setWeekly(r); }).catch(() => {});
  };

  const handleAdd = async () => {
    const content = input.trim();
    if (!content) return;
    setAdding(true);
    try {
      const res = await addDailyTodo(content);
      if (res.id) {
        setTodos(prev => [...prev, res]);
        setInput('');
      }
    } catch (e) {}
    setAdding(false);
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleDailyTodo(id);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, is_checked: res.is_checked } : t));
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      await deleteDailyTodo(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (e) {}
  };

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}(${['일','월','화','수','목','금','토'][today.getDay()]})`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>할 일</Text>

      {/* 이번 주 달성률 차트 */}
      {weekly && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>이번 주 목표 달성률</Text>
            <Text style={styles.chartRate}>{weekly.rate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${weekly.rate}%` }]} />
          </View>
          <View style={styles.dayRow}>
            {weekly.days.map(d => (
              <View key={d.date} style={styles.dayCell}>
                <View style={[
                  styles.dayDot,
                  d.is_achieved && styles.dayDotDone,
                  d.has_goal && !d.is_achieved && styles.dayDotPending,
                ]} />
                <Text style={styles.dayLabel}>{d.weekday}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.chartSub}>{weekly.achieved}/{weekly.total}개 달성</Text>
        </View>
      )}

      {/* 랩실 전체목표 */}
      {labGoals.length > 0 && (
        <View style={styles.labCard}>
          <Text style={styles.labTitle}>🏫 이번 주 랩실 목표</Text>
          {labGoals.map(g => (
            <View key={g.id} style={styles.labItem}>
              <Text style={styles.labContent}>• {g.content}</Text>
              <Text style={styles.labBy}>{g.created_by}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 오늘 할 일 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 오늘의 할 일 <Text style={styles.dateLabel}>{dateStr}</Text></Text>

        {/* 입력 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="할 일 추가..."
            maxLength={255}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, adding && styles.disabled]}
            onPress={handleAdd}
            disabled={adding}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* 목록 */}
        {todos.length === 0 ? (
          <Text style={styles.empty}>오늘 등록한 할 일이 없어요.</Text>
        ) : (
          todos.map(todo => (
            <View key={todo.id} style={styles.todoItem}>
              <TouchableOpacity onPress={() => handleToggle(todo.id)} style={styles.checkBtn}>
                <View style={[styles.checkBox, todo.is_checked && styles.checkBoxDone]}>
                  {todo.is_checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={[styles.todoText, todo.is_checked && styles.todoDone]}>
                {todo.content}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(todo.id)} style={styles.delBtn}>
                <Text style={styles.delText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 20 },

  // 차트
  chartCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  chartRate: { fontSize: 22, fontWeight: '800', color: '#2563eb' },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2563eb', borderRadius: 4 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  dayCell: { alignItems: 'center', gap: 4 },
  dayDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb' },
  dayDotDone: { backgroundColor: '#2563eb' },
  dayDotPending: { backgroundColor: '#fbbf24' },
  dayLabel: { fontSize: 11, color: '#6b7280' },
  chartSub: { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  // 랩실 목표
  labCard: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  labTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 8 },
  labItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  labContent: { fontSize: 14, color: '#14532d', flex: 1 },
  labBy: { fontSize: 11, color: '#6b7280', marginLeft: 8 },

  // 할 일
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },
  dateLabel: { fontSize: 13, fontWeight: '400', color: '#6b7280' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 10, fontSize: 14, color: '#111',
  },
  addBtn: {
    width: 42, height: 42, backgroundColor: '#2563eb', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '600', lineHeight: 26 },
  disabled: { opacity: 0.5 },
  empty: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  todoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkBtn: { padding: 2 },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  todoText: { flex: 1, fontSize: 14, color: '#111' },
  todoDone: { color: '#9ca3af', textDecorationLine: 'line-through' },
  delBtn: { padding: 4 },
  delText: { fontSize: 14, color: '#d1d5db' },
});
