import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Trip, Route } from '../lib/api';
import { getSocket } from '../lib/socket';

// Fix Leaflet's broken default icon paths when bundled with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Props {
  trip: Trip;
  route: Route | null;
  /** When true the component connects to Socket.IO and listens for updates */
  live?: boolean;
}

export default function LiveMap({ trip, route, live = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: L.LatLngTuple =
      trip.lastKnownLocation
        ? [trip.lastKnownLocation.lat, trip.lastKnownLocation.lng]
        : route?.stops[0]
        ? [route.stops[0].lat, route.stops[0].lng]
        : [20.5937, 78.9629]; // centre of India fallback

    const map = L.map(containerRef.current).setView(defaultCenter, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Draw route stops as circle markers
    if (route) {
      route.stops.forEach((stop) => {
        L.circleMarker([stop.lat, stop.lng], { radius: 6, color: '#3b82f6' })
          .bindTooltip(stop.label)
          .addTo(map);
      });
    }

    // Vehicle marker
    if (trip.lastKnownLocation) {
      markerRef.current = L.marker([
        trip.lastKnownLocation.lat,
        trip.lastKnownLocation.lng,
      ]).addTo(map);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO live updates
  useEffect(() => {
    if (!live) return;

    const socket = getSocket();
    socket.emit('trip:join', { tripId: trip._id });

    socket.on(
      'location:broadcast',
      (payload: { tripId: string; lat: number; lng: number }) => {
        if (payload.tripId !== trip._id) return;
        const latlng: L.LatLngTuple = [payload.lat, payload.lng];
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
        } else if (mapRef.current) {
          markerRef.current = L.marker(latlng).addTo(mapRef.current);
        }
        mapRef.current?.panTo(latlng);
      }
    );

    return () => {
      socket.emit('trip:leave', { tripId: trip._id });
      socket.off('location:broadcast');
    };
  }, [trip._id, live]);

  return <div ref={containerRef} className="w-full h-full rounded" />;
}
