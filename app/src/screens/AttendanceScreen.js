import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  achieveDailyGoal,
  addDailyTodo,
  approveCheckoutRequest,
  checkIn,
  checkOut,
  getDailyGoal,
  getDailyTodos,
  getMyStats,
  getProfileImage,
  getTodayStatus,
  getWeeklyAchievement,
  listCheckoutRequests,
  rejectCheckoutRequest,
  saveDailyGoal,
  submitCheckoutRequest,
  toggleDailyTodo,
  updateDailyTodo,
  uploadProfileImage,
} from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TIME_OPTIONS = [
  '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00',
];

export default function AttendanceScreen({ name, onLogout }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  // 'none' | 'checked_in' | 'checked_out'
  const [attendance, setAttendance] = useState('none');
  const [checkInAt, setCheckInAt] = useState(null);
  const [checkOutAt, setCheckOutAt] = useState(null);
  const [message, setMessage] = useState('');
  const [checkoutRequestStatus, setCheckoutRequestStatus] = useState(null); // null | 'pending' | 'approved' | 'rejected'

  // 범위 밖 퇴실 모달
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // 다른 사람 퇴실 신청 목록
  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  // 하루 목표
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [todayGoal, setTodayGoal] = useState(null);
  const [weeklyAchievement, setWeeklyAchievement] = useState(null);

  // 출첵 시 할 일 등록 모달
  const [showTodoRegisterModal, setShowTodoRegisterModal] = useState(false);
  const [todoRegisterInput, setTodoRegisterInput] = useState('');
  const [todoRegisterList, setTodoRegisterList] = useState([]);

  // 오늘 할일 목록 (메인 화면)
  const [todayTodos, setTodayTodos] = useState([]);

  // 할일 수정 모달
  const [editingTodo, setEditingTodo] = useState(null); // { id, content }
  const [editInput, setEditInput] = useState('');

  // 퇴실 시 할 일 체크 모달
  const [showTodoCheckModal, setShowTodoCheckModal] = useState(false);
  const [checkoutTodos, setCheckoutTodos] = useState([]);

  // 퇴실 시 목표 달성 모달
  const [showGoalAchieveModal, setShowGoalAchieveModal] = useState(false);

  useEffect(() => {
    loadTodayStatus();
    loadPendingRequests();
    getMyStats().then(res => { if (res.streak !== undefined) setStats(res); }).catch(() => {});
    getProfileImage().then(res => { if (res.profile_image) setProfileImage(res.profile_image); }).catch(() => {});
    getDailyGoal().then(res => { if (res.id) setTodayGoal(res); }).catch(() => {});
    getWeeklyAchievement().then(res => { if (res.days) setWeeklyAchievement(res); }).catch(() => {});
    getDailyTodos().then(res => { if (res.todos) setTodayTodos(res.todos); }).catch(() => {});
    scheduleMorningReminder();
  }, []);

  const loadTodayStatus = () => {
    getTodayStatus().then(res => {
      if (res.attendance) setAttendance(res.attendance);
      if (res.check_in_at) setCheckInAt(res.check_in_at);
      if (res.check_out_at) setCheckOutAt(res.check_out_at);
      if (res.checkout_request) setCheckoutRequestStatus(res.checkout_request);
      if (res.attendance === 'checked_in') scheduleCheckoutReminder();
    }).catch(() => {});
  };

  const loadPendingRequests = () => {
    listCheckoutRequests().then(res => {
      if (res.requests) setPendingRequests(res.requests);
    }).catch(() => {});
  };

  const scheduleCheckoutReminder = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const tonight10 = new Date();
    tonight10.setHours(22, 0, 0, 0);
    if (tonight10 <= new Date()) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'checkout_reminder') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '퇴실은 찍으셨나요? 🚪',
        body: '앱에서 퇴실 체크아웃을 완료해주세요.',
        sound: 'default',
        data: { type: 'checkout_reminder' },
      },
      trigger: { type: 'timeInterval', seconds: Math.floor((tonight10 - new Date()) / 1000) },
    });
  };

  const cancelCheckoutReminder = async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'checkout_reminder') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  };

  const getLocation = async () => {
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('위치 권한 필요', '출결 체크를 위해 위치 권한이 필요합니다.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return loc.coords;
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setMessage('');
    try {
      const coords = await getLocation();
      if (!coords) return;
      const res = await checkIn(coords.latitude, coords.longitude);
      setMessage(res.message || '출석 완료!');
      if (res.status === 'success' || res.status === 'info') {
        setAttendance('checked_in');
        const now = new Date();
        setCheckInAt(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
        scheduleCheckoutReminder();
        if (!todayGoal) {
          setShowGoalModal(true);
        } else {
          setShowTodoRegisterModal(true);
        }
      }
    } catch (e) {
      setMessage('오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setMessage('');
    try {
      const coords = await getLocation();
      if (!coords) return;
      const res = await checkOut(coords.latitude, coords.longitude);

      if (res.status === 'outside_geofence') {
        // 범위 밖 → 시간 선택 모달
        if (res.request_status === 'pending') {
          setCheckoutRequestStatus('pending');
          setMessage(res.message);
        } else {
          setShowTimeModal(true);
        }
        return;
      }

      setMessage(res.message || '퇴실 완료!');
      if (res.status === 'success' || res.status === 'info') {
        setAttendance('checked_out');
        const now = new Date();
        setCheckOutAt(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
        cancelCheckoutReminder();
        // 퇴실 후 할 일 체크 → 목표 달성 순서로 모달
        getDailyTodos().then(r => {
          if (r.todos && r.todos.length > 0) {
            setCheckoutTodos(r.todos);
            setShowTodoCheckModal(true);
          } else if (todayGoal && !todayGoal.is_achieved) {
            setShowGoalAchieveModal(true);
          }
        }).catch(() => {
          if (todayGoal && !todayGoal.is_achieved) setShowGoalAchieveModal(true);
        });
      }
    } catch (e) {
      setMessage('오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTimeRequest = async () => {
    if (!selectedTime) {
      Alert.alert('시간 선택', '퇴실 시간을 선택해주세요.');
      return;
    }
    setSubmittingRequest(true);
    try {
      const res = await submitCheckoutRequest(selectedTime);
      setShowTimeModal(false);
      setSelectedTime(null);
      if (res.status === 'success') {
        setCheckoutRequestStatus('pending');
        setMessage(res.message);
      } else {
        setMessage(res.message || '신청 실패');
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleApprove = async (requestId, requesterName) => {
    try {
      const res = await approveCheckoutRequest(requestId);
      if (res.status === 'success') {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        Alert.alert('승인 완료', res.message);
      } else {
        Alert.alert('오류', res.message);
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      const res = await rejectCheckoutRequest(requestId);
      if (res.status === 'success') {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        Alert.alert('반려 완료', res.message);
      } else {
        Alert.alert('오류', res.message);
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleTestNotification = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요.');
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '안녕하세요 👋',
          body: '좋은 하루 되세요!',
          sound: 'default',
        },
        trigger: { type: 'timeInterval', seconds: 4 },
      });
      Alert.alert('알림 예약', '4초 후 알림이 옵니다. 지금 홈으로 내려주세요!');
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const scheduleMorningReminder = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'morning_reminder') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    // 월(2) ~ 금(6) 매일 9:50 알림
    for (const weekday of [2, 3, 4, 5, 6]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '출석 체크 잊지 마세요! 📋',
          body: '오늘도 랩실 출석 체크 해주세요.',
          sound: 'default',
          data: { type: 'morning_reminder' },
        },
        trigger: { type: 'weekly', weekday, hour: 9, minute: 50, repeats: true },
      });
    }
  };

  const handleAddTodoToRegister = () => {
    const content = todoRegisterInput.trim();
    if (!content) return;
    setTodoRegisterList(prev => [...prev, content]);
    setTodoRegisterInput('');
  };

  const handleSubmitTodoRegister = async () => {
    const newTodos = [];
    for (const content of todoRegisterList) {
      const res = await addDailyTodo(content).catch(() => null);
      if (res?.id) newTodos.push(res);
    }
    if (newTodos.length) setTodayTodos(prev => [...prev, ...newTodos]);
    setTodoRegisterList([]);
    setShowTodoRegisterModal(false);
  };

  const handleToggleCheckoutTodo = (id) => {
    setCheckoutTodos(prev => prev.map(t => t.id === id ? { ...t, is_checked: !t.is_checked } : t));
  };

  const handleSubmitCheckoutTodos = async () => {
    for (const todo of checkoutTodos) {
      await toggleDailyTodo(todo.id).catch(() => {});
    }
    setShowTodoCheckModal(false);
    if (todayGoal && !todayGoal.is_achieved) {
      setShowGoalAchieveModal(true);
    }
  };

  const handleSaveGoal = async () => {
    const content = goalInput.trim();
    if (!content) { setShowGoalModal(false); return; }
    setSavingGoal(true);
    try {
      const res = await saveDailyGoal(content);
      if (res.id) {
        setTodayGoal(res);
        getWeeklyAchievement().then(r => { if (r.days) setWeeklyAchievement(r); }).catch(() => {});
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    } finally {
      setSavingGoal(false);
      setGoalInput('');
      setShowGoalModal(false);
      setShowTodoRegisterModal(true);
    }
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setEditInput(todo.content);
  };

  const handleSaveEditTodo = async () => {
    if (!editInput.trim() || !editingTodo) return;
    const res = await updateDailyTodo(editingTodo.id, editInput.trim()).catch(() => null);
    if (res?.id) {
      setTodayTodos(prev => prev.map(t => t.id === res.id ? { ...t, content: res.content } : t));
    }
    setEditingTodo(null);
    setEditInput('');
  };

  const handleToggleAchieve = async () => {
    try {
      const res = await achieveDailyGoal();
      setTodayGoal(prev => ({ ...prev, is_achieved: res.is_achieved }));
      getWeeklyAchievement().then(r => { if (r.days) setWeeklyAchievement(r); }).catch(() => {});
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'name']);
    onLogout();
  };

  const handlePickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    try {
      const res = await uploadProfileImage(uri);
      if (res.profile_image) {
        setProfileImage(res.profile_image);
        Alert.alert('완료', '프로필 사진이 변경됐어요!');
      } else {
        Alert.alert('오류', res.error || '업로드 실패');
      }
    } catch (e) {
      Alert.alert('오류', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickProfileImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{name ? name.slice(0, 1) : '?'}</Text>
            </View>
          )}
          <View style={styles.avatarEdit}><Text style={styles.avatarEditText}>✎</Text></View>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{name}님, 안녕하세요 👋</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>출결 체크</Text>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>🔥 {stats.streak}일</Text>
            <Text style={styles.statLabel}>연속 출석</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.attendance_rate}%</Text>
            <Text style={styles.statLabel}>{stats.month}월 출석률</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.late_count}회</Text>
            <Text style={styles.statLabel}>지각</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.leave_count}회</Text>
            <Text style={styles.statLabel}>조퇴</Text>
          </View>
        </View>
      )}

      {attendance === 'none' && (
        <TouchableOpacity
          style={[styles.button, styles.checkInBtn, loading && styles.disabled]}
          onPress={handleCheckIn}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? '처리 중...' : '출석 체크인'}</Text>
        </TouchableOpacity>
      )}

      {attendance === 'checked_in' && checkoutRequestStatus !== 'pending' && (
        <TouchableOpacity
          style={[styles.button, styles.checkOutBtn, loading && styles.disabled]}
          onPress={handleCheckOut}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? '처리 중...' : '퇴실 체크아웃'}</Text>
        </TouchableOpacity>
      )}

      {attendance === 'checked_in' && checkoutRequestStatus === 'pending' && (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>퇴실 신청 대기 중...</Text>
          <Text style={styles.pendingSubText}>다른 팀원의 확인을 기다리고 있어요.</Text>
        </View>
      )}

      {(checkInAt || checkOutAt) && (
        <View style={styles.timeBox}>
          {checkInAt  && <Text style={styles.timeText}>입실  {checkInAt}</Text>}
          {checkOutAt && <Text style={styles.timeText}>퇴실  {checkOutAt}</Text>}
        </View>
      )}

      {attendance === 'checked_out' && (
        <View style={styles.doneBox}>
          <Text style={styles.doneText}>오늘 출결 완료!</Text>
        </View>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {/* 오늘 하루 목표 */}
      {todayGoal ? (
        <View style={styles.goalCard}>
          <View style={styles.goalCardHeader}>
            <Text style={styles.goalCardTitle}>🎯 오늘의 목표</Text>
            <TouchableOpacity onPress={handleToggleAchieve}>
              <Text style={todayGoal.is_achieved ? styles.achievedBadge : styles.unachievedBadge}>
                {todayGoal.is_achieved ? '✓ 달성!' : '미달성'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.goalContent}>{todayGoal.content}</Text>
        </View>
      ) : attendance === 'checked_in' ? (
        <TouchableOpacity style={styles.goalSetBtn} onPress={() => setShowGoalModal(true)}>
          <Text style={styles.goalSetBtnText}>+ 오늘 목표 등록하기</Text>
        </TouchableOpacity>
      ) : null}

      {/* 오늘 할일 목록 */}
      {todayTodos.length > 0 && (
        <View style={styles.goalCard}>
          <Text style={styles.goalCardTitle}>📋 오늘 할 일</Text>
          {todayTodos.map(todo => (
            <View key={todo.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <TouchableOpacity
                onPress={() => {
                  toggleDailyTodo(todo.id).catch(() => {});
                  setTodayTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_checked: !t.is_checked } : t));
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              >
                <View style={[styles.checkBox, todo.is_checked && styles.checkBoxDone]}>
                  {todo.is_checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[{ fontSize: 14, color: '#111', flex: 1 }, todo.is_checked && { textDecorationLine: 'line-through', color: '#9ca3af' }]}>
                  {todo.content}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEditTodo(todo)}>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>수정</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* 주간 달성률 */}
      {weeklyAchievement && (
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>이번 주 목표 달성률</Text>
          <Text style={styles.weeklyRate}>{weeklyAchievement.rate}%</Text>
          <Text style={styles.weeklySubText}>{weeklyAchievement.achieved}/{weeklyAchievement.total}개 달성</Text>
          <View style={styles.weeklyDays}>
            {weeklyAchievement.days.map(d => (
              <View key={d.date} style={styles.weeklyDayCell}>
                <View style={[
                  styles.weeklyDot,
                  d.is_achieved && styles.weeklyDotAchieved,
                  d.has_goal && !d.is_achieved && styles.weeklyDotPending,
                ]} />
                <Text style={styles.weeklyDayLabel}>{d.weekday}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 다른 사람 퇴실 승인 요청 */}
      {pendingRequests.length > 0 && (
        <View style={styles.approvalSection}>
          <Text style={styles.approvalTitle}>퇴실 확인 요청</Text>
          {pendingRequests.map(req => (
            <View key={req.id} style={styles.approvalCard}>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalName}>{req.name}</Text>
                <Text style={styles.approvalTime}>{req.requested_time} 퇴실 신청</Text>
              </View>
              <View style={styles.approvalBtns}>
                <TouchableOpacity
                  style={[styles.approvalBtn, styles.approveBtn]}
                  onPress={() => handleApprove(req.id, req.name)}
                >
                  <Text style={styles.approveBtnText}>승인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approvalBtn, styles.rejectBtn]}
                  onPress={() => handleReject(req.id)}
                >
                  <Text style={styles.rejectBtnText}>반려</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.testBtn} onPress={handleTestNotification}>
        <Text style={styles.testBtnText}>알림 테스트</Text>
      </TouchableOpacity>

      {/* 하루 목표 입력 모달 */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
              <Text style={styles.modalTitle}>오늘의 목표 🎯</Text>
              <Text style={styles.modalSub}>오늘 이루고 싶은 목표를 적어보세요.</Text>
              <TextInput
                style={styles.goalModalInput}
                value={goalInput}
                onChangeText={setGoalInput}
                placeholder="예) 논문 3페이지 읽기"
                maxLength={255}
                autoFocus
                onSubmitEditing={handleSaveGoal}
                returnKeyType="done"
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => { setShowGoalModal(false); setGoalInput(''); setShowTodoRegisterModal(true); }}
                >
                  <Text style={styles.modalCancelText}>건너뛰기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#2563eb' }, savingGoal && styles.disabled]}
                  onPress={handleSaveGoal}
                  disabled={savingGoal}
                >
                  <Text style={styles.modalSubmitText}>{savingGoal ? '저장 중...' : '등록하기'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 출첵 시 할 일 등록 모달 */}
      <Modal visible={showTodoRegisterModal} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
              <Text style={styles.modalTitle}>오늘 할 일 등록 📋</Text>
              <Text style={styles.modalSub}>오늘 해야 할 일을 미리 등록해두세요.</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  style={[styles.goalModalInput, { flex: 1, marginBottom: 0 }]}
                  value={todoRegisterInput}
                  onChangeText={setTodoRegisterInput}
                  placeholder="할 일 입력"
                  maxLength={255}
                  returnKeyType="done"
                  onSubmitEditing={handleAddTodoToRegister}
                />
                <TouchableOpacity
                  style={{ backgroundColor: '#2563eb', borderRadius: 10, padding: 12, justifyContent: 'center' }}
                  onPress={handleAddTodoToRegister}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
                </TouchableOpacity>
              </View>
              {todoRegisterList.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>• {item}</Text>
                  <TouchableOpacity onPress={() => setTodoRegisterList(prev => prev.filter((_, j) => j !== i))}>
                    <Text style={{ color: '#9ca3af', fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={[styles.modalBtns, { marginTop: 14 }]}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowTodoRegisterModal(false)}>
                  <Text style={styles.modalCancelText}>건너뛰기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#2563eb' }]}
                  onPress={handleSubmitTodoRegister}
                >
                  <Text style={styles.modalSubmitText}>등록하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 할일 수정 모달 */}
      <Modal visible={!!editingTodo} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
              <Text style={styles.modalTitle}>할 일 수정 ✏️</Text>
              <TextInput
                style={styles.goalModalInput}
                value={editInput}
                onChangeText={setEditInput}
                placeholder="할 일 내용"
                maxLength={255}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveEditTodo}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setEditingTodo(null); setEditInput(''); }}>
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#2563eb' }]} onPress={handleSaveEditTodo}>
                  <Text style={styles.modalSubmitText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 퇴실 시 할 일 체크 모달 */}
      <Modal visible={showTodoCheckModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
            <Text style={styles.modalTitle}>오늘 한 일 체크 ✅</Text>
            <Text style={styles.modalSub}>오늘 완료한 항목을 체크해주세요!</Text>
            {checkoutTodos.map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}
                onPress={() => handleToggleCheckoutTodo(todo.id)}
              >
                <View style={[styles.checkBox, todo.is_checked && styles.checkBoxDone]}>
                  {todo.is_checked && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[{ fontSize: 14, color: '#111', flex: 1 }, todo.is_checked && { textDecorationLine: 'line-through', color: '#9ca3af' }]}>
                  {todo.content}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.modalBtns, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowTodoCheckModal(false); if (todayGoal && !todayGoal.is_achieved) setShowGoalAchieveModal(true); }}>
                <Text style={styles.modalCancelText}>건너뛰기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#2563eb' }]} onPress={handleSubmitCheckoutTodos}>
                <Text style={styles.modalSubmitText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 퇴실 시 목표 달성 여부 모달 */}
      <Modal visible={showGoalAchieveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center' }]}>
            <Text style={styles.modalTitle}>오늘 목표 달성했나요? 🎯</Text>
            {todayGoal && <Text style={{ fontSize: 14, color: '#374151', marginBottom: 20, textAlign: 'center' }}>{todayGoal.content}</Text>}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { flex: 1 }]}
                onPress={() => setShowGoalAchieveModal(false)}
              >
                <Text style={styles.modalCancelText}>아직이요 😅</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { flex: 1, backgroundColor: '#16a34a' }]}
                onPress={async () => {
                  try {
                    const res = await achieveDailyGoal();
                    setTodayGoal(prev => ({ ...prev, is_achieved: res.is_achieved }));
                    getWeeklyAchievement().then(r => { if (r.days) setWeeklyAchievement(r); }).catch(() => {});
                  } catch (e) {}
                  setShowGoalAchieveModal(false);
                }}
              >
                <Text style={styles.modalSubmitText}>달성했어요! 🎉</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 시간 선택 모달 */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>퇴실을 까먹었나봐요 ㅎ</Text>
            <Text style={styles.modalSub}>몇시쯤 퇴실했어요?</Text>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeOption, selectedTime === t && styles.timeOptionSelected]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timeOptionText, selectedTime === t && styles.timeOptionTextSelected]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowTimeModal(false); setSelectedTime(null); }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingRequest && styles.disabled]}
                onPress={handleSubmitTimeRequest}
                disabled={submittingRequest}
              >
                <Text style={styles.modalSubmitText}>
                  {submittingRequest ? '신청 중...' : '신청하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  headerText: { flex: 1 },
  greeting: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
  },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: '#1d4ed8' },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
  },
  avatarEditText: { fontSize: 10, color: '#fff' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  checkInBtn: {
    backgroundColor: '#2563eb',
  },
  checkOutBtn: {
    backgroundColor: '#7c3aed',
  },
  disabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pendingBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#854d0e',
  },
  pendingSubText: {
    fontSize: 13,
    color: '#92400e',
    marginTop: 4,
  },
  doneBox: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#16a34a',
  },
  timeBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  timeText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  message: {
    marginTop: 24,
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    backgroundColor: '#e0f2fe',
    padding: 14,
    borderRadius: 8,
  },
  approvalSection: {
    marginTop: 32,
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  approvalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  approvalTime: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  approvalBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  approvalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: '#2563eb',
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#f3f4f6',
  },
  rejectBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  testBtn: {
    marginTop: 32,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  testBtnText: {
    fontSize: 13,
    color: '#6b7280',
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  achievedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  unachievedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  goalContent: {
    fontSize: 15,
    color: '#111827',
  },
  goalSetBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
  },
  goalSetBtnText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  weeklyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  weeklyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  weeklyRate: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563eb',
  },
  weeklySubText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  weeklyDays: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  weeklyDayCell: {
    alignItems: 'center',
    gap: 4,
  },
  weeklyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
  },
  weeklyDotAchieved: {
    backgroundColor: '#2563eb',
  },
  weeklyDotPending: {
    backgroundColor: '#fbbf24',
  },
  weeklyDayLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  goalModalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#111',
  },
  checkBox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  timeOptionSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
