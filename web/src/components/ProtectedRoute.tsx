import { Navigate, Outlet } from 'react-router-dom';
import { getRole, isLoggedIn } from '../lib/auth';

export default function ProtectedRoute() {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (getRole() === 'super_admin') return <Navigate to="/super-admin/orgs" replace />;
  return <Outlet />;
}
