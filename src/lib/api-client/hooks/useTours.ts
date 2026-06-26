'use client';
import { useQuery } from '@tanstack/react-query';
import type { TourCatalogResponse } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

/**
 * The sightseeing tour catalog (prices in every currency, both passenger tiers).
 * Prices change rarely — treat like the pricing zones (5 min stale) per CLAUDE.md
 * TanStack Query stale-time table.
 */
export function useTours() {
  return useQuery<TourCatalogResponse>({
    queryKey: ['tours'],
    queryFn: () => apiClient.get<TourCatalogResponse>(API_ROUTES.tours.list),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
