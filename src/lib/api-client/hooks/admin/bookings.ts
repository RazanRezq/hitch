'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingStatus } from '@/lib/types';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';
import type { AdminBookingDetail, AdminBookingListItem, ListEnvelope } from './types';

export interface AdminBookingsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: BookingStatus;
  sort?: string;
  from?: string;
  to?: string;
}

function buildQuery(params: AdminBookingsParams): string {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.q) sp.set('q', params.q);
  if (params.status) sp.set('status', params.status);
  if (params.sort) sp.set('sort', params.sort);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useAdminBookings(params: AdminBookingsParams = {}) {
  return useQuery<ListEnvelope<AdminBookingListItem>, Error>({
    queryKey: ['admin', 'bookings', params],
    queryFn: () =>
      apiClient.get<ListEnvelope<AdminBookingListItem>>(
        `${API_ROUTES.admin.bookings.list}${buildQuery(params)}`,
      ),
    placeholderData: (prev) => prev, // keep the table mounted across pagination
  });
}

export function useAdminBooking(id: string | undefined) {
  return useQuery<AdminBookingDetail, Error>({
    queryKey: ['admin', 'booking', id],
    enabled: !!id,
    queryFn: () => apiClient.get<AdminBookingDetail>(API_ROUTES.admin.bookings.byId(id!)),
  });
}

interface AssignResult {
  id: string;
  status: BookingStatus;
  driverId: string;
  vehicleId: string;
}

export function useAssignDriver(bookingId: string) {
  const qc = useQueryClient();
  return useMutation<AssignResult, Error, { driverId: string }>({
    mutationFn: (input) =>
      apiClient.post<AssignResult>(API_ROUTES.admin.bookings.assign(bookingId), input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}

interface StatusResult {
  id: string;
  status: BookingStatus;
}

export function useUpdateBookingStatus(bookingId: string) {
  const qc = useQueryClient();
  return useMutation<StatusResult, Error, { to: BookingStatus; reason?: string }>({
    mutationFn: (input) =>
      apiClient.post<StatusResult>(API_ROUTES.admin.bookings.status(bookingId), input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
}
