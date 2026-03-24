import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrentMembers, getMembers } from '../api/client';

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const [currentMembers, setCurrentMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('current'); // 'current' | 'all'

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const [cur, all] = await Promise.all([getCurrentMembers(), getMembers()]);
      if (cur.members) setCurrentMembers(cur.members);
      if (all.members) setAllMembers(all.members);
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={styles.title}>팀원</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'current' && styles.tabBtnActive]}
          onPress={() => setTab('current')}
        >
          <Text style={[styles.tabBtnText, tab === 'current' && styles.tabBtnTextActive]}>
            지금 연구실 ({currentMembers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabBtnText, tab === 'all' && styles.tabBtnTextActive]}>
            전체 ({allMembers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'current' && (
        <>
          {currentMembers.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>현재 연구실에 아무도 없어요 😴</Text>
            </View>
          ) : (
            currentMembers.map((m, i) => (
              <View key={i} style={[styles.card, m.is_me && styles.cardMe]}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>
                    {m.name} {m.is_me ? '(나)' : ''}
                  </Text>
                  <Text style={styles.cardSub}>{m.class_group}반</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardBadge}>입실</Text>
                  <Text style={styles.cardTime}>{m.check_in_at}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {tab === 'all' && (
        <>
          {['A', 'B'].map(group => {
            const members = allMembers.filter(m => m.class_group === group);
            if (members.length === 0) return null;
            return (
              <View key={group}>
                <Text style={styles.groupLabel}>{group}반</Text>
                {members.map((m, i) => (
                  <View key={i} style={styles.card}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.cardName}>{m.name}</Text>
                      {m.desired_job ? (
                        <Text style={styles.cardSub}>{m.desired_job}</Text>
                      ) : null}
                    </View>
                    {m.github_username ? (
                      <Text style={styles.githubBadge}>@{m.github_username}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111', marginBottom: 20 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#e5e7eb', alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabBtnTextActive: { color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  groupLabel: { fontSize: 14, fontWeight: '700', color: '#2563eb', marginTop: 12, marginBottom: 8 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardMe: { borderWidth: 1.5, borderColor: '#2563eb' },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  cardBadge: {
    fontSize: 11, color: '#16a34a', fontWeight: '700',
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 2,
  },
  cardTime: { fontSize: 12, color: '#6b7280' },
  githubBadge: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
});
