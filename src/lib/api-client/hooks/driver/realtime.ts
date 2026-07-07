'use client';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_CHANNELS } from '@/lib/types';
import { HitchWsClient } from '../../ws';
import type { WsStatus } from '../useBookingChannel';

export type GpsStatus = 'idle' | 'acquiring' | 'active' | 'denied' | 'unavailable';

// CLAUDE.md "Driver Location": push a position over the socket every 3-5s.
const LOCATION_SEND_INTERVAL_MS = 4_000;

interface DriverRealtimeOptions {
  driverId: string | undefined;
  /** The in-progress job (DRIVER_ARRIVING…IN_TRANSIT) location frames should carry. */
  activeBookingId: string | undefined;
  /** Shift toggle — while true the browser streams GPS over the socket. */
  streaming: boolean;
}

/**
 * The driver page's single realtime connection:
 *  - subscribes `driver:{id}:jobs` — every server-side change to my jobs
 *    (assign, staff status change, cancel) nudges a jobs refetch, so no
 *    per-booking subscription is needed;
 *  - while on shift, streams geolocation frames every ~4s — the WS server fans
 *    them out to the dispatcher map / passenger and throttles its own DB writes
 *    (server/realtime/location-ingest.ts).
 *
 * One socket for both, independent of the shift toggle, so job nudges keep
 * arriving off shift and the server's offline-on-close cleanup fires exactly
 * when the page goes away.
 */
export function useDriverRealtime({ driverId, activeBookingId, streaming }: DriverRealtimeOptions): {
  wsStatus: WsStatus;
  gpsStatus: GpsStatus;
} {
  const queryClient = useQueryClient();
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  // What the geolocation callbacks last told us; display status derives from it.
  const [gpsSignal, setGpsSignal] = useState<'none' | 'active' | 'denied' | 'error'>('none');
  const wsRef = useRef<HitchWsClient | null>(null);
  // Refs (not effect deps): a job advancing must not restart the socket or watch.
  const bookingIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    bookingIdRef.current = activeBookingId;
  }, [activeBookingId]);

  // Socket + my-jobs channel. Mounted once per driver, before the GPS effect
  // below can run (streaming only turns on after the driver profile loaded).
  useEffect(() => {
    if (!driverId) return;
    const ws = new HitchWsClient({
      onOpen: () => setWsStatus('live'),
      onClose: () => setWsStatus('offline'),
      onError: () => setWsStatus('offline'),
    });
    wsRef.current = ws;
    const unsubscribe = ws.subscribe(WS_CHANNELS.driverJobs(driverId), () => {
      void queryClient.invalidateQueries({ queryKey: ['driver', 'jobs'] });
    });
    return () => {
      unsubscribe();
      ws.close();
      wsRef.current = null;
    };
  }, [driverId, queryClient]);

  // GPS streaming while on shift.
  useEffect(() => {
    const ws = wsRef.current;
    if (!streaming || !ws) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsSignal('active');
        const now = Date.now();
        if (now - lastSentAt < LOCATION_SEND_INTERVAL_MS) return;
        lastSentAt = now;
        const rawHeading = pos.coords.heading;
        ws.push({
          action: 'location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          // heading is NaN when the device is stationary — send null instead.
          heading:
            typeof rawHeading === 'number' && Number.isFinite(rawHeading) ? rawHeading : null,
          bookingId: bookingIdRef.current ?? null,
        });
      },
      (err) => {
        setGpsSignal(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      // Best-effort end-of-shift; the server also flips the driver offline when
      // the socket closes, so a dropped frame can't strand a ghost car on the map.
      ws.push({ action: 'offline' });
    };
  }, [streaming]);

  // Derived, so no effect ever needs to reset it. While off shift it's 'idle';
  // browsers without geolocation surface as a watch error → 'unavailable'.
  const gpsStatus: GpsStatus = !streaming
    ? 'idle'
    : gpsSignal === 'none'
      ? 'acquiring'
      : gpsSignal === 'denied'
        ? 'denied'
        : gpsSignal === 'error'
          ? 'unavailable'
          : 'active';

  return { wsStatus, gpsStatus };
}
