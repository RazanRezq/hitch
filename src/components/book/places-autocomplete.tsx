'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface PlacePick {
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
  inputClassName,
  hideStatus = false,
}: {
  placeholder?: string;
  defaultValue?: string;
  onPick: (pick: PlacePick) => void;
  className?: string;
  /** Override the input's class so the host can match its own design (hero search row). */
  inputClassName?: string;
  /** When true, suppresses the loading / error span. Use inside dense layouts. */
  hideStatus?: boolean;
}) {
  const t = useTranslations('places');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);
  const [hasError, setHasError] = useState(false);

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
        // Keep the underlying reason in the dev console; user sees the
        // localized "Map unavailable" label.
        console.error('[places]', err);
        if (!cancelled) setHasError(true);
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
        disabled={hasError}
        className={inputClassName ?? 'w-full rounded-lg border bg-card px-3 py-2.5 text-sm'}
      />
      {!hideStatus && !ready && !hasError && (
        <span className="text-muted-foreground mt-1 block text-xs">{t('loading')}</span>
      )}
      {!hideStatus && hasError && (
        <span className="text-destructive mt-1 block text-xs" role="alert">
          {t('error')}
        </span>
      )}
    </div>
  );
}
