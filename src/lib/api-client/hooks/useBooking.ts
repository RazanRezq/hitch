'use client';
import { useQuery } from '@tanstack/react-query';
import type { BookingStatus, Currency, VehicleType } from '@/lib/types';
import { BOOKING_STATUSES } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export interface BookingDetailResponse {
  id: string;
  status: BookingStatus;
  scheduledTime: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  pickupAirportCode: string | null;
  flightNumber: string | null;
  vehicleTypeRequested: VehicleType;
  passengerCount: number;
  basePriceISK: number;
  displayCurrency: Currency;
  displayPrice: number;
  exchangeRate: number;
  estimatedDistanceKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export function useBooking(bookingId: string | undefined, guestToken?: string) {
  return useQuery<BookingDetailResponse, Error>({
    queryKey: ['booking', bookingId, guestToken ?? null],
    enabled: !!bookingId,
    queryFn: () => {
      const path = guestToken
        ? `${API_ROUTES.bookings.byId(bookingId!)}?t=${encodeURIComponent(guestToken)}`
        : API_ROUTES.bookings.byId(bookingId!);
      return apiClient.get<BookingDetailResponse>(path);
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      return data.status === BOOKING_STATUSES.PENDING_PAYMENT ? 2000 : false;
    },
  });
}
