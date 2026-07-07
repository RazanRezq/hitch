'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingStatus } from '@/lib/types';
import { apiClient, ApiError } from '../../client';
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

/** Machine-readable error code from a failed API response, if present. */
export function apiErrorCode(err: unknown): string | undefined {
  if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'code' in err.body) {
    return (err.body as { code?: string }).code;
  }
  return undefined;
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
    onError: (err) => {
      // An expired authorization cancels the booking server-side — refresh so the
      // now-cancelled booking leaves the "awaiting driver" list.
      if (apiErrorCode(err) === 'AUTHORIZATION_EXPIRED') {
        void qc.invalidateQueries({ queryKey: ['admin', 'booking', bookingId] });
        void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      }
    },
  });
}

interface StatusResult {
  id: string;
  status: BookingStatus;
}

interface RefundResult {
  id: string;
  refundId: string;
  paymentStatus: string;
}

/** Full refund by default; pass amountMinor for a partial refund. */
export function useRefundBooking(bookingId: string) {
  const qc = useQueryClient();
  return useMutation<RefundResult, Error, { amountMinor?: number; reason?: string }>({
    mutationFn: (input) =>
      apiClient.post<RefundResult>(API_ROUTES.admin.bookings.refund(bookingId), input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });
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
