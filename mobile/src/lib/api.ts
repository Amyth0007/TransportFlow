import axios from 'axios';

// In Expo Go on a physical device, use your machine's LAN IP.
// In an emulator, use 10.0.2.2 (Android) or localhost (iOS simulator).
// Override by setting EXPO_PUBLIC_API_URL in a .env file at /mobile root.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const api = axios.create({ baseURL: `${BASE_URL}/api` });

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`;
  return config;
});

export default api;

export interface TripDoc {
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
}
