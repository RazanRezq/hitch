'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/lib/types';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';
import type { AdminVehicleListItem, ListEnvelope } from './types';

export interface AdminVehiclesParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: string;
}

function buildQuery(p: AdminVehiclesParams): string {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', String(p.page));
  if (p.pageSize) sp.set('pageSize', String(p.pageSize));
  if (p.q) sp.set('q', p.q);
  if (p.sort) sp.set('sort', p.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useAdminVehicles(params: AdminVehiclesParams = {}) {
  return useQuery<ListEnvelope<AdminVehicleListItem>, Error>({
    queryKey: ['admin', 'vehicles', params],
    queryFn: () =>
      apiClient.get<ListEnvelope<AdminVehicleListItem>>(
        `${API_ROUTES.admin.vehicles.list}${buildQuery(params)}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, CreateVehicleInput>({
    mutationFn: (input) =>
      apiClient.post<{ id: string }>(API_ROUTES.admin.vehicles.create, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'vehicles'] }),
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string }, Error, UpdateVehicleInput>({
    mutationFn: (input) => apiClient.patch<{ id: string }>(API_ROUTES.admin.vehicles.update(id), input),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'vehicles'] }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, { id: string }>({
    mutationFn: ({ id }) => apiClient.delete<{ ok: boolean }>(API_ROUTES.admin.vehicles.remove(id)),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'vehicles'] }),
  });
}
