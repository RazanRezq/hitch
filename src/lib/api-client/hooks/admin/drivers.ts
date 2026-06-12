'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDriverInput, UpdateDriverInput } from '@/lib/types';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';
import type { AdminDriverDetail, AdminDriverListItem, ListEnvelope } from './types';

export interface AdminDriversParams {
  page?: number;
  pageSize?: number;
  q?: string;
  online?: boolean;
  sort?: string;
}

function buildQuery(p: AdminDriversParams): string {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', String(p.page));
  if (p.pageSize) sp.set('pageSize', String(p.pageSize));
  if (p.q) sp.set('q', p.q);
  if (p.online !== undefined) sp.set('online', String(p.online));
  if (p.sort) sp.set('sort', p.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useAdminDrivers(params: AdminDriversParams = {}) {
  return useQuery<ListEnvelope<AdminDriverListItem>, Error>({
    queryKey: ['admin', 'drivers', params],
    queryFn: () =>
      apiClient.get<ListEnvelope<AdminDriverListItem>>(
        `${API_ROUTES.admin.drivers.list}${buildQuery(params)}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useAdminDriver(id: string | undefined) {
  return useQuery<AdminDriverDetail, Error>({
    queryKey: ['admin', 'driver', id],
    enabled: !!id,
    queryFn: () => apiClient.get<AdminDriverDetail>(API_ROUTES.admin.drivers.byId(id!)),
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, CreateDriverInput>({
    mutationFn: (input) =>
      apiClient.post<{ id: string }>(API_ROUTES.admin.drivers.create, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] }),
  });
}

export function useUpdateDriver(id: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, UpdateDriverInput>({
    mutationFn: (input) => apiClient.patch<{ id: string }>(API_ROUTES.admin.drivers.update(id), input),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'driver', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });
}

export function useSetDriverOnline(id: string) {
  const qc = useQueryClient();
  return useMutation<{ driverId: string; isOnline: boolean }, Error, { isOnline: boolean }>({
    mutationFn: (input) =>
      apiClient.post<{ driverId: string; isOnline: boolean }>(
        API_ROUTES.admin.drivers.online(id),
        input,
      ),
    retry: false,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'driver', id] });
      void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });
}

export function useVerifyDocument(driverId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; verifiedAt: string }, Error, { docId: string }>({
    mutationFn: ({ docId }) =>
      apiClient.post<{ id: string; verifiedAt: string }>(
        API_ROUTES.admin.drivers.verifyDocument(driverId, docId),
        {},
      ),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'driver', driverId] }),
  });
}
