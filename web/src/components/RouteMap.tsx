import { useEffect, useRef, useMemo, useState } from 'react';
import type { MapPoint, RouteMapProps } from '../lib/routeMapTypes';
import {
  DEFAULT_MAP_CENTER,
  INDIA_BOUNDS,
  MAP_EMPTY_ZOOM,
  MAP_FIT_MAX_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_POLYLINE_COLOR,
  filterValidStops,
  resolvePath,
} from '../lib/routeMapTypes';
import { loadGoogleMapsScript } from '../lib/loadGoogleMaps';
import { getSocket } from '../lib/socket';
import { googleTruckIcon } from '../lib/vehicleMarker';
import { lerpPoint, snapToRoadPath } from '../lib/snapToRoad';

function getStopIcon(isReached: boolean, isSelected: boolean) {
  return {
    path: window?.google?.maps?.SymbolPath?.CIRCLE ?? 0,
    scale: isSelected ? 16 : 12,
    fillColor: isSelected ? '#f0b429' : isReached ? '#3ddc97' : '#2ee6d6',
    fillOpacity: 1,
    strokeColor: isSelected ? '#f4efe6' : '#071018',
    strokeWeight: isSelected ? 3 : 2,
  };
}

function validStops(stops: RouteMapProps['stops']) {
  return filterValidStops(stops);
}

export default function RouteMap({
  stops,
  roadPath,
  currentStopIndex,
  lastKnownLocation,
  live = false,
  tripId,
  interactive = false,
  onStopsChange,
  selectedStopIndex = null,
  onStopSelect,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const drivingPathRef = useRef<MapPoint[]>([]);
  const vehiclePosRef = useRef<MapPoint | null>(null);
  const animRafRef = useRef<number>(0);
  const [mapReady, setMapReady] = useState(false);

  const pathPoints = useMemo(() => resolvePath(stops, roadPath), [stops, roadPath]);
  const stopsKey = useMemo(
    () => stops.map((s) => `${s.order}:${s.lat}:${s.lng}`).join('|'),
    [stops]
  );

  const stateRef = useRef({ stops, onStopsChange, interactive, onStopSelect });
  useEffect(() => {
    stateRef.current = { stops, onStopsChange, interactive, onStopSelect };
  });

  const updateStopPosition = (index: number, latLng: any) => {
    const { stops: currentStops, onStopsChange: onChange } = stateRef.current;
    if (!onChange) return;
    const newStops = currentStops.map((s, idx) =>
      idx === index ? { ...s, lat: latLng.lat(), lng: latLng.lng() } : s
    );
    onChange(newStops);
  };

  const handleMarkerClick = (marker: any, index: number, label: string) => {
    const { interactive, stops: currentStops, onStopsChange: onChange, onStopSelect: onSelect } =
      stateRef.current;

    if (onSelect) onSelect(index);

    if (!interactive) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    const content = document.createElement('div');
    content.className = 'p-2 text-center min-w-[140px]';

    const title = document.createElement('p');
    title.className = 'font-semibold text-sm mb-1';
    title.textContent = label || `Stop ${index + 1}`;
    content.appendChild(title);

    const coords = document.createElement('p');
    coords.className = 'text-xs text-gray-500 mb-2';
    coords.textContent = 'Drag marker to reposition';
    content.appendChild(coords);

    const button = document.createElement('button');
    button.className =
      'bg-red-500 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded font-semibold w-full';
    button.textContent = 'Remove Stop';
    button.onclick = () => {
      if (onChange) {
        const newStops = currentStops
          .filter((_, idx) => idx !== index)
          .map((s, idx) => ({ ...s, order: idx + 1 }));
        onChange(newStops);
        onSelect?.(null);
        infoWindowRef.current.close();
      }
    };
    content.appendChild(button);

    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(mapRef.current, marker);
  };

  // 1. Initialise map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const apiKey = process.env.MAPS_API_KEY || '';
    if (!apiKey) {
      console.error('[RouteMap] MAPS_API_KEY is missing — map will not load');
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!containerRef.current || mapRef.current) return;

        const defaultCenter = lastKnownLocation
          ? { lat: lastKnownLocation.lat, lng: lastKnownLocation.lng }
          : validStops(stops)[0]
          ? { lat: validStops(stops)[0].lat, lng: validStops(stops)[0].lng }
          : DEFAULT_MAP_CENTER;

        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: defaultCenter,
          zoom: validStops(stops).length > 0 ? 12 : MAP_EMPTY_ZOOM,
          minZoom: MAP_MIN_ZOOM,
          maxZoom: MAP_MAX_ZOOM,
          mapTypeId: 'hybrid',
          tilt: 45,
          gestureHandling: 'greedy',
          streetViewControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            mapTypeIds: ['hybrid', 'roadmap', 'terrain'],
            style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
          fullscreenControl: true,
          zoomControl: true,
          rotateControl: true,
          scaleControl: true,
          restriction: {
            latLngBounds: INDIA_BOUNDS,
            strictBounds: true,
          },
        });
        setMapReady(true);
      })
      .catch((err) => {
        console.error('[RouteMap] Failed to load Google Maps script', err);
      });

    return () => {
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      setMapReady(false);
      mapRef.current = null;
    };
  }, []);

  // 2. Sync markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const currentMarkers = markersRef.current;
    while (currentMarkers.length > stops.length) {
      currentMarkers.pop()?.setMap(null);
    }

    stops.forEach((stop, index) => {
      const isReached = currentStopIndex !== undefined && index <= currentStopIndex;
      const isSelected = selectedStopIndex === index;
      const pos = { lat: stop.lat, lng: stop.lng };

      const bindMarker = (marker: any) => {
        window.google.maps.event.clearListeners(marker, 'click');
        marker.addListener('click', () => handleMarkerClick(marker, index, stop.label));

        window.google.maps.event.clearListeners(marker, 'drag');
        marker.addListener('drag', () => updateStopPosition(index, marker.getPosition()));

        window.google.maps.event.clearListeners(marker, 'dragend');
        marker.addListener('dragend', () => updateStopPosition(index, marker.getPosition()));
      };

      if (currentMarkers[index]) {
        const marker = currentMarkers[index];
        marker.setPosition(pos);
        marker.setTitle(stop.label);
        marker.setLabel({
          text: (index + 1).toString(),
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 'bold',
        });
        marker.setIcon(getStopIcon(isReached, isSelected));
        marker.setDraggable(!!interactive);
        marker.setZIndex(isSelected ? 1000 : index);
        bindMarker(marker);
      } else {
        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: stop.label,
          draggable: !!interactive,
          label: {
            text: (index + 1).toString(),
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          icon: getStopIcon(isReached, isSelected),
          zIndex: isSelected ? 1000 : index,
        });
        bindMarker(marker);
        currentMarkers.push(marker);
      }
    });
  }, [stops, interactive, currentStopIndex, selectedStopIndex, mapReady]);

  function drawFallbackPolyline(map: any, path: { lat: number; lng: number }[]) {
    if (path.length < 2) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }
    if (polylineRef.current) {
      polylineRef.current.setPath(path);
      polylineRef.current.setMap(map);
    } else {
      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: false,
        strokeColor: MAP_POLYLINE_COLOR,
        strokeOpacity: 0.95,
        strokeWeight: 6,
        map,
      });
    }
    drivingPathRef.current = path;
  }

  function pathFromDirectionsResult(result: any): { lat: number; lng: number }[] {
    const route = result?.routes?.[0];
    if (!route) return [];
    const points: { lat: number; lng: number }[] = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        for (const p of step.path ?? []) {
          points.push({ lat: p.lat(), lng: p.lng() });
        }
      }
    }
    if (points.length < 2) {
      for (const p of route.overview_path ?? []) {
        points.push({ lat: p.lat(), lng: p.lng() });
      }
    }
    return points;
  }

  // 3. Numbered pins stay. Line is a driving road path stop1 → stop2 → … → N.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

    const fallback = pathPoints.map((p) => ({ lat: p.lat, lng: p.lng }));
    const ordered = filterValidStops(stops);

    if (ordered.length < 2 || !window.google.maps.DirectionsService) {
      drawFallbackPolyline(map, fallback);
      return;
    }

    const delay = interactive ? 700 : 50;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const origin = ordered[0];
      const destination = ordered[ordered.length - 1];
      const waypoints = ordered.slice(1, -1).slice(0, 25).map((s) => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true,
      }));

      const request = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints,
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
        region: 'IN',
      };

      const apply = (result: unknown, status: string) => {
        if (cancelled) return;
        if (status === 'OK') {
          const road = pathFromDirectionsResult(result);
          drawFallbackPolyline(map, road.length >= 2 ? road : fallback);
          const gps = vehiclePosRef.current;
          if (gps && vehicleMarkerRef.current) {
            const onRoad = snapToRoadPath(drivingPathRef.current, gps);
            vehicleMarkerRef.current.setPosition(onRoad);
            vehiclePosRef.current = onRoad;
          }
        } else {
          console.warn('[RouteMap] Directions failed:', status);
          drawFallbackPolyline(map, fallback);
        }
      };

      const service = new window.google.maps.DirectionsService();
      const pending = service.route(request, (result: unknown, status: string) => {
        apply(result, status);
      });
      if (pending && typeof pending.then === 'function') {
        pending
          .then((result: unknown) => apply(result, 'OK'))
          .catch((err: unknown) => {
            console.warn('[RouteMap] Directions promise failed:', err);
            apply(null, 'ERROR');
          });
      }
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mapReady, interactive, stopsKey, pathPoints, stops]);

  // 4. Map click — add stop in interactive mode
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    window.google.maps.event.clearListeners(map, 'click');

    if (interactive) {
      map.addListener('click', (e: any) => {
        const { stops: currentStops, onStopsChange: onChange, onStopSelect: onSelect } =
          stateRef.current;
        if (!onChange) return;

        const nextOrder = currentStops.length + 1;
        const newStop = {
          order: nextOrder,
          label: `Stop ${nextOrder}`,
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
        };
        onChange([...currentStops, newStop]);
        onSelect?.(currentStops.length);
      });
    }
  }, [interactive, mapReady]);

  // 5. Trip / public: frame the stops once. Never while placing pins.
  useEffect(() => {
    if (interactive) return;

    const map = mapRef.current;
    if (!mapReady || !map || !window.google?.maps) return;

    const ordered = filterValidStops(stops);
    if (ordered.length < 1) {
      map.setCenter(DEFAULT_MAP_CENTER);
      map.setZoom(MAP_EMPTY_ZOOM);
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    ordered.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
    map.fitBounds(bounds, 56);
    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      const z = map.getZoom();
      if (typeof z === 'number' && z > MAP_FIT_MAX_ZOOM) map.setZoom(MAP_FIT_MAX_ZOOM);
      if (typeof z === 'number' && z < MAP_MIN_ZOOM) map.setZoom(MAP_MIN_ZOOM);
      window.google.maps.event.removeListener(listener);
    });
  }, [interactive, stopsKey, stops, mapReady]);

  // 6. Pan to a newly selected stop only — not on every lat/lng drag tick
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedStopIndex == null) return;
    const stop = stateRef.current.stops[selectedStopIndex];
    if (!stop || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) return;
    map.panTo({ lat: stop.lat, lng: stop.lng });
  }, [selectedStopIndex]);

  function placeVehicle(gps: MapPoint, animate: boolean) {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    const target = snapToRoadPath(drivingPathRef.current, gps);
    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = new window.google.maps.Marker({
        position: target,
        map,
        title: 'Vehicle',
        zIndex: 2000,
        icon: googleTruckIcon(window.google.maps),
      });
      vehiclePosRef.current = target;
      return;
    }

    if (!animate || !vehiclePosRef.current) {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      vehicleMarkerRef.current.setPosition(target);
      vehiclePosRef.current = target;
      return;
    }

    const from = vehiclePosRef.current;
    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
    const started = performance.now();
    const duration = 900;

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = t * (2 - t);
      const p = lerpPoint(from, target, eased);
      vehicleMarkerRef.current?.setPosition(p);
      vehiclePosRef.current = p;
      if (t < 1) {
        animRafRef.current = requestAnimationFrame(tick);
      }
    };
    animRafRef.current = requestAnimationFrame(tick);
  }

  // 7. Vehicle on the road path (initial last-known GPS)
  useEffect(() => {
    if (!mapReady) return;
    if (!lastKnownLocation) {
      if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
      vehicleMarkerRef.current?.setMap(null);
      vehicleMarkerRef.current = null;
      vehiclePosRef.current = null;
      return;
    }
    if (live && vehicleMarkerRef.current) return;
    placeVehicle(lastKnownLocation, false);
  }, [mapReady, lastKnownLocation, live]);

  // 8. Live GPS — truck slides along the road like Swiggy/Zomato
  useEffect(() => {
    if (!live || !tripId) return;

    const socket = getSocket();
    socket.emit('trip:join', { tripId });

    socket.on(
      'location:broadcast',
      (payload: { tripId: string; lat: number; lng: number }) => {
        if (payload.tripId !== tripId) return;
        const gps = { lat: payload.lat, lng: payload.lng };
        placeVehicle(gps, true);
        const onRoad = snapToRoadPath(drivingPathRef.current, gps);
        mapRef.current?.panTo(onRoad);
      }
    );

    socket.on(
      'stop:reached_broadcast',
      (payload: { tripId: string; stopIndex: number }) => {
        if (payload.tripId !== tripId) return;
        markersRef.current.forEach((m, idx) => {
          if (idx <= payload.stopIndex) {
            m.setIcon(getStopIcon(true, selectedStopIndex === idx));
          }
        });
      }
    );

    return () => {
      socket.emit('trip:leave', { tripId });
      socket.off('location:broadcast');
      socket.off('stop:reached_broadcast');
    };
  }, [tripId, live, selectedStopIndex, mapReady]);

  return <div ref={containerRef} className="w-full h-full min-h-[350px]" />;
}
