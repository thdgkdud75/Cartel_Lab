import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AttendanceScreen from './src/screens/AttendanceScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['token', 'name']).then(([[, t], [, n]]) => {
      if (t) { setToken(t); setName(n || ''); }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!token) {
    return (
      <LoginScreen
        onLogin={(t, n) => { setToken(t); setName(n); }}
      />
    );
  }

  return (
    <AttendanceScreen
      name={name}
      onLogout={() => { setToken(null); setName(''); }}
    />
  );
}
