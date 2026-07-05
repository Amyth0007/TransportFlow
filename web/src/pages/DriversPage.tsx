import { useEffect, useState } from 'react';
import api, { type Driver } from '../lib/api';

const EMPTY_FORM = { name: '', phone: '', licenseNumber: '' };

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await api.get<{ data: Driver[] }>('/drivers');
    setDrivers(res.data.data);
  }

  useEffect(() => { load(); }, []);

  function startEdit(d: Driver) {
    setEditId(d._id);
    setForm({ name: d.name, phone: d.phone, licenseNumber: d.licenseNumber });
    setTempPassword('');
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); setError(''); setTempPassword(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTempPassword('');
    try {
      if (editId) {
        await api.patch(`/drivers/${editId}`, form);
        cancelEdit();
      } else {
        const res = await api.post<{ data: Driver; tempPassword: string }>('/drivers', form);
        setTempPassword(res.data.tempPassword);
        setForm(EMPTY_FORM);
      }
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  }

  async function deactivate(id: string) {
    await api.delete(`/drivers/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Drivers</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3 max-w-lg">
        <h2 className="font-semibold text-sm">{editId ? 'Edit driver' : 'Add driver'}</h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {tempPassword && (
          <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
            <p className="font-medium">Driver created. Share this password — shown once only:</p>
            <p className="font-mono text-lg mt-1">{tempPassword}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name *" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="border rounded px-3 py-2 text-sm col-span-2" />
          <input placeholder="Phone *" required value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="border rounded px-3 py-2 text-sm" />
          <input placeholder="License number *" required value={form.licenseNumber}
            onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
            className="border rounded px-3 py-2 text-sm" />
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
              {['Name', 'Phone', 'License', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{d.name}</td>
                <td className="px-4 py-3">{d.phone}</td>
                <td className="px-4 py-3">{d.licenseNumber}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-3">
                  <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline">Edit</button>
                  {d.status !== 'inactive' && (
                    <button onClick={() => deactivate(d._id)} className="text-red-500 hover:underline">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No drivers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
