import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { type Trip, type Vehicle, type Driver, type Route } from '../lib/api';

const EMPTY_FORM = { routeId: '', vehicleId: '', driverId: '', scheduledAt: '' };

const STATUS_STYLE: Record<Trip['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [t, v, d, r] = await Promise.all([
      api.get<{ data: Trip[] }>('/trips'),
      api.get<{ data: Vehicle[] }>('/vehicles'),
      api.get<{ data: Driver[] }>('/drivers'),
      api.get<{ data: Route[] }>('/routes'),
    ]);
    setTrips(t.data.data);
    setVehicles(v.data.data.filter(x => x.status === 'active'));
    setDrivers(d.data.data.filter(x => x.status === 'active'));
    setRoutes(r.data.data);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Trips</h1>
        <button onClick={() => setShowForm(s => !s)}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New trip'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3 max-w-lg">
          <h2 className="font-semibold text-sm">Create trip</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <select required value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Select route *</option>
            {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <select required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Select vehicle *</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} — {v.type}</option>)}
          </select>
          <select required value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm">
            <option value="">Select driver *</option>
            {drivers.map(d => <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>)}
          </select>
          <input type="datetime-local" required value={form.scheduledAt}
            onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
            className="w-full border rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            Create
          </button>
        </form>
      )}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              {['Status', 'Scheduled', 'Route', 'Vehicle', 'Driver', ''].map(h => (
                <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trips.map(t => {
              const route = routes.find(r => r._id === t.routeId);
              const vehicle = vehicles.find(v => v._id === t.vehicleId) ??
                              { vehicleNumber: t.vehicleId.slice(-6) } as Vehicle;
              const driver = drivers.find(d => d._id === t.driverId) ??
                             { name: t.driverId.slice(-6) } as Driver;
              return (
                <tr key={t._id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">{new Date(t.scheduledAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{route?.name ?? '—'}</td>
                  <td className="px-4 py-3">{vehicle.vehicleNumber}</td>
                  <td className="px-4 py-3">{driver.name}</td>
                  <td className="px-4 py-3">
                    <Link to={`/trips/${t._id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No trips yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
