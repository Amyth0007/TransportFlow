import { useEffect, useState } from 'react';
import api, { type Vehicle } from '../lib/api';

const EMPTY_FORM = { vehicleNumber: '', type: '', capacity: '', status: 'active' as Vehicle['status'] };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);

  async function load() {
    setListLoading(true);
    try {
      const res = await api.get<{ data: Vehicle[] }>('/vehicles');
      setVehicles(res.data.data);
      setListError('');
    } catch {
      setListError('Could not load vehicles');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(v: Vehicle) {
    setEditId(v._id);
    setForm({ vehicleNumber: v.vehicleNumber, type: v.type, capacity: String(v.capacity ?? ''), status: v.status });
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); setError(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = { ...form, capacity: form.capacity !== '' ? Number(form.capacity) : null };
    try {
      if (editId) {
        await api.patch(`/vehicles/${editId}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      cancelEdit();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  }

  async function deactivate(id: string) {
    await api.delete(`/vehicles/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="tf-kicker">Fleet</p>
        <h1 className="tf-title text-2xl mt-1">Vehicles</h1>
      </div>
      {listError && <p className="text-sm text-coral">{listError}</p>}

      <form onSubmit={handleSubmit} className="tf-card p-5 space-y-3 max-w-lg">
        <h2 className="font-semibold text-sm text-sand">{editId ? 'Edit vehicle' : 'Add vehicle'}</h2>
        {error && <p className="text-sm text-coral">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Vehicle number *" required value={form.vehicleNumber}
            onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))}
            className="tf-field col-span-2" />
          <input placeholder="Type (bus, van…) *" required value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="tf-field" />
          <input placeholder="Capacity" type="number" value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
            className="tf-field" />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Vehicle['status'] }))}
            className="tf-field col-span-2">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="tf-btn tf-btn-primary">
            {editId ? 'Save' : 'Add'}
          </button>
          {editId && <button type="button" onClick={cancelEdit} className="tf-btn tf-btn-ghost">Cancel</button>}
        </div>
      </form>

      <div className="tf-card tf-table-wrap">
        <table>
          <thead>
            <tr>
              {['Number', 'Type', 'Capacity', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={5} className="text-center text-mute">Loading…</td></tr>
            )}
            {!listLoading && vehicles.map(v => (
              <tr key={v._id}>
                <td className="text-sand">{v.vehicleNumber}</td>
                <td>{v.type}</td>
                <td>{v.capacity ?? '—'}</td>
                <td>
                  <span className={`tf-badge ${
                    v.status === 'active' ? 'tf-badge-ok' :
                    v.status === 'maintenance' ? 'tf-badge-warn' :
                    'tf-badge-muted'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="flex gap-3">
                  <button onClick={() => startEdit(v)} className="tf-link text-sm">Edit</button>
                  {v.status !== 'inactive' && (
                    <button onClick={() => deactivate(v._id)} className="text-coral text-sm hover:underline">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {!listLoading && vehicles.length === 0 && (
              <tr><td colSpan={5} className="text-center text-mute">No vehicles yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
