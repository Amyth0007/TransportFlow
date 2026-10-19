import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import RouteMap from '../components/RouteMap';
import api, { type DriverTripView } from '../lib/api';
import { getSocket } from '../lib/socket';
import { colors, radius } from '../lib/theme';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Trip'>;

const GPS_INTERVAL_MS = 5000;
const MAP_HEIGHT = 300;

export default function TripScreen({ navigation, route }: Props) {
  const tripId = route.params.tripId;
  const [trip, setTrip] = useState<DriverTripView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTripIdRef = useRef<string | null>(null);

  const stopGPS = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  }, []);

  const startGPS = useCallback((id: string) => {
    if (gpsIntervalRef.current) return;
    const socket = getSocket();
    socket.emit('trip:join', { tripId: id });

    gpsIntervalRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const timestamp = new Date(loc.timestamp).toISOString();
        socket.emit('location:update', {
          tripId: id,
          lat,
          lng,
          timestamp,
          speed: loc.coords.speed ?? undefined,
        });
        setTrip((prev) =>
          prev
            ? { ...prev, lastKnownLocation: { lat, lng, updatedAt: timestamp } }
            : prev
        );
      } catch {
        // Skip a missed ping
      }
    }, GPS_INTERVAL_MS);
  }, []);

  const resumeIfLive = useCallback(async (view: DriverTripView) => {
    if (view.status !== 'in_progress') return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission is required to keep sending GPS. Open the app and allow location.');
      return;
    }
    startGPS(view._id);
  }, [startGPS]);

  const loadTrip = useCallback(async () => {
    setError('');
    try {
      const res = await api.get<{ data: DriverTripView }>(`/trips/my/${tripId}`);
      const view = res.data.data;
      setTrip(view);
      activeTripIdRef.current = view._id;
      await resumeIfLive(view);
    } catch {
      setError('Failed to load trip');
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, resumeIfLive]);

  useEffect(() => {
    const socket = getSocket();

    function joinIfActive() {
      if (activeTripIdRef.current) {
        socket.emit('trip:join', { tripId: activeTripIdRef.current });
      }
    }

    socket.on('connect', joinIfActive);

    socket.on('trip:status_changed', ({ tripId: id, status }: { tripId: string; status: DriverTripView['status'] }) => {
      if (id !== activeTripIdRef.current) return;
      setTrip((prev) => (prev ? { ...prev, status } : prev));
      if (status === 'completed') {
        stopGPS();
        activeTripIdRef.current = null;
      }
    });

    socket.on('stop:reached_broadcast', ({ tripId: id, stopIndex }: { tripId: string; stopIndex: number }) => {
      if (id === activeTripIdRef.current) {
        setTrip((prev) => (prev ? { ...prev, currentStopIndex: stopIndex } : prev));
      }
    });

    socket.on('error', (msg: string) => {
      Alert.alert('Error', msg);
    });

    void loadTrip();

    return () => {
      socket.off('connect', joinIfActive);
      socket.off('trip:status_changed');
      socket.off('stop:reached_broadcast');
      socket.off('error');
      stopGPS();
    };
  }, [loadTrip, stopGPS]);

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
      if (err.response?.status === 409) {
        await loadTrip();
        return;
      }
      setError(err.response?.data?.error ?? 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnd() {
    if (!trip) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/trips/${trip._id}/end`);
      stopGPS();
      getSocket().emit('trip:leave', { tripId: trip._id });
      activeTripIdRef.current = null;
      setTrip((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to end trip');
    } finally {
      setActionLoading(false);
    }
  }

  function handleMarkStopReached(stopIndex: number) {
    if (!trip) return;
    getSocket().emit('stop:reached', { tripId: trip._id, stopIndex });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'left', 'right', 'bottom']}>
        <ActivityIndicator size="large" color={colors.cyan} />
      </SafeAreaView>
    );
  }

  const showMap = trip && (trip.status === 'scheduled' || trip.status === 'in_progress');

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>← Trips</Text>
        </TouchableOpacity>
        {trip ? (
          <View style={[styles.statusBadge, badgeBg(trip.status)]}>
            <Text style={[styles.statusText, { color: badgeFg(trip.status) }]}>
              {trip.status === 'in_progress' ? 'Live' : trip.status.replace('_', ' ')}
            </Text>
          </View>
        ) : <View />}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {showMap && trip && (
        <View style={[styles.mapContainer, { height: MAP_HEIGHT }]} collapsable={false}>
          <RouteMap
            stops={trip.route.stops}
            roadPath={trip.route.roadPath}
            currentStopIndex={trip.currentStopIndex}
            lastKnownLocation={trip.lastKnownLocation}
            tripId={trip._id}
            live={trip.status === 'in_progress'}
          />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!trip ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Trip not found</Text>
            <Text style={styles.emptySubtitle}>It may have been removed or is not assigned to you.</Text>
            <TouchableOpacity style={styles.ghostButton} onPress={() => navigation.goBack()}>
              <Text style={styles.ghostText}>Back to trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tripCard}>
            <Text style={styles.routeName}>{trip.route.name}</Text>
            <Text style={styles.meta}>{trip.vehicle.vehicleNumber}</Text>
            <Text style={styles.label}>Scheduled</Text>
            <Text style={styles.value}>{new Date(trip.scheduledAt).toLocaleString()}</Text>

            <View style={styles.stopsSection}>
              <Text style={styles.sectionTitle}>Stops</Text>
              {trip.route.stops.map((stop, idx) => {
                const isReached = idx <= trip.currentStopIndex;
                const canReach = trip.status === 'in_progress' && idx === trip.currentStopIndex + 1;

                return (
                  <View key={stop.order} style={styles.stopRow}>
                    <View style={[styles.stopBadgeNumber, isReached ? styles.stopReached : styles.stopPending]}>
                      <Text style={styles.stopBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.stopDetails}>
                      <Text style={[styles.stopLabel, isReached && styles.stopLabelReached]}>
                        {stop.label}
                      </Text>
                    </View>
                    {isReached ? (
                      <View style={styles.reachedBadge}>
                        <Text style={styles.reachedText}>Reached</Text>
                      </View>
                    ) : canReach ? (
                      <TouchableOpacity
                        style={styles.reachButton}
                        onPress={() => handleMarkStopReached(idx)}
                      >
                        <Text style={styles.reachButtonText}>Arrived</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.pendingText}>Pending</Text>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              {trip.status === 'scheduled' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => void handleStart()}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator color={colors.ink} />
                    : <Text style={styles.startButtonText}>Start trip</Text>}
                </TouchableOpacity>
              )}
              {trip.status === 'in_progress' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.endButton]}
                  onPress={() => void handleEnd()}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator color={colors.sand} />
                    : <Text style={styles.endButtonText}>End trip</Text>}
                </TouchableOpacity>
              )}
              {trip.status === 'completed' && (
                <Text style={styles.completedText}>Trip completed. GPS has stopped.</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function badgeBg(status: DriverTripView['status']) {
  if (status === 'in_progress') return { backgroundColor: 'rgba(46,230,214,0.16)' };
  if (status === 'scheduled') return { backgroundColor: 'rgba(240,180,41,0.16)' };
  return { backgroundColor: 'rgba(122,154,160,0.16)' };
}

function badgeFg(status: DriverTripView['status']) {
  if (status === 'in_progress') return colors.cyan;
  if (status === 'scheduled') return colors.amber;
  return colors.mute;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  back: { color: colors.cyan, fontSize: 15, fontWeight: '600' },
  statusBadge: { borderRadius: radius.badge, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  error: { color: colors.coral, fontSize: 13, marginHorizontal: 20, marginBottom: 8 },
  mapContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  emptyTitle: { color: colors.sand, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: colors.mute, fontSize: 13, textAlign: 'center', marginBottom: 16 },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  ghostText: { fontSize: 14, color: colors.fog },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
  },
  routeName: { color: colors.sand, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.fog, fontSize: 14, marginTop: 4 },
  label: { fontSize: 11, color: colors.mute, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14 },
  value: { fontSize: 15, color: colors.sand, marginTop: 2 },
  actions: { marginTop: 24 },
  actionButton: { borderRadius: radius.control, paddingVertical: 14, alignItems: 'center' },
  startButton: { backgroundColor: colors.cyan },
  startButtonText: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  endButton: { backgroundColor: colors.coral },
  endButtonText: { color: colors.sand, fontWeight: '700', fontSize: 16 },
  completedText: { textAlign: 'center', color: colors.mute, fontSize: 15 },
  stopsSection: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.sand, marginBottom: 12 },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.surface2,
    padding: 10,
    borderRadius: radius.control,
  },
  stopBadgeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stopReached: { backgroundColor: colors.mint },
  stopPending: { backgroundColor: colors.cyanDim },
  stopBadgeText: { color: colors.ink, fontSize: 12, fontWeight: 'bold' },
  stopDetails: { flex: 1 },
  stopLabel: { fontSize: 14, color: colors.fog },
  stopLabelReached: { color: colors.mute, textDecorationLine: 'line-through' },
  reachedBadge: {
    backgroundColor: 'rgba(61,220,151,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reachedText: { color: colors.mint, fontSize: 12, fontWeight: '600' },
  reachButton: {
    backgroundColor: colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reachButtonText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  pendingText: { color: colors.mute, fontSize: 12 },
});
