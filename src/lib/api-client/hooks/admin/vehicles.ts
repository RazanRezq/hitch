'use client';
import { useQuery } from '@tanstack/react-query';
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
