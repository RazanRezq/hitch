'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useAdminDispatch } from '@/stores/admin-dispatch';

const REYKJAVIK = { lat: 64.1466, lng: -21.9426 };
// AdvancedMarkerElement requires the map to be created with a Map ID (vector
// map). Use a project Map ID when configured; fall back to Google's DEMO_MAP_ID
// so local dev works without extra Cloud Console setup.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
// Per-frame easing toward the latest target (~exponential smoothing). Higher =
// snappier; 0.12 reaches a new position in roughly half a second at 60fps, well
// under the ~3s location cadence, so motion stays smooth without lagging.
const EASE = 0.12;

interface LatLng {
  lat: number;
  lng: number;
}

let configured = false;

/**
 * Live dispatch map. Lazy-loads the Maps JS API (same loader the passenger
 * autocomplete uses), centres on the Reykjavík/KEF corridor, and renders one
 * marker per online driver from the realtime dispatch store. Markers glide toward
 * each new WS position via requestAnimationFrame rather than snapping — unless the
 * user prefers reduced motion, in which case positions are set directly.
 */
export function DispatchMap() {
  const t = useTranslations('admin.dispatch');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const targetRef = useRef<Map<string, LatLng>>(new Map());
  const currentRef = useRef<Map<string, LatLng>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const locations = useAdminDispatch((s) => s.locations);

  // Init the map once (only when a key is configured — the no-key case renders
  // the "unavailable" state below, so no synchronous setState is needed here).
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    if (!configured) {
      setOptions({ key: apiKey });
      configured = true;
    }
    // 'marker' is loaded alongside 'maps' so google.maps.marker.AdvancedMarkerElement
    // is available by the time `ready` flips and the sync effect runs.
    Promise.all([importLibrary('maps'), importLibrary('marker')])
      .then(([maps]) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: REYKJAVIK,
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          mapId: MAP_ID,
        });
        setReady(true);
      })
      .catch((e: Error) => {
        console.error('[dispatch-map]', e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Sync markers + targets to the current driver positions (upsert + prune).
  // The rAF loop below animates toward `target`; new markers start at their
  // target, and reduced-motion sets positions directly.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const markers = markersRef.current;
    const seen = new Set<string>();

    for (const loc of Object.values(locations)) {
      seen.add(loc.driverId);
      const point = { lat: loc.lat, lng: loc.lng };
      targetRef.current.set(loc.driverId, point);

      const existing = markers.get(loc.driverId);
      if (!existing) {
        markers.set(
          loc.driverId,
          new google.maps.marker.AdvancedMarkerElement({
            position: point,
            map,
            title: loc.driverId,
          }),
        );
        currentRef.current.set(loc.driverId, { ...point });
      } else if (reducedMotion) {
        existing.position = point;
        currentRef.current.set(loc.driverId, { ...point });
      }
    }

    for (const [id, marker] of markers) {
      if (!seen.has(id)) {
        marker.map = null;
        markers.delete(id);
        targetRef.current.delete(id);
        currentRef.current.delete(id);
      }
    }
  }, [locations, ready, reducedMotion]);

  // Animation loop: glide each marker's current position toward its target.
  useEffect(() => {
    if (!ready || reducedMotion) return;
    let raf = 0;
    const tick = () => {
      for (const [id, marker] of markersRef.current) {
        const target = targetRef.current.get(id);
        const cur = currentRef.current.get(id);
        if (!target || !cur) continue;
        cur.lat += (target.lat - cur.lat) * EASE;
        cur.lng += (target.lng - cur.lng) * EASE;
        marker.position = { ...cur };
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, reducedMotion]);

  // Drop markers on unmount.
  useEffect(() => {
    const markers = markersRef.current;
    const targets = targetRef.current;
    const currents = currentRef.current;
    return () => {
      for (const m of markers.values()) m.map = null;
      markers.clear();
      targets.clear();
      currents.clear();
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
