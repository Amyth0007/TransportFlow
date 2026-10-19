import { useEffect, useState } from 'react';
import api, { type Driver } from '../lib/api';

const EMPTY_FORM = { name: '', phone: '', licenseNumber: '', password: '' };

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);

  async function load() {
    setListLoading(true);
    try {
      const res = await api.get<{ data: Driver[] }>('/drivers');
      setDrivers(res.data.data);
      setListError('');
    } catch {
      setListError('Could not load drivers');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(d: Driver) {
    setEditId(d._id);
    setForm({ name: d.name, phone: d.phone, licenseNumber: d.licenseNumber, password: '' });
    setTempPassword('');
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_FORM); setError(''); setTempPassword(''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setTempPassword('');
    try {
      if (editId) {
        await api.patch(`/drivers/${editId}`, {
          name: form.name,
          phone: form.phone,
          licenseNumber: form.licenseNumber
        });
        cancelEdit();
      } else {
        const payload = { name: form.name, phone: form.phone, licenseNumber: form.licenseNumber, password: form.password };
        await api.post<{ data: Driver }>('/drivers', payload);
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
      <div>
        <p className="tf-kicker">People</p>
        <h1 className="tf-title text-2xl mt-1">Drivers</h1>
      </div>
      {listError && <p className="text-sm text-coral">{listError}</p>}

      <form onSubmit={handleSubmit} className="tf-card p-5 space-y-3 max-w-lg">
        <h2 className="font-semibold text-sm text-sand">{editId ? 'Edit driver' : 'Add driver'}</h2>
        {error && <p className="text-sm text-coral">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Name *" required value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="tf-field col-span-2" />
          <input placeholder="Phone *" required value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="tf-field" />
          <input placeholder="License number *" required value={form.licenseNumber}
            onChange={e => setForm(f => ({ ...f, licenseNumber: e.target.value }))}
            className="tf-field" />
          {!editId && (
            <input placeholder="Password *" required type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="tf-field col-span-2" />
          )}
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
              {['Name', 'Phone', 'License', 'Status', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={5} className="text-center text-mute">Loading…</td></tr>
            )}
            {!listLoading && drivers.map(d => (
              <tr key={d._id}>
                <td className="text-sand">{d.name}</td>
                <td>{d.phone}</td>
                <td>{d.licenseNumber}</td>
                <td>
                  <span className={`tf-badge ${d.status === 'active' ? 'tf-badge-ok' : 'tf-badge-muted'}`}>
                    {d.status}
                  </span>
                </td>
                <td className="flex gap-3">
                  <button onClick={() => startEdit(d)} className="tf-link text-sm">Edit</button>
                  {d.status !== 'inactive' && (
                    <button onClick={() => deactivate(d._id)} className="text-coral text-sm hover:underline">Deactivate</button>
                  )}
                </td>
              </tr>
            ))}
            {!listLoading && drivers.length === 0 && (
              <tr><td colSpan={5} className="text-center text-mute">No drivers yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
