import { Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';

export default function SuperAdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/super-admin/login');
  }

  return (
    <div className="tf-shell min-h-screen">
      <header className="bg-ink-2 text-fog px-6 py-4 flex items-center justify-between border-b border-line">
        <div>
          <p className="tf-kicker">Platform</p>
          <h1 className="tf-title text-lg">TransportFlow</h1>
        </div>
        <button onClick={handleLogout} className="tf-btn tf-btn-ghost">
          Log out
        </button>
      </header>
      <main className="p-6 md:p-8 tf-enter">
        <Outlet />
      </main>
    </div>
  );
}
