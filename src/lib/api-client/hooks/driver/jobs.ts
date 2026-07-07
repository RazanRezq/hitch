'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingStatus, VehicleType } from '@/lib/types';
import { apiClient, ApiError } from '../../client';
import { API_ROUTES } from '../../routes';

export interface DriverVehicle {
  id: string;
  make: string;
  model: string;
  licensePlate: string;
  vehicleType: VehicleType;
  capacity: number;
}

export interface DriverMe {
  id: string;
  name: string | null;
  email: string;
  isOnline: boolean;
  vehicle: DriverVehicle | null;
}

export interface DriverJob {
  id: string;
  code: string | null;
  status: BookingStatus;
  scheduledTime: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  pickupAirportCode: string | null;
  flightNumber: string | null;
  passengerCount: number;
  vehicleTypeRequested: VehicleType;
  basePriceISK: number;
  passenger: { name: string | null; phone: string | null };
  actualPickupAt: string | null;
  actualDropoffAt: string | null;
}

export function useDriverMe() {
  return useQuery<DriverMe, Error>({
    queryKey: ['driver', 'me'],
    queryFn: () => apiClient.get<DriverMe>(API_ROUTES.driver.me),
    staleTime: 5 * 60_000,
  });
}

export function useDriverJobs() {
  return useQuery<{ items: DriverJob[] }, Error>({
    queryKey: ['driver', 'jobs'],
    queryFn: () => apiClient.get<{ items: DriverJob[] }>(API_ROUTES.driver.jobs),
    // WS nudges (driver jobs channel) are the primary signal; this poll is the
    // fallback for flaky in-car connectivity.
    refetchInterval: 30_000,
  });
}

export function useAdvanceJob() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: BookingStatus },
    Error,
    { bookingId: string; to: BookingStatus }
  >({
    mutationFn: ({ bookingId, to }) =>
      apiClient.post<{ id: string; status: BookingStatus }>(
        API_ROUTES.driver.advance(bookingId),
        { to },
        { idempotencyKey: crypto.randomUUID() },
      ),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['driver', 'jobs'] });
    },
    onError: (err) => {
      // 409 = the job moved under us (double tap or dispatcher action) — resync.
      if (err instanceof ApiError && err.status === 409) {
        void qc.invalidateQueries({ queryKey: ['driver', 'jobs'] });
      }
    },
  });
}
