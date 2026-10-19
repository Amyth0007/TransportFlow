import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRole, login, logout } from '../lib/auth';

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('superadmin@transportflow.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (getRole() !== 'super_admin') {
        logout();
        setError('This account is not a super admin');
        return;
      }
      navigate('/super-admin/orgs');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tf-login-aurora min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="tf-card tf-enter p-8 w-full max-w-sm space-y-4">
        <p className="tf-kicker">Super admin</p>
        <h1 className="tf-title text-2xl">TransportFlow</h1>
        <p className="text-sm text-mute">Provision organizations. No org dashboard access.</p>
        {error && <p className="text-sm text-coral">{error}</p>}
        <div>
          <label className="block text-sm font-medium mb-1 text-fog">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="tf-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-fog">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="tf-field"
          />
        </div>
        <button type="submit" disabled={loading} className="tf-btn tf-btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
