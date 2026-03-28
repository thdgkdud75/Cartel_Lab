import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  const [tab, setTab] = useState('current');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    const [curResult, allResult] = await Promise.allSettled([getCurrentMembers(), getMembers()]);
    if (curResult.status === 'fulfilled' && curResult.value.members) {
      setCurrentMembers(curResult.value.members);
    }
    if (allResult.status === 'fulfilled' && allResult.value.members) {
      setAllMembers(allResult.value.members);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, []);

  // 동적 그룹핑
  const groups = [...new Set(allMembers.map(m => m.class_group || '기타'))].sort();

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
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* 헤더 */}
      <Text style={styles.title}>팀원</Text>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'current' && styles.tabBtnActive]}
          onPress={() => setTab('current')}
        >
          <Text style={[styles.tabBtnText, tab === 'current' && styles.tabBtnTextActive]}>
            지금 랩실
          </Text>
          <View style={[styles.tabBadge, tab === 'current' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, tab === 'current' && styles.tabBadgeTextActive]}>
              {currentMembers.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
        >
          <Text style={[styles.tabBtnText, tab === 'all' && styles.tabBtnTextActive]}>
            전체
          </Text>
          <View style={[styles.tabBadge, tab === 'all' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, tab === 'all' && styles.tabBadgeTextActive]}>
              {allMembers.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 지금 랩실 탭 */}
      {tab === 'current' && (
        <>
          {currentMembers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>😴</Text>
              <Text style={styles.emptyText}>지금 랩실에 아무도 없어요</Text>
            </View>
          ) : (
            currentMembers.map((m, i) => (
              <View key={i} style={[styles.card, m.is_me && styles.cardMe]}>
                <View style={styles.avatar}>
                  {m.profile_image
                    ? <Image source={{ uri: m.profile_image }} style={styles.avatarImg} />
                    : <Text style={styles.avatarText}>{m.name.slice(0, 1)}</Text>}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cardName}>{m.name}</Text>
                    {m.is_me && <View style={styles.meBadge}><Text style={styles.meBadgeText}>나</Text></View>}
                    <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>{m.class_group}반</Text></View>
                  </View>
                  <Text style={styles.checkInText}>입실 {m.check_in_at}</Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
            ))
          )}
        </>
      )}

      {/* 전체 탭 */}
      {tab === 'all' && (
        <>
          {allMembers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>팀원 정보를 불러올 수 없어요</Text>
            </View>
          ) : (
            groups.map(group => {
              const members = allMembers.filter(m => (m.class_group || '기타') === group);
              return (
                <View key={group}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupLabel}>{group}반</Text>
                    <Text style={styles.groupCount}>{members.length}명</Text>
                  </View>
                  {members.map((m, i) => (
                    <View key={i} style={styles.card}>
                      <View style={[styles.avatar, styles.avatarAll]}>
                        {m.profile_image
                          ? <Image source={{ uri: m.profile_image }} style={styles.avatarImg} />
                          : <Text style={styles.avatarText}>{m.name.slice(0, 1)}</Text>}
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName}>{m.name}</Text>
                        {m.desired_job ? (
                          <Text style={styles.cardSub}>{m.desired_job}</Text>
                        ) : null}
                      </View>
                      {m.github_username ? (
                        <View style={styles.githubBadge}>
                          <Text style={styles.githubText}>@{m.github_username}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0f172a', marginBottom: 20, paddingHorizontal: 20 },

  tabRow: { flexDirection: 'row', marginBottom: 20, paddingHorizontal: 20, gap: 10 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', gap: 6,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  tabBtnActive: { backgroundColor: '#2563eb' },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  tabBadgeTextActive: { color: '#fff' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15 },

  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 8, marginBottom: 8 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  groupCount: { fontSize: 12, color: '#94a3b8' },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 8,
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardMe: { borderWidth: 1.5, borderColor: '#2563eb' },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarAll: { backgroundColor: '#f0fdf4' },
  avatarImg: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { fontSize: 17, fontWeight: '700', color: '#1d4ed8' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b' },
  checkInText: { fontSize: 12, color: '#64748b' },

  meBadge: { backgroundColor: '#2563eb', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  meBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  groupBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  groupBadgeText: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },

  githubBadge: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  githubText: { fontSize: 11, color: '#64748b', fontStyle: 'italic' },
});
