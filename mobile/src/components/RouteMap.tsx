import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { RouteMapProps } from '../lib/routeMapTypes';
import {
  DEFAULT_MAP_CENTER,
  INDIA_BOUNDS,
  MAP_FIT_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_POLYLINE_COLOR,
  filterValidStops,
  resolvePath,
} from '../lib/routeMapTypes';
import { colors } from '../lib/theme';

const MAPS_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY ?? '';

function mapHtml(
  stopsJson: string,
  pathJson: string,
  vehicleJson: string,
  currentStopIndex: number
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body, #map { margin: 0; height: 100%; width: 100%; background: #071018; }
    #err {
      display: none; position: absolute; left: 8px; right: 8px; bottom: 8px;
      background: rgba(7,16,24,0.92); color: #f4efe6; font: 13px sans-serif;
      padding: 10px; border-radius: 10px; z-index: 5;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="err"></div>
  <script>
    const STOPS = ${stopsJson};
    const PATH = ${pathJson};
    const VEHICLE = ${vehicleJson};
    const CURRENT = ${currentStopIndex};
    const POLY = '${MAP_POLYLINE_COLOR}';
    let map, vehicleMarker;

    window.gm_authFailure = function () {
      const el = document.getElementById('err');
      el.style.display = 'block';
      el.textContent = 'Google Maps key rejected. Enable Maps JavaScript API on this key (same as web).';
    };

    function truckIcon() {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><ellipse cx="24" cy="44" rx="10" ry="3" fill="rgba(0,0,0,0.35)"/><rect x="6" y="16" width="22" height="16" rx="2.5" fill="#2ee6d6"/><path d="M28 20h8.5l5.5 7v5H28V20z" fill="#f4efe6"/><rect x="30" y="22" width="6" height="5" rx="1" fill="#0c1c26"/><circle cx="14" cy="33" r="4" fill="#071018" stroke="#f4efe6" stroke-width="1.5"/><circle cx="34" cy="33" r="4" fill="#071018" stroke="#f4efe6" stroke-width="1.5"/></svg>';
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(44, 44),
        anchor: new google.maps.Point(22, 40)
      };
    }

    function init() {
      const bounds = new google.maps.LatLngBounds(
        { lat: ${INDIA_BOUNDS.south}, lng: ${INDIA_BOUNDS.west} },
        { lat: ${INDIA_BOUNDS.north}, lng: ${INDIA_BOUNDS.east} }
      );
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${DEFAULT_MAP_CENTER.lat}, lng: ${DEFAULT_MAP_CENTER.lng} },
        zoom: 12,
        minZoom: ${MAP_MIN_ZOOM},
        maxZoom: 18,
        mapTypeId: 'hybrid',
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        restriction: { latLngBounds: bounds, strictBounds: true }
      });

      if (PATH.length >= 2) {
        new google.maps.Polyline({
          map,
          path: PATH,
          strokeColor: POLY,
          strokeWeight: 5,
          strokeOpacity: 0.95
        });
      }

      const fit = new google.maps.LatLngBounds();
      STOPS.forEach(function (stop, idx) {
        const pos = { lat: stop.lat, lng: stop.lng };
        fit.extend(pos);
        new google.maps.Marker({
          map,
          position: pos,
          label: {
            text: String(idx + 1),
            color: '#071018',
            fontWeight: '700'
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: idx <= CURRENT ? '#3ddc97' : '#2ee6d6',
            fillOpacity: 1,
            strokeColor: '#f4efe6',
            strokeWeight: 1.5
          }
        });
      });

      if (VEHICLE) {
        vehicleMarker = new google.maps.Marker({
          map,
          position: VEHICLE,
          icon: truckIcon(),
          zIndex: 1000
        });
        fit.extend(VEHICLE);
      }

      if (STOPS.length) {
        map.fitBounds(fit, 48);
        google.maps.event.addListenerOnce(map, 'idle', function () {
          if (map.getZoom() > ${MAP_FIT_MAX_ZOOM}) map.setZoom(${MAP_FIT_MAX_ZOOM});
        });
      }
    }

    function setVehicle(lat, lng) {
      if (!map) return;
      const pos = { lat: lat, lng: lng };
      if (!vehicleMarker) {
        vehicleMarker = new google.maps.Marker({ map: map, position: pos, icon: truckIcon(), zIndex: 1000 });
      } else {
        vehicleMarker.setPosition(pos);
      }
      map.panTo(pos);
    }

    document.addEventListener('message', function (e) { handleMsg(e.data); });
    window.addEventListener('message', function (e) { handleMsg(e.data); });
    function handleMsg(raw) {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (msg && msg.type === 'vehicle') setVehicle(msg.lat, msg.lng);
      } catch (e) {}
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=init" async defer></script>
</body>
</html>`;
}

export default function RouteMap({
  stops,
  roadPath,
  currentStopIndex = 0,
  lastKnownLocation,
}: RouteMapProps) {
  const webRef = useRef<WebView>(null);
  const [mapError, setMapError] = useState('');

  const validStops = useMemo(() => filterValidStops(stops), [stops]);
  const path = useMemo(() => resolvePath(stops, roadPath), [stops, roadPath]);
  const vehicle = lastKnownLocation
    ? { lat: lastKnownLocation.lat, lng: lastKnownLocation.lng }
    : null;

  const html = useMemo(
    () =>
      mapHtml(
        JSON.stringify(validStops),
        JSON.stringify(path),
        JSON.stringify(vehicle),
        currentStopIndex
      ),
    // Rebuild when the route itself changes, not on every GPS ping.
    [validStops, path, currentStopIndex]
  );

  useEffect(() => {
    if (!vehicle) return;
    const js = `setVehicle(${vehicle.lat},${vehicle.lng}); true;`;
    webRef.current?.injectJavaScript(js);
  }, [vehicle?.lat, vehicle?.lng]);

  if (!MAPS_KEY) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>
          EXPO_PUBLIC_MAPS_API_KEY is missing from mobile/.env. Restart Expo after adding it.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} collapsable={false}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://maps.googleapis.com' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        style={styles.map}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as { type?: string };
            if (msg.type === 'auth') {
              setMapError('Google Maps rejected the key. Enable Maps JavaScript API.');
            }
          } catch {
            // ignore
          }
        }}
      />
      {!!mapError && (
        <View style={styles.banner} pointerEvents="none">
          <Text style={styles.bannerText}>{mapError}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.ink2,
  },
  map: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.ink2,
  },
  missingText: { color: colors.sand, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  banner: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(7,16,24,0.88)',
    borderRadius: 10,
    padding: 10,
  },
  bannerText: { color: colors.sand, fontSize: 12, lineHeight: 16 },
});
