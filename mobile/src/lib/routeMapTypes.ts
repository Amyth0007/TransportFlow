/** Central Maharashtra (Ahmednagar region) — default focus for route editing & empty maps. */
export const DEFAULT_MAP_CENTER = { lat: 19.6011, lng: 75.7170 };

export const INDIA_BOUNDS = {
  south: 6.5,
  west: 68.0,
  north: 35.7,
  east: 97.4,
};

export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;
export const MAP_POLYLINE_COLOR = '#2ee6d6';
export const MAP_FIT_MAX_ZOOM = 14;

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

/** Mobile region deltas ~300 km view over Maharashtra. */
export const DEFAULT_MAP_REGION = {
  latitude: DEFAULT_MAP_CENTER.lat,
  longitude: DEFAULT_MAP_CENTER.lng,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

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

/** Reject null island and unset placeholder coords. */
export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat) > 0.01 || Math.abs(lng) > 0.01);
}

export function filterValidStops(stops: MapStop[]): MapStop[] {
  return stops.filter((s) => isValidCoord(s.lat, s.lng));
}

/** Straight-line fallback when roadPath is unavailable. */
export function straightLinePath(stops: MapStop[]): MapPoint[] {
  return filterValidStops(stops).map((s) => ({ lat: s.lat, lng: s.lng }));
}

/** Pick road path or fall back to stop-to-stop straight segments. */
export function resolvePath(stops: MapStop[], roadPath?: MapPoint[] | null): MapPoint[] {
  if (roadPath && roadPath.length >= 2) return roadPath;
  return straightLinePath(stops);
}

/** Compute map region that fits all relevant coordinates. */
export function regionForPoints(
  points: MapPoint[],
  fallback: MapPoint = DEFAULT_MAP_CENTER
) {
  const valid = points.filter((p) => isValidCoord(p.lat, p.lng));
  if (valid.length === 0) {
    return { ...DEFAULT_MAP_REGION };
  }
  if (valid.length === 1) {
    return {
      latitude: valid[0].lat,
      longitude: valid[0].lng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  const lats = valid.map((p) => p.lat);
  const lngs = valid.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDelta = Math.max((maxLat - minLat) * 1.4, 0.02);
  const lngDelta = Math.max((maxLng - minLng) * 1.4, 0.02);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

/** Default stop placed in central Maharashtra; offset slightly per order so markers don't stack. */
export function defaultStop(order: number): MapStop {
  const offset = (order - 1) * 0.04;
  return {
    order,
    label: '',
    lat: DEFAULT_MAP_CENTER.lat + offset,
    lng: DEFAULT_MAP_CENTER.lng + offset * 0.8,
  };
}
