'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useAdminDispatch } from '@/stores/admin-dispatch';

const REYKJAVIK = { lat: 64.1466, lng: -21.9426 };

let configured = false;

/**
 * Live dispatch map. Lazy-loads the Maps JS API (same loader the passenger
 * autocomplete uses), centres on the Reykjavík/KEF corridor, and renders one
 * marker per online driver from the realtime dispatch store. Positions update in
 * place as new WS locations arrive (the dev simulator feeds these in Phase 1).
 */
export function DispatchMap() {
  const t = useTranslations('admin.dispatch');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [error, setError] = useState(false);
  const locations = useAdminDispatch((s) => s.locations);

  // Init the map once (only when a key is configured — the no-key case renders
  // the "unavailable" state below, so no setState is needed here).
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    if (!configured) {
      setOptions({ key: apiKey });
      configured = true;
    }
    importLibrary('maps')
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: REYKJAVIK,
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
      })
      .catch((e: Error) => {
        console.error('[dispatch-map]', e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Sync markers to the current driver positions (upsert + prune).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const seen = new Set<string>();
    for (const loc of Object.values(locations)) {
      seen.add(loc.driverId);
      const existing = markers.get(loc.driverId);
      if (existing) {
        existing.setPosition({ lat: loc.lat, lng: loc.lng });
      } else {
        markers.set(
          loc.driverId,
          new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map,
            title: loc.driverId,
          }),
        );
      }
    }
    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markers.delete(id);
      }
    }
  }, [locations]);

  // Drop markers on unmount.
  useEffect(() => {
    const markers = markersRef.current;
    return () => {
      for (const m of markers.values()) m.setMap(null);
      markers.clear();
    };
  }, []);

  if (!apiKey || error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        {t('mapUnavailable')}
      </div>
    );
  }

  return <div ref={containerRef} className="size-full rounded-lg border" />;
}
