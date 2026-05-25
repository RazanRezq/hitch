'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

interface PlacePick {
  lat: number;
  lng: number;
  address: string;
}

let configured = false;
let loaderPromise: Promise<google.maps.PlacesLibrary> | null = null;

function loadGoogleMaps(): Promise<google.maps.PlacesLibrary> {
  if (loaderPromise) return loaderPromise;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set'));
  }
  if (!configured) {
    setOptions({ key: apiKey });
    configured = true;
  }
  const p = importLibrary('places');
  loaderPromise = p;
  return p;
}

/**
 * Google Places autocomplete biased to Iceland. Emits `{lat, lng, address}`
 * when the user picks a suggestion. Lazy-loads the Maps JS API on mount —
 * no Maps payload on pages that don't use this component.
 *
 * For the first booking slice this is wired only as a "custom trip" entry;
 * preset trips use fixed coordinates from src/lib/types/preset-trips.ts.
 */
export function PlacesAutocomplete({
  placeholder,
  defaultValue,
  onPick,
  className,
}: {
  placeholder?: string;
  defaultValue?: string;
  onPick: (pick: PlacePick) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((places) => {
        if (cancelled || !inputRef.current) return;
        const ac = new places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'is' },
          fields: ['geometry', 'formatted_address', 'name'],
          types: ['geocode', 'establishment'],
        });
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          onPick({
            lat: loc.lat(),
            lng: loc.lng(),
            address: place.formatted_address ?? place.name ?? '',
          });
        });
        setReady(true);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={!!error}
        className="w-full rounded-lg border bg-card px-3 py-2.5 text-sm"
      />
      {!ready && !error && (
        <span className="text-muted-foreground mt-1 block text-xs">Loading map…</span>
      )}
      {error && (
        <span className="text-destructive mt-1 block text-xs" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
