import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { type Trip, type Vehicle, type Driver, type Route } from '../lib/api';

const EMPTY_FORM = { routeId: '', vehicleId: '', driverId: '', scheduledDate: '', scheduledTime: '' };

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function nowLocalParts(d = new Date()) {
  return {
    scheduledDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    scheduledTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Build an ISO timestamp from date + time in the user's local timezone. */
function localPartsToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const withSeconds = time.length === 5 ? `${time}:00` : time;
  const parsed = new Date(`${date}T${withSeconds}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

const STATUS_CLASS: Record<Trip['status'], string> = {
  scheduled: 'tf-badge-warn',
  in_progress: 'tf-badge-live',
  completed: 'tf-badge-muted',
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);

  async function load() {
    setListLoading(true);
    try {
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
      setListError('');
    } catch {
      setListError('Could not load trips');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const scheduledAt = localPartsToIso(form.scheduledDate, form.scheduledTime);
    if (!scheduledAt) {
      setError('Enter a valid date and time');
      return;
    }
    try {
      await api.post('/trips', {
        routeId: form.routeId,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        scheduledAt,
      });
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
        <div>
          <p className="tf-kicker">Operations</p>
          <h1 className="tf-title text-2xl mt-1">Trips</h1>
        </div>
        <button onClick={() => {
          setShowForm(s => {
            if (s) {
              setForm(EMPTY_FORM);
              setError('');
              return false;
            }
            setForm({ ...EMPTY_FORM, ...nowLocalParts() });
            return true;
          });
        }} className="tf-btn tf-btn-primary">
          {showForm ? 'Cancel' : '+ New trip'}
        </button>
      </div>

      {listError && <p className="text-sm text-coral">{listError}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="tf-card p-5 space-y-3 max-w-lg">
          <h2 className="font-semibold text-sm text-sand">Create trip</h2>
          {error && <p className="text-sm text-coral">{error}</p>}
          <select required value={form.routeId} onChange={e => setForm(f => ({ ...f, routeId: e.target.value }))}
            className="tf-field">
            <option value="">Select route *</option>
            {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <select required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
            className="tf-field">
            <option value="">Select vehicle *</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.vehicleNumber} — {v.type}</option>)}
          </select>
          <select required value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
            className="tf-field">
            <option value="">Select driver *</option>
            {drivers.map(d => <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-mute">Date</span>
              <input
                type="date"
                required
                value={form.scheduledDate}
                onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                className="tf-field"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-mute">Time</span>
              <input
                type="time"
                required
                step={60}
                value={form.scheduledTime}
                onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                className="tf-field"
              />
            </label>
          </div>
          <p className="text-xs text-mute">Uses your local timezone. Shown on the trip list as local date and time.</p>
          <button type="submit" className="tf-btn tf-btn-primary">
            Create
          </button>
        </form>
      )}

      <div className="tf-card tf-table-wrap">
        <table>
          <thead>
            <tr>
              {['Status', 'Scheduled', 'Route', 'Vehicle', 'Driver', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={6} className="text-center text-mute">Loading…</td></tr>
            )}
            {!listLoading && trips.map(t => {
              const route = routes.find(r => r._id === t.routeId);
              const vehicle = vehicles.find(v => v._id === t.vehicleId) ??
                              { vehicleNumber: t.vehicleId.slice(-6) } as Vehicle;
              const driver = drivers.find(d => d._id === t.driverId) ??
                             { name: t.driverId.slice(-6) } as Driver;
              return (
                <tr key={t._id}>
                  <td>
                    <span className={`tf-badge ${STATUS_CLASS[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{new Date(t.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="text-sand">{route?.name ?? '—'}</td>
                  <td>{vehicle.vehicleNumber}</td>
                  <td>{driver.name}</td>
                  <td>
                    <Link to={`/trips/${t._id}`} className="tf-link">View</Link>
                  </td>
                </tr>
              );
            })}
            {!listLoading && trips.length === 0 && (
              <tr><td colSpan={6} className="text-center text-mute">No trips yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
