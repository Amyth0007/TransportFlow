import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { type DriverTripView } from '../lib/api';
import { logout, type DriverInfo } from '../lib/auth';
import { colors, radius } from '../lib/theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'> & {
  driver: DriverInfo;
  onLogoutSuccess: () => void;
};

const STATUS_STYLE: Record<DriverTripView['status'], { bg: string; fg: string; label: string }> = {
  in_progress: { bg: 'rgba(46,230,214,0.16)', fg: colors.cyan, label: 'Live' },
  scheduled: { bg: 'rgba(240,180,41,0.16)', fg: colors.amber, label: 'Scheduled' },
  completed: { bg: 'rgba(122,154,160,0.16)', fg: colors.mute, label: 'Completed' },
};

export default function HomeScreen({ navigation, driver, onLogoutSuccess }: Props) {
  const [trips, setTrips] = useState<DriverTripView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const autoOpenedRef = useRef(false);

  const loadTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const res = await api.get<{ data: DriverTripView[] }>('/trips/my');
      const list = res.data.data;
      setTrips(list);
      const live = list.find((t) => t.status === 'in_progress');
      if (live && !autoOpenedRef.current) {
        autoOpenedRef.current = true;
        navigation.navigate('Trip', { tripId: live._id });
      }
    } catch {
      setError('Could not load trips. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void loadTrips();
    });
    return unsub;
  }, [navigation, loadTrips]);

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onLogoutSuccess();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>TODAY</Text>
          <Text style={styles.greeting}>Hi, {driver.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} hitSlop={12}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        contentContainerStyle={trips.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadTrips(true)}
            tintColor={colors.cyan}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No trip assigned</Text>
            <Text style={styles.emptySubtitle}>
              Ask your manager to assign a trip, then pull down to refresh.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = STATUS_STYLE[item.status];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Trip', { tripId: item._id })}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Text style={styles.routeName}>{item.route.name}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{item.vehicle.vehicleNumber}</Text>
              <Text style={styles.meta}>
                {new Date(item.scheduledAt).toLocaleString()}
              </Text>
              <Text style={styles.stopsHint}>
                {item.route.stops.length} stop{item.route.stops.length === 1 ? '' : 's'}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  kicker: { color: colors.cyan, fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
  greeting: { color: colors.sand, fontSize: 22, fontWeight: '800' },
  logoutText: { color: colors.mute, fontSize: 14 },
  error: { color: colors.coral, fontSize: 13, marginHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  routeName: { color: colors.sand, fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { borderRadius: radius.badge, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  meta: { color: colors.fog, fontSize: 13, marginTop: 6 },
  stopsHint: { color: colors.mute, fontSize: 12, marginTop: 8 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { color: colors.sand, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: colors.mute, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
