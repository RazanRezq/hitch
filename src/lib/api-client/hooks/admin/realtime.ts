'use client';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_CHANNELS } from '@/lib/types';
import { useAdminDispatch, type DriverLocation } from '@/stores/admin-dispatch';
import { HitchWsClient } from '../../ws';

export type WsStatus = 'connecting' | 'live' | 'offline';

/**
 * Subscribe to the staff-only `driver-locations` channel and feed positions into
 * the dispatch store. Mirrors useBookingChannel's lifecycle (client per mount,
 * torn down on unmount). Live location is realtime-owned, not TanStack Query.
 */
export function useDriverLocations(): WsStatus {
  const upsert = useAdminDispatch((s) => s.upsertLocation);
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    const client = new HitchWsClient({
      onOpen: () => setStatus('live'),
      onClose: () => setStatus('offline'),
      onError: () => setStatus('offline'),
    });

    const unsubscribe = client.subscribe(WS_CHANNELS.driverLocations, (payload) => {
      const p = payload as Partial<DriverLocation> & { driverId?: unknown };
      if (typeof p.driverId === 'string' && typeof p.lat === 'number' && typeof p.lng === 'number') {
        upsert({
          driverId: p.driverId,
          lat: p.lat,
          lng: p.lng,
          heading: typeof p.heading === 'number' ? p.heading : null,
          isOnline: p.isOnline ?? true,
        });
      }
    });

    return () => {
      unsubscribe();
      client.close();
    };
  }, [upsert]);

  return status;
}

/**
 * Subscribe to `dispatch:global`. Treat events as a nudge to refetch the pending
 * bookings queue (server state stays owned by TanStack Query).
 */
export function useDispatchFeed(): WsStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    const client = new HitchWsClient({
      onOpen: () => setStatus('live'),
      onClose: () => setStatus('offline'),
      onError: () => setStatus('offline'),
    });

    const unsubscribe = client.subscribe(WS_CHANNELS.dispatchGlobal, () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    });

    return () => {
      unsubscribe();
      client.close();
    };
  }, [queryClient]);

  return status;
}
