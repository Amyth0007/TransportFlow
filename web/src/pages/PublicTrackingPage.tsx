import { useEffect, useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getSocket } from '../lib/socket';
import { HAS_MAPS_API_KEY } from '../lib/routeMapTypes';

const RouteMap = lazy(() => import('../components/RouteMap'));

const publicApi = axios.create({ baseURL: '/api' });

interface PublicTripView {
  _id: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  lastKnownLocation: { lat: number; lng: number; updatedAt: string } | null;
  currentStopIndex: number;
  route: {
    name: string;
    stops: { order: number; label: string; lat: number; lng: number }[];
    roadPath: { lat: number; lng: number }[] | null;
  };
  vehicle: { vehicleNumber: string };
  driver: { name: string };
}

export default function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<PublicTripView | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await publicApi.get<{ data: PublicTripView }>(`/public/trips/${token}`);
        setView(res.data.data);
      } catch {
        setNotFound(true);
      }
    }
    load();
  }, [token]);

  // Realtime updates — same socket room as admin TripDetailPage
  useEffect(() => {
    if (!view || view.status !== 'in_progress') return;

    const socket = getSocket();
    socket.emit('trip:join', { tripId: view._id });

    socket.on(
      'location:broadcast',
      (payload: { tripId: string; lat: number; lng: number; timestamp: string }) => {
        if (payload.tripId !== view._id) return;
        setView((prev) =>
          prev
            ? {
                ...prev,
                lastKnownLocation: {
                  lat: payload.lat,
                  lng: payload.lng,
                  updatedAt: payload.timestamp,
                },
              }
            : prev
        );
      }
    );

    socket.on('stop:reached_broadcast', (payload: { tripId: string; stopIndex: number }) => {
      if (payload.tripId === view._id) {
        setView((prev) => (prev ? { ...prev, currentStopIndex: payload.stopIndex } : prev));
      }
    });

    socket.on('trip:status_changed', (payload: { tripId: string; status: PublicTripView['status'] }) => {
      if (payload.tripId === view._id) {
        setView((prev) => (prev ? { ...prev, status: payload.status } : prev));
      }
    });

    return () => {
      socket.emit('trip:leave', { tripId: view._id });
      socket.off('location:broadcast');
      socket.off('stop:reached_broadcast');
      socket.off('trip:status_changed');
    };
  }, [view?._id, view?.status]);

  if (notFound) {
    return (
      <div className="tf-shell min-h-screen flex items-center justify-center">
        <p className="text-mute">Tracking link not found or expired.</p>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="tf-shell min-h-screen flex items-center justify-center">
        <p className="text-mute">Loading…</p>
      </div>
    );
  }

  const lastKnownLocation = view.lastKnownLocation
    ? { lat: view.lastKnownLocation.lat, lng: view.lastKnownLocation.lng }
    : null;

  const isLive = view.status === 'in_progress';

  return (
    <div className="tf-shell min-h-screen p-4 space-y-4">
      <div className="tf-card p-4 tf-enter">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tf-kicker">Public track</p>
            <h1 className="tf-title text-xl mt-1">{view.route.name}</h1>
            <p className="text-sm text-mute mt-0.5">
              {view.vehicle.vehicleNumber} · {view.driver.name}
            </p>
          </div>
          <span className={`tf-badge shrink-0 ${isLive ? 'tf-badge-live' : 'tf-badge-muted'}`}>
            {isLive ? 'Live' : view.status.replace('_', ' ')}
          </span>
        </div>
        {!isLive && view.status === 'scheduled' && (
          <p className="text-xs text-mute mt-2">Tracking will begin when the driver starts the trip.</p>
        )}
        {view.status === 'completed' && (
          <p className="text-xs text-mute mt-2">This trip has ended.</p>
        )}
      </div>

      {!HAS_MAPS_API_KEY && (
        <p className="text-sm text-amber tf-card px-3 py-2">
          MAPS_API_KEY is not set — the map will not load. Trip status still updates live.
        </p>
      )}

      <div className="tf-map-frame" style={{ height: '480px' }}>
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center text-sm text-mute">
              Loading map…
            </div>
          }
        >
          <RouteMap
            stops={view.route.stops}
            roadPath={view.route.roadPath}
            currentStopIndex={view.currentStopIndex}
            lastKnownLocation={lastKnownLocation}
            tripId={view._id}
            live={isLive}
          />
        </Suspense>
      </div>

      <div className="tf-card p-4">
        <p className="text-sm font-medium mb-2 text-sand">Stops</p>
        <ol className="space-y-2">
          {view.route.stops.map((s, idx) => {
            const isReached = idx <= view.currentStopIndex;
            return (
              <li key={s.order} className="flex items-center text-sm gap-2">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                    isReached ? 'bg-mint text-ink' : 'bg-cyan text-ink'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className={isReached ? 'text-sand font-medium' : 'text-mute'}>
                  {s.label}
                </span>
                {isReached && <span className="tf-badge tf-badge-ok">Reached</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
