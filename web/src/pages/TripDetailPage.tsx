import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { type Trip, type Route, type Vehicle, type Driver } from '../lib/api';
import LiveMap from '../components/LiveMap';

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState('');

  async function loadTrip() {
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
  }

  useEffect(() => { loadTrip(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!trip) return <p className="text-gray-400">Loading…</p>;

  const trackingUrl = `${window.location.origin}/track/${trip.publicTrackingToken}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{route?.name ?? 'Trip'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {vehicle?.vehicleNumber} · {driver?.name} · {new Date(trip.scheduledAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          {trip.status === 'scheduled' && (
            <button onClick={startTrip}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
              Start trip
            </button>
          )}
          {trip.status === 'in_progress' && (
            <button onClick={endTrip}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
              End trip
            </button>
          )}
          <button onClick={copyLink}
            className="border px-4 py-2 rounded text-sm hover:bg-gray-50">
            {copied ? 'Copied!' : 'Copy tracking link'}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 break-all">{trackingUrl}</div>

      <div className="bg-white rounded shadow" style={{ height: '480px' }}>
        <LiveMap trip={trip} route={route} live={trip.status === 'in_progress'} />
      </div>

      {route && (
        <div className="bg-white rounded shadow p-4">
          <p className="text-sm font-medium mb-2">Stops</p>
          <ol className="space-y-1">
            {route.stops.map(s => (
              <li key={s.order} className="text-sm text-gray-600">
                {s.order}. {s.label} <span className="text-gray-400">({s.lat}, {s.lng})</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
