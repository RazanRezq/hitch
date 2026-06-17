'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';
import type { AdminStats } from './types';

export function useAdminStats() {
  return useQuery<AdminStats, Error>({
    queryKey: ['admin', 'stats', 'overview'],
    queryFn: () => apiClient.get<AdminStats>(API_ROUTES.admin.stats.overview),
    refetchInterval: 30_000,
  });
}
