import { useEffect, useState } from 'react';
import api, { type Vehicle } from '../lib/api';

const EMPTY_FORM = { vehicleNumber: '', type: '', capacity: '', status: 'active' as Vehicle['status'] };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get<{ data: Vehicle[] }>('/vehicles');
    setVehicles(res.data.data);
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
      <h1 className="text-xl font-bold">Vehicles</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3 max-w-lg">
        <h2 className="font-semibold text-sm">{editId ? 'Edit vehicle' : 'Add vehicle'}</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Vehicle number *" required value={form.vehicleNumber}
            onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))}
            className="border rounded px-3 py-2 text-sm col-span-2" />
          <input placeholder="Type (bus, van…) *" required value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="border rounded px-3 py-2 text-sm" />
          <input placeholder="Capacity" type="number" value={form.capacity}
            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
            className="border rounded px-3 py-2 text-sm" />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Vehicle['status'] }))}
            className="border rounded px-3 py-2 text-sm col-span-2">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            {editId ? 'Save' : 'Add'}
          </button>
          {editId && <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded text-sm border hover:bg-gray-50">Cancel</button>}
        </div>
      </form>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              {['Number', 'Type', 'Capacity', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{v.vehicleNumber}</td>
                <td className="px-4 py-3">{v.type}</td>
                <td className="px-4 py-3">{v.capacity ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.status === 'active' ? 'bg-green-100 text-green-700' :
                    v.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'}`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => startEdit(v)} className="text-blue-600 hover:underline">Edit</button>
                  {v.status !== 'inactive' && (
                    <button onClick={() => deactivate(v._id)} className="text-red-500 hover:underline">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No vehicles yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
