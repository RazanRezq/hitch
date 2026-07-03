'use client';
import { useQuery } from '@tanstack/react-query';
import type { CreateBookingInput, BookingStatus, Currency } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export interface CreateBookingResponse {
  bookingId: string;
  code: string | null;
  clientSecret: string;
  displayPrice: number;
  displayCurrency: Currency;
  status: BookingStatus;
  guestToken?: string;
}

/**
 * Creates the booking + manual-capture PaymentIntent for the current draft and
 * holds the result for the payment step.
 *
 * Deliberately a query, not a mutation fired from an effect. TanStack Query
 * single-flights by key and caches the result in the shared client, so React
 * StrictMode's dev double-mount (and any accidental remount) issues exactly ONE
 * POST and every observer — before or after the remount — reads the same result.
 * A `useMutation` fired from `useEffect` loses its result when StrictMode swaps
 * the observer on remount, which left the payment step stuck on "Preparing…".
 *
 * All refetch triggers are off so this side-effecting POST never silently
 * re-runs (focus/reconnect/mount). A changed draft produces a new key → a new
 * booking; identical inputs reuse the first. Pass `null` to keep it disabled
 * until the draft is complete.
 */
export function useBookingIntent(input: CreateBookingInput | null) {
  return useQuery<CreateBookingResponse, Error>({
    queryKey: ['booking-intent', input],
    enabled: input !== null,
    queryFn: () =>
      apiClient.post<CreateBookingResponse>(API_ROUTES.bookings.create, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
