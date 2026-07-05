import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import type { Trip, Route, Vehicle, Driver } from '../lib/api';
import LiveMap from '../components/LiveMap';

// Uses plain axios (no auth header) — this page is intentionally unauthenticated
const publicApi = axios.create({ baseURL: '/api' });

export default function PublicTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await publicApi.get<{ data: Trip }>(`/public/trips/${token}`);
        const t = res.data.data;
        setTrip(t);

        const [r, v, d] = await Promise.all([
          publicApi.get<{ data: Route }>(`/routes/${t.routeId}`).catch(() => null),
          publicApi.get<{ data: Vehicle }>(`/vehicles/${t.vehicleId}`).catch(() => null),
          publicApi.get<{ data: Driver }>(`/drivers/${t.driverId}`).catch(() => null),
        ]);
        if (r) setRoute(r.data.data);
        if (v) setVehicle(v.data.data);
        if (d) setDriver(d.data.data);
      } catch {
        setNotFound(true);
      }
    }
    load();
  }, [token]);

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Tracking link not found or expired.</p>
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-400">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 space-y-4">
      <div className="bg-white rounded shadow p-4">
        <h1 className="font-bold text-lg">{route?.name ?? 'Live tracking'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {vehicle?.vehicleNumber && <span>{vehicle.vehicleNumber} · </span>}
          {driver?.name && <span>{driver.name} · </span>}
          <span className={`font-medium ${trip.status === 'in_progress' ? 'text-green-600' : 'text-gray-500'}`}>
            {trip.status.replace('_', ' ')}
          </span>
        </p>
      </div>

      <div className="bg-white rounded shadow" style={{ height: '480px' }}>
        <LiveMap trip={trip} route={route} live={trip.status === 'in_progress'} />
      </div>
    </div>
  );
}
