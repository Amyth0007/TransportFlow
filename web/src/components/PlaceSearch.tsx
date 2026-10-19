import { useEffect, useRef } from 'react';
import { loadGoogleMapsScript } from '../lib/loadGoogleMaps';
import { isInsideIndia } from '../lib/routeMapTypes';

interface PlaceSearchProps {
  disabled?: boolean;
  onPlace: (place: { label: string; lat: number; lng: number }) => void;
}

export default function PlaceSearch({ disabled, onPlace }: PlaceSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  useEffect(() => {
    const apiKey = process.env.MAPS_API_KEY || '';
    if (!apiKey || disabled || !inputRef.current) return;

    let autocomplete: any = null;
    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current || !window.google?.maps?.places) return;

        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['geometry', 'name', 'formatted_address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const lat = loc.lat();
          const lng = loc.lng();
          if (!isInsideIndia(lat, lng)) return;
          const label: string = place.name || place.formatted_address || 'Stop';
          onPlaceRef.current({ label, lat, lng });
          if (inputRef.current) inputRef.current.value = '';
        });
      })
      .catch(() => {
        /* map key / Places API missing — input still usable as a no-op */
      });

    return () => {
      cancelled = true;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [disabled]);

  return (
    <input
      ref={inputRef}
      type="search"
      disabled={disabled}
      placeholder="Search a place in India to add a stop…"
      className="tf-field"
      autoComplete="off"
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.preventDefault();
      }}
    />
  );
}
