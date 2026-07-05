import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// ── Types mirroring backend plain-object returns ──────────────────────────────

export interface Vehicle {
  _id: string;
  vehicleNumber: string;
  type: string;
  capacity: number | null;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
}

export interface Driver {
  _id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  status: 'active' | 'inactive';
  assignedVehicleId: string | null;
  createdAt: string;
}

export interface Stop {
  order: number;
  label: string;
  lat: number;
  lng: number;
}

export interface Route {
  _id: string;
  name: string;
  stops: Stop[];
  createdAt: string;
}

export interface Trip {
  _id: string;
  routeId: string;
  vehicleId: string;
  driverId: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  publicTrackingToken: string;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  lastKnownLocation: { lat: number; lng: number; updatedAt: string } | null;
  createdAt: string;
}
