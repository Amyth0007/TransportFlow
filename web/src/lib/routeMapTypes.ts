/** Central Maharashtra (Ahmednagar region) — default focus for route editing & empty maps. */
export const DEFAULT_MAP_CENTER: MapPoint = { lat: 19.6011, lng: 75.7170 };

/** Mainland India + nearby coasts — pan/zoom cannot leave this box. */
export const INDIA_BOUNDS = {
  south: 6.5,
  west: 68.0,
  north: 35.7,
  east: 97.4,
};

export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;
export const MAP_FIT_MAX_ZOOM = 14;
export const MAP_EMPTY_ZOOM = 6;

export const HAS_MAPS_API_KEY = Boolean(process.env.MAPS_API_KEY);

export const MAP_POLYLINE_COLOR = '#2ee6d6';

export interface MapStop {
  order: number;
  label: string;
  lat: number;
  lng: number;
}

export interface MapPoint {
  lat: number;
  lng: number;
}

/** Shared props contract between web RouteMap and mobile RouteMap. */
export interface RouteMapProps {
  stops: MapStop[];
  roadPath?: MapPoint[] | null;
  currentStopIndex?: number;
  lastKnownLocation?: MapPoint | null;
  live?: boolean;
  tripId?: string;
  interactive?: boolean;
  onStopsChange?: (stops: MapStop[]) => void;
  selectedStopIndex?: number | null;
  onStopSelect?: (index: number | null) => void;
}

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01);
}

export function filterValidStops(stops: MapStop[]): MapStop[] {
  return stops.filter((s) => isValidCoord(s.lat, s.lng));
}

export function straightLinePath(stops: MapStop[]): MapPoint[] {
  return filterValidStops(stops).map((s) => ({ lat: s.lat, lng: s.lng }));
}

export function resolvePath(stops: MapStop[], roadPath?: MapPoint[] | null): MapPoint[] {
  if (roadPath && roadPath.length >= 2) return roadPath;
  return straightLinePath(stops);
}

export function defaultStop(order: number): MapStop {
  const offset = (order - 1) * 0.04;
  return {
    order,
    label: '',
    lat: DEFAULT_MAP_CENTER.lat + offset,
    lng: DEFAULT_MAP_CENTER.lng + offset * 0.8,
  };
}

export function isInsideIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.south &&
    lat <= INDIA_BOUNDS.north &&
    lng >= INDIA_BOUNDS.west &&
    lng <= INDIA_BOUNDS.east
  );
}

/** Prompts the browser location permission. Returns null if denied, timed out, or outside India. */
export function requestBrowserLocationInIndia(): Promise<MapPoint | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        resolve(isInsideIndia(lat, lng) ? { lat, lng } : null);
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20_000 }
    );
  });
}
