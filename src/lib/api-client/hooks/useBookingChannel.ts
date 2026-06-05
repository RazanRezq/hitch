'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_CHANNELS } from '@/lib/types';
import { HitchWsClient } from '../ws';

export type WsStatus = 'connecting' | 'live' | 'offline';

/**
 * Subscribes the booking-status view to its `booking:{id}` realtime channel.
 *
 * Server state stays owned by TanStack Query: an event is treated as a nudge to
 * refetch the authoritative booking record (not as the source of truth), so the
 * UI reacts instantly to status changes instead of waiting for the poll. The
 * `useBooking` poll remains as a fallback when the socket is offline.
 *
 * The subscription + socket are torn down on unmount / id change.
 */
export function useBookingChannel(
  bookingId: string | undefined,
  guestToken?: string,
): WsStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    if (!bookingId) return;

    const client = new HitchWsClient({
      onOpen: () => setStatus('live'),
      onClose: () => setStatus('offline'),
      onError: () => setStatus('offline'),
    });

    const unsubscribe = client.subscribe(
      WS_CHANNELS.booking(bookingId),
      () => {
        void queryClient.invalidateQueries({
          queryKey: ['booking', bookingId, guestToken ?? null],
        });
      },
      // Unauthenticated passengers authorize the channel with their guest token.
      guestToken,
    );

    return () => {
      unsubscribe();
      client.close();
    };
  }, [bookingId, guestToken, queryClient]);

  return status;
}
