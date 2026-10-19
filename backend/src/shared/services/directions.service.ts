import { decodePolyline } from '../utils/decodePolyline';

export interface LatLng {
  lat: number;
  lng: number;
}

interface StopLike {
  order: number;
  lat: number;
  lng: number;
}

/**
 * Fetch a road-snapped path through ordered stops via Google Directions API.
 * Returns null if the API key is missing, there are fewer than 2 valid stops,
 * or the API call fails — callers should fall back to straight-line polylines.
 */
export async function computeRoadPath(stops: StopLike[]): Promise<LatLng[] | null> {
  const apiKey = process.env.MAPS_API_KEY;
  if (!apiKey) return null;

  const sorted = [...stops]
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && (s.lat !== 0 || s.lng !== 0))
    .sort((a, b) => a.order - b.order);

  if (sorted.length < 2) return null;

  const origin = `${sorted[0].lat},${sorted[0].lng}`;
  const destination = `${sorted[sorted.length - 1].lat},${sorted[sorted.length - 1].lng}`;

  const params = new URLSearchParams({ origin, destination, key: apiKey });

  if (sorted.length > 2) {
    const waypoints = sorted
      .slice(1, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');
    params.set('waypoints', waypoints);
  }

  params.set('mode', 'driving');
  params.set('region', 'in');

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    const data = (await res.json()) as {
      status: string;
      routes?: { overview_polyline?: { points?: string } }[];
    };

    const encoded = data.routes?.[0]?.overview_polyline?.points;
    if (data.status !== 'OK' || !encoded) {
      console.warn('[directions] API returned non-OK status:', data.status);
      return null;
    }

    return decodePolyline(encoded);
  } catch (err) {
    console.warn('[directions] Failed to fetch road path:', err);
    return null;
  }
}
