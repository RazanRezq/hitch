'use client';
import { useMutation } from '@tanstack/react-query';
import type { CreateBookingInput, BookingStatus, Currency } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export interface CreateBookingResponse {
  bookingId: string;
  clientSecret: string;
  displayPrice: number;
  displayCurrency: Currency;
  status: BookingStatus;
  guestToken?: string;
}

export function useCreateBooking() {
  return useMutation<CreateBookingResponse, Error, CreateBookingInput>({
    mutationFn: (input) =>
      apiClient.post<CreateBookingResponse>(API_ROUTES.bookings.create, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
  });
}
