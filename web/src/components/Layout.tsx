import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout } from '../lib/auth';

const navItems = [
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/drivers', label: 'Drivers' },
  { to: '/routes', label: 'Routes' },
  { to: '/trips', label: 'Trips' },
];

export default function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="tf-shell flex h-screen overflow-hidden">
      <aside className="w-56 bg-ink-2 text-fog flex flex-col border-r border-line">
        <div className="px-5 py-6 border-b border-line">
          <p className="tf-kicker">Live ops</p>
          <div className="tf-title text-xl mt-1">TransportFlow</div>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `tf-nav ${isActive ? 'tf-nav-active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="tf-btn tf-btn-ghost mx-3 mb-4 text-left justify-start"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8 tf-enter">
        <Outlet />
      </main>
    </div>
  );
}
