import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  approveCheckoutRequest,
  checkIn,
  checkOut,
  getTodayStatus,
  listCheckoutRequests,
  rejectCheckoutRequest,
  submitCheckoutRequest,
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

  useEffect(() => {
    loadTodayStatus();
    loadPendingRequests();
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

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'name']);
    onLogout();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{name}님, 안녕하세요 👋</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>출결 체크</Text>

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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 32,
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
