import { NavLink, Outlet } from 'react-router-dom';
import { logout } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

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
    <div className="flex h-screen bg-gray-100">
      <aside className="w-48 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 text-lg font-bold tracking-tight border-b border-gray-700">
          TransportFlow
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-gray-700 ${isActive ? 'bg-gray-700 font-semibold' : ''}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-gray-700 text-left border-t border-gray-700"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
