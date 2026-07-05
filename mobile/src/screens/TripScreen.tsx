import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { type TripDoc } from '../lib/api';
import { logout, type DriverInfo } from '../lib/auth';
import { getSocket } from '../lib/socket';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Trip'> & { driver: DriverInfo };

const GPS_INTERVAL_MS = 5000;

export default function TripScreen({ navigation, driver }: Props) {
  const [trip, setTrip] = useState<TripDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTripIdRef = useRef<string | null>(null);

  // ── Load today's trip for this driver ─────────────────────────────────────
  const loadTrip = useCallback(async () => {
    try {
      const res = await api.get<{ data: TripDoc[] }>('/trips');
      const trips: TripDoc[] = res.data.data;
      // Find the most recent non-completed trip assigned to this driver
      const active = trips.find(
        t => t.driverId === driver._id && t.status !== 'completed'
      ) ?? null;
      setTrip(active);
      activeTripIdRef.current = active?._id ?? null;
    } catch {
      setError('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [driver._id]);

  // ── Socket setup + reconnect handling ─────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    function joinIfActive() {
      if (activeTripIdRef.current) {
        socket.emit('trip:join', { tripId: activeTripIdRef.current });
      }
    }

    // Re-join room on reconnect (handles mid-trip disconnects)
    socket.on('connect', joinIfActive);

    // Listen for status changes pushed from server
    socket.on('trip:status_changed', ({ tripId, status }: { tripId: string; status: TripDoc['status'] }) => {
      if (tripId === activeTripIdRef.current) {
        setTrip(prev => prev ? { ...prev, status } : prev);
      }
    });

    loadTrip();

    return () => {
      socket.off('connect', joinIfActive);
      socket.off('trip:status_changed');
    };
  }, [loadTrip]);

  // ── GPS loop ───────────────────────────────────────────────────────────────
  function startGPS(tripId: string) {
    if (gpsIntervalRef.current) return;
    const socket = getSocket();
    socket.emit('trip:join', { tripId });

    gpsIntervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        socket.emit('location:update', {
          tripId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date(loc.timestamp).toISOString(),
          speed: loc.coords.speed ?? undefined,
        });
      } catch {
        // Silently skip a missed ping — same policy as the server handler
      }
    }, GPS_INTERVAL_MS);
  }

  function stopGPS() {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  }

  // Stop GPS if component unmounts mid-trip
  useEffect(() => () => stopGPS(), []);

  // ── Start trip ─────────────────────────────────────────────────────────────
  async function handleStart() {
    if (!trip) return;
    setActionLoading(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to start a trip');
        return;
      }
      await api.patch(`/trips/${trip._id}/start`);
      const updated = { ...trip, status: 'in_progress' as const };
      setTrip(updated);
      activeTripIdRef.current = trip._id;
      startGPS(trip._id);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  }

  // ── End trip ───────────────────────────────────────────────────────────────
  async function handleEnd() {
    if (!trip) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/trips/${trip._id}/end`);
      stopGPS();
      const socket = getSocket();
      socket.emit('trip:status_changed', { tripId: trip._id, status: 'completed' });
      socket.emit('trip:leave', { tripId: trip._id });
      activeTripIdRef.current = null;
      setTrip(prev => prev ? { ...prev, status: 'completed' } : prev);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to end trip');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive', onPress: async () => {
          stopGPS();
          await logout();
          navigation.replace('Login');
        },
      },
    ]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {driver.name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!trip ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trip assigned</Text>
          <Text style={styles.emptySubtitle}>Ask your manager to assign a trip, then pull down to refresh.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadTrip}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tripCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, STATUS_COLORS[trip.status]]}>
              <Text style={styles.statusText}>{trip.status.replace('_', ' ')}</Text>
            </View>
          </View>

          <Text style={styles.label}>Scheduled</Text>
          <Text style={styles.value}>{new Date(trip.scheduledAt).toLocaleString()}</Text>

          {trip.lastKnownLocation && (
            <>
              <Text style={styles.label}>Last location</Text>
              <Text style={styles.value}>
                {trip.lastKnownLocation.lat.toFixed(5)}, {trip.lastKnownLocation.lng.toFixed(5)}
              </Text>
            </>
          )}

          <View style={styles.actions}>
            {trip.status === 'scheduled' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={handleStart}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionButtonText}>Start Trip</Text>}
              </TouchableOpacity>
            )}
            {trip.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.endButton]}
                onPress={handleEnd}
                disabled={actionLoading}
              >
                {actionLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.actionButtonText}>End Trip</Text>}
              </TouchableOpacity>
            )}
            {trip.status === 'completed' && (
              <Text style={styles.completedText}>Trip completed</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const STATUS_COLORS: Record<TripDoc['status'], object> = {
  scheduled: { backgroundColor: '#dbeafe' },
  in_progress: { backgroundColor: '#dcfce7' },
  completed: { backgroundColor: '#f3f4f6' },
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: '#f3f4f6', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 18, fontWeight: '700' },
  logoutText: { color: '#6b7280', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  refreshButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
  refreshText: { fontSize: 14, color: '#374151' },
  tripCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 1 },
  statusRow: { marginBottom: 16 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  label: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12 },
  value: { fontSize: 15, color: '#111827', marginTop: 2 },
  actions: { marginTop: 24 },
  actionButton: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  startButton: { backgroundColor: '#16a34a' },
  endButton: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  completedText: { textAlign: 'center', color: '#6b7280', fontSize: 15 },
});
