import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
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
        <Route path="/track/:token" element={<PublicTrackingPage />} />

        {/* Protected — requires token in localStorage */}
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
