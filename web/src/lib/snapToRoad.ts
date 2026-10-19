import type { MapPoint } from './routeMapTypes';

function dist2(a: MapPoint, b: MapPoint): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/** Closest point on segment ab to p. */
function closestOnSegment(p: MapPoint, a: MapPoint, b: MapPoint): MapPoint {
  const abLat = b.lat - a.lat;
  const abLng = b.lng - a.lng;
  const len2 = abLat * abLat + abLng * abLng;
  if (len2 < 1e-18) return a;
  let t = ((p.lat - a.lat) * abLat + (p.lng - a.lng) * abLng) / len2;
  t = Math.max(0, Math.min(1, t));
  return { lat: a.lat + t * abLat, lng: a.lng + t * abLng };
}

/** Snap GPS onto the driving polyline so the truck stays on the road. */
export function snapToRoadPath(path: MapPoint[], gps: MapPoint): MapPoint {
  if (path.length === 0) return gps;
  if (path.length === 1) return path[0];

  let best = path[0];
  let bestD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const candidate = closestOnSegment(gps, path[i], path[i + 1]);
    const d = dist2(gps, candidate);
    if (d < bestD) {
      bestD = d;
      best = candidate;
    }
  }
  return best;
}

export function lerpPoint(from: MapPoint, to: MapPoint, t: number): MapPoint {
  const u = Math.max(0, Math.min(1, t));
  return {
    lat: from.lat + (to.lat - from.lat) * u,
    lng: from.lng + (to.lng - from.lng) * u,
  };
}
