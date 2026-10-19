/** Truck pin for Google Maps Marker.icon.url */
export function truckMarkerIconUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <ellipse cx="24" cy="44" rx="10" ry="3" fill="rgba(0,0,0,0.35)"/>
  <rect x="6" y="16" width="22" height="16" rx="2.5" fill="#2ee6d6"/>
  <path d="M28 20h8.5l5.5 7v5H28V20z" fill="#f4efe6"/>
  <rect x="30" y="22" width="6" height="5" rx="1" fill="#0c1c26"/>
  <circle cx="14" cy="33" r="4" fill="#071018" stroke="#f4efe6" stroke-width="1.5"/>
  <circle cx="34" cy="33" r="4" fill="#071018" stroke="#f4efe6" stroke-width="1.5"/>
  <circle cx="14" cy="33" r="1.5" fill="#7a9aa0"/>
  <circle cx="34" cy="33" r="1.5" fill="#7a9aa0"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function googleTruckIcon(maps: {
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
}) {
  return {
    url: truckMarkerIconUrl(),
    scaledSize: new maps.Size(44, 44),
    anchor: new maps.Point(22, 40),
  };
}
