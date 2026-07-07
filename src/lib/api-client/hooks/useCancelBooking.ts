'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookingStatus } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

interface CancelResult {
  id: string;
  status: BookingStatus;
}

/**
 * Passenger self-cancel — valid for pre-capture statuses only
 * (PASSENGER_CANCELLABLE_STATUSES); the server voids the Stripe authorization.
 * Guests authenticate with the same `?t=` token the confirmation page uses.
 */
export function useCancelBooking(bookingId: string, guestToken?: string) {
  const qc = useQueryClient();
  return useMutation<CancelResult, Error, { reason?: string } | void>({
    mutationFn: (input) => {
      const path = guestToken
        ? `${API_ROUTES.bookings.cancel(bookingId)}?t=${encodeURIComponent(guestToken)}`
        : API_ROUTES.bookings.cancel(bookingId);
      return apiClient.post<CancelResult>(path, input ?? {}, {
        idempotencyKey: crypto.randomUUID(),
      });
    },
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
  });
}
