import { useEffect, useState } from 'react';
import api, { type Route, type Stop } from '../lib/api';

const emptyStop = (): Stop => ({ order: 1, label: '', lat: 0, lng: 0 });

function emptyForm() {
  return { name: '', stops: [emptyStop()] };
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get<{ data: Route[] }>('/routes');
    setRoutes(res.data.data);
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: Route) {
    setEditId(r._id);
    setForm({ name: r.name, stops: r.stops.map(s => ({ ...s })) });
  }

  function cancelEdit() { setEditId(null); setForm(emptyForm()); setError(''); }

  function setStop(i: number, field: keyof Stop, value: string) {
    setForm(f => {
      const stops = f.stops.map((s, idx) =>
        idx === i ? { ...s, [field]: field === 'label' ? value : Number(value) } : s
      );
      return { ...f, stops };
    });
  }

  function addStop() {
    setForm(f => ({
      ...f,
      stops: [...f.stops, { ...emptyStop(), order: f.stops.length + 1 }],
    }));
  }

  function removeStop(i: number) {
    setForm(f => ({
      ...f,
      stops: f.stops.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await api.patch(`/routes/${editId}`, form);
      } else {
        await api.post('/routes', form);
      }
      cancelEdit();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  }

  async function deleteRoute(id: string) {
    try {
      await api.delete(`/routes/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Cannot delete route');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Routes</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3 max-w-2xl">
        <h2 className="font-semibold text-sm">{editId ? 'Edit route' : 'Add route'}</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input placeholder="Route name *" required value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm" />

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stops</p>
          {form.stops.map((stop, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-1 text-xs text-gray-400 text-center">{i + 1}</span>
              <input placeholder="Label *" required value={stop.label}
                onChange={e => setStop(i, 'label', e.target.value)}
                className="col-span-4 border rounded px-2 py-1.5 text-sm" />
              <input placeholder="Lat *" required type="number" step="any" value={stop.lat || ''}
                onChange={e => setStop(i, 'lat', e.target.value)}
                className="col-span-3 border rounded px-2 py-1.5 text-sm" />
              <input placeholder="Lng *" required type="number" step="any" value={stop.lng || ''}
                onChange={e => setStop(i, 'lng', e.target.value)}
                className="col-span-3 border rounded px-2 py-1.5 text-sm" />
              {form.stops.length > 1 && (
                <button type="button" onClick={() => removeStop(i)}
                  className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStop}
            className="text-sm text-blue-600 hover:underline">+ Add stop</button>
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
              {['Name', 'Stops', ''].map(h => (
                <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map(r => (
              <tr key={r._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3">{r.stops.length}</td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => deleteRoute(r._id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {routes.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No routes yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
