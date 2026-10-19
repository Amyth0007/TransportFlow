import { Navigate, Outlet } from 'react-router-dom';
import { getRole, isLoggedIn } from '../lib/auth';

export default function ProtectedSuperAdminRoute() {
  if (!isLoggedIn()) return <Navigate to="/super-admin/login" replace />;
  const role = getRole();
  if (role === 'org_admin' || role === 'manager') return <Navigate to="/trips" replace />;
  if (role !== 'super_admin') return <Navigate to="/super-admin/login" replace />;
  return <Outlet />;
}
