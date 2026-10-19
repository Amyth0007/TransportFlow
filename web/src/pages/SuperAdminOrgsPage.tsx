import { useEffect, useState } from 'react';
import api, { type Organization } from '../lib/api';

const ORG_TYPES = ['generic', 'gas', 'school', 'corporate'] as const;

const EMPTY_FORM = {
  name: '',
  orgType: 'generic' as Organization['orgType'],
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export default function SuperAdminOrgsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  async function load() {
    setListLoading(true);
    try {
      const res = await api.get<{ data: Organization[] }>('/admin/orgs');
      setOrgs(res.data.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Could not load organizations');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.post<{ data: { org: Organization; admin: { email: string } } }>(
        '/admin/orgs',
        form
      );
      setSuccess(`Created "${res.data.data.org.name}" — admin: ${res.data.data.admin.email}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(id: string, name: string) {
    if (!confirm(`Disable "${name}"? Org admins will lose access.`)) return;
    setError('');
    try {
      await api.patch(`/admin/orgs/${id}/disable`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to disable organization');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="tf-kicker">Tenants</p>
          <h1 className="tf-title text-2xl mt-1">Organizations</h1>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); setSuccess(''); }}
          className="tf-btn tf-btn-primary"
        >
          {showForm ? 'Cancel' : 'Create org'}
        </button>
      </div>

      {error && <p className="text-sm text-coral tf-card px-4 py-2">{error}</p>}
      {success && <p className="text-sm text-mint tf-card px-4 py-2">{success}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="tf-card p-6 space-y-4">
          <h2 className="font-semibold text-sand">New organization</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Organization name *"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="tf-field col-span-2"
            />
            <select
              value={form.orgType}
              onChange={e => setForm(f => ({ ...f, orgType: e.target.value as Organization['orgType'] }))}
              className="tf-field col-span-2"
            >
              {ORG_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              placeholder="Admin name *"
              required
              value={form.adminName}
              onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
              className="tf-field"
            />
            <input
              placeholder="Admin email *"
              required
              type="email"
              value={form.adminEmail}
              onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
              className="tf-field"
            />
            <input
              placeholder="Admin password *"
              required
              type="password"
              value={form.adminPassword}
              onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
              className="tf-field col-span-2"
            />
          </div>
          <button type="submit" disabled={loading} className="tf-btn tf-btn-primary">
            {loading ? 'Creating…' : 'Create organization'}
          </button>
        </form>
      )}

      <div className="tf-card tf-table-wrap">
        <table>
          <thead>
            <tr>
              {['Name', 'Type', 'Status', 'Created', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={5} className="text-center text-mute">Loading…</td></tr>
            )}
            {!listLoading && orgs.map(org => (
              <tr key={org._id}>
                <td className="font-medium text-sand">{org.name}</td>
                <td className="text-mute">{org.orgType}</td>
                <td>
                  <span className={`tf-badge ${org.isActive ? 'tf-badge-ok' : 'tf-badge-muted'}`}>
                    {org.isActive ? 'active' : 'disabled'}
                  </span>
                </td>
                <td className="text-mute">
                  {new Date(org.createdAt).toLocaleDateString()}
                </td>
                <td>
                  {org.isActive && (
                    <button
                      onClick={() => handleDisable(org._id, org.name)}
                      className="text-coral text-sm hover:underline"
                    >
                      Disable
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!listLoading && orgs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-mute">
                  No organizations yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
