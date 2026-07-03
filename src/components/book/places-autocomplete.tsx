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

function loadPlaces(): Promise<google.maps.PlacesLibrary> {
  if (loaderPromise) return loaderPromise;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set'));
  }
  if (!configured) {
    setOptions({ key: apiKey });
    configured = true;
  }
  loaderPromise = importLibrary('places');
  return loaderPromise;
}

/**
 * Google Places autocomplete restricted to Iceland. Emits `{lat, lng, address}`
 * when the user picks a suggestion. Lazy-loads the Maps JS API on mount — no
 * Maps payload on pages that don't use this component.
 *
 * Built on `PlaceAutocompleteElement`, the current Places widget. The legacy
 * `places.Autocomplete` class is deprecated and unavailable to API keys created
 * after March 2025, so we mount the web component into a host ref rather than
 * binding an existing <input>. The element renders its own <input> (in shadow
 * DOM); typography inherits from the host, and the blend CSS for the hero lives
 * under `.hitch-place-ac` in editorial.css.
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
  /** Applied to the host element so the caller can match its own design (hero search row). */
  inputClassName?: string;
  /** When true, suppresses the loading / error span. Use inside dense layouts. */
  hideStatus?: boolean;
}) {
  const t = useTranslations('places');
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Keep the latest onPick without re-running the one-shot mount effect.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);
  const [ready, setReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let element: google.maps.places.PlaceAutocompleteElement | null = null;

    loadPlaces()
      .then((places) => {
        if (cancelled || !hostRef.current) return;
        element = new places.PlaceAutocompleteElement({
          includedRegionCodes: ['is'],
          // The hero renders its own leading icon and clear affordance, so drop
          // the widget's built-in chrome to let the input sit flush in the field.
          noInputIcon: true,
          noClearButton: true,
        });
        element.className = inputClassName ? `hitch-place-ac ${inputClassName}` : 'hitch-place-ac';
        if (placeholder) element.placeholder = placeholder;
        if (defaultValue) element.value = defaultValue;

        element.addEventListener('gmp-select', async (ev) => {
          const place = ev.placePrediction.toPlace();
          try {
            await place.fetchFields({
              fields: ['location', 'formattedAddress', 'displayName'],
            });
          } catch (err) {
            console.error('[places] fetchFields', err);
            return;
          }
          const loc = place.location;
          if (!loc) return;
          onPickRef.current({
            lat: loc.lat(),
            lng: loc.lng(),
            address: place.formattedAddress ?? place.displayName ?? '',
          });
        });

        hostRef.current.appendChild(element);
        setReady(true);
      })
      .catch((err: Error) => {
        // Keep the underlying reason in the dev console; user sees the
        // localized "Map unavailable" label + a plain fallback input.
        console.error('[places]', err);
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
      element?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      {/* Host for the <gmp-place-autocomplete> element (mounted imperatively). */}
      <div ref={hostRef} className="contents" />
      {hasError && (
        <input
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled
          className={inputClassName ?? 'w-full rounded-lg border bg-card px-3 py-2.5 text-sm'}
        />
      )}
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
