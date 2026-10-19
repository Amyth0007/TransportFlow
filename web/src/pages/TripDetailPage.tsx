import { useEffect, useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import api, { type Trip, type Route, type Vehicle, type Driver } from '../lib/api';
import { getSocket } from '../lib/socket';
import { HAS_MAPS_API_KEY } from '../lib/routeMapTypes';

const RouteMap = lazy(() => import('../components/RouteMap'));

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState('');

  async function loadTrip() {
    setLoadError('');
    try {
      const res = await api.get<{ data: Trip }>(`/trips/${id}`);
      const t = res.data.data;
      setTrip(t);
      const [r, v, d] = await Promise.all([
        api.get<{ data: Route }>(`/routes/${t.routeId}`).catch(() => null),
        api.get<{ data: Vehicle }>(`/vehicles/${t.vehicleId}`).catch(() => null),
        api.get<{ data: Driver }>(`/drivers/${t.driverId}`).catch(() => null),
      ]);
      if (r) setRoute(r.data.data);
      if (v) setVehicle(v.data.data);
      if (d) setDriver(d.data.data);
    } catch {
      setTrip(null);
      setLoadError('Could not load this trip');
    }
  }

  useEffect(() => { loadTrip(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!trip || trip.status !== 'in_progress') return;

    const socket = getSocket();
    socket.emit('trip:join', { tripId: trip._id });

    socket.on('location:broadcast', (payload: { tripId: string; lat: number; lng: number; timestamp: string }) => {
      if (payload.tripId !== trip._id) return;
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              lastKnownLocation: {
                lat: payload.lat,
                lng: payload.lng,
                updatedAt: payload.timestamp,
              },
            }
          : null
      );
    });

    socket.on('stop:reached_broadcast', (payload: { tripId: string; stopIndex: number }) => {
      if (payload.tripId === trip._id) {
        setTrip(prev => prev ? { ...prev, currentStopIndex: payload.stopIndex } : null);
      }
    });

    socket.on('trip:status_changed', (payload: { tripId: string; status: Trip['status'] }) => {
      if (payload.tripId === trip._id) {
        setTrip(prev => prev ? { ...prev, status: payload.status } : null);
      }
    });

    return () => {
      socket.emit('trip:leave', { tripId: trip._id });
      socket.off('location:broadcast');
      socket.off('stop:reached_broadcast');
      socket.off('trip:status_changed');
    };
  }, [trip?._id, trip?.status]);

  async function startTrip() {
    setActionError('');
    try {
      await api.patch(`/trips/${id}/start`);
      loadTrip();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? 'Failed to start trip');
    }
  }

  async function endTrip() {
    setActionError('');
    try {
      await api.patch(`/trips/${id}/end`);
      loadTrip();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? 'Failed to end trip');
    }
  }

  function copyLink() {
    if (!trip) return;
    const url = `${window.location.origin}/track/${trip.publicTrackingToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loadError) return <p className="text-coral text-sm">{loadError}</p>;
  if (!trip) return <p className="text-mute">Loading…</p>;

  const trackingUrl = `${window.location.origin}/track/${trip.publicTrackingToken}`;
  const lastKnownLocation = trip.lastKnownLocation
    ? { lat: trip.lastKnownLocation.lat, lng: trip.lastKnownLocation.lng }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="tf-kicker">Live trip</p>
          <h1 className="tf-title text-2xl mt-1">{route?.name ?? 'Trip'}</h1>
          <p className="text-sm text-mute mt-0.5">
            {vehicle?.vehicleNumber} · {driver?.name} · {new Date(trip.scheduledAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {actionError && <p className="text-sm text-coral">{actionError}</p>}
          {trip.status === 'scheduled' && (
            <button onClick={startTrip} className="tf-btn tf-btn-primary">
              Start trip
            </button>
          )}
          {trip.status === 'in_progress' && (
            <button onClick={endTrip} className="tf-btn tf-btn-danger">
              End trip
            </button>
          )}
          <button onClick={copyLink} className="tf-btn tf-btn-ghost">
            {copied ? 'Copied!' : 'Copy tracking link'}
          </button>
        </div>
      </div>

      <div className="text-xs text-mute break-all">{trackingUrl}</div>

      {!HAS_MAPS_API_KEY && (
        <p className="text-sm text-amber tf-card px-3 py-2">
          MAPS_API_KEY is not set in web/.env — the map will not load. Live location still updates in the list below when the driver is streaming GPS.
        </p>
      )}

      <div className="tf-map-frame" style={{ height: '480px' }}>
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-sm text-mute">Loading map…</div>}>
          <RouteMap
            stops={route?.stops ?? []}
            roadPath={route?.roadPath}
            currentStopIndex={trip.currentStopIndex}
            lastKnownLocation={lastKnownLocation}
            tripId={trip._id}
            live={trip.status === 'in_progress'}
          />
        </Suspense>
      </div>

      {route && (
        <div className="tf-card p-4">
          <p className="text-sm font-medium mb-2 text-sand">Stops</p>
          <ol className="space-y-2">
            {route.stops.map((s, idx) => {
              const isReached = idx <= trip.currentStopIndex;
              return (
                <li key={s.order} className="flex items-center text-sm gap-2">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                    isReached ? 'bg-mint text-ink' : 'bg-cyan text-ink'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={isReached ? 'text-sand font-medium' : 'text-mute'}>
                    {s.label}
                  </span>
                  <span className="text-mute">({s.lat}, {s.lng})</span>
                  {isReached && <span className="tf-badge tf-badge-ok">Reached</span>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
