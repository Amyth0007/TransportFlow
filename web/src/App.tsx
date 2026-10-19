import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedSuperAdminRoute from './components/ProtectedSuperAdminRoute';
import Layout from './components/Layout';
import SuperAdminLayout from './components/SuperAdminLayout';
import LoginPage from './pages/LoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminOrgsPage from './pages/SuperAdminOrgsPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import RoutesPage from './pages/RoutesPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import PublicTrackingPage from './pages/PublicTrackingPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — no auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />
        <Route path="/track/:token" element={<PublicTrackingPage />} />

        {/* Super Admin — requires super_admin role */}
        <Route element={<ProtectedSuperAdminRoute />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/super-admin/orgs" element={<SuperAdminOrgsPage />} />
          </Route>
        </Route>

        {/* Org Admin — requires org_admin/manager token */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/trips" replace />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:id" element={<TripDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
