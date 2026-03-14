import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import Config from '../../constants/Config';
import { LogOut } from 'lucide-react-native';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [timer, setTimer] = useState('05:00');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${Config.API_BASE}/session`);
      if (response.data.rfid_uid) {
        setSession(response.data);
        updateTimer(response.data.last_scan_time);
      } else {
        router.replace('/');
      }
    } catch (error) {
      console.error('Fetch Session Error:', error);
    }
  };

  const updateTimer = (startTime) => {
    const elapsed = Math.floor(Date.now() / 1000 - startTime);
    const remaining = Math.max(0, 300 - elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    setTimer(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    if (remaining === 0) router.replace('/');
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${Config.API_BASE}/session/logout`);
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchSession();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userIdText}>{session.user_data.uid}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sessionStatus}>
        Active Session UID: <Text style={styles.uidCode}>{session.rfid_uid}</Text>
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>WALLET BALANCE</Text>
          <Text style={styles.statValue}>{session.user_data.balance}</Text>
          <Text style={styles.statSub}>Credits</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CARD STATUS</Text>
          <Text style={[styles.statValue, { color: session.user_data.status === 'active' ? '#22c55e' : '#ef4444' }]}>
            {session.user_data.status.toUpperCase()}
          </Text>
          <Text style={styles.statSub}>Secure</Text>
        </View>

        <View style={[styles.statCard, { width: '100%', marginTop: 15 }]}>
          <Text style={styles.statLabel}>SESSION TIME REMAINING</Text>
          <Text style={styles.statValue}>{timer}</Text>
          <Text style={styles.statSub}>Auto-lock soon</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  userIdText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 12,
  },
  sessionStatus: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 30,
  },
  uidCode: {
    color: '#6366f1',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#1e293b',
    width: '48%',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  statSub: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
});
