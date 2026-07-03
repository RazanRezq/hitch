'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export interface FleetStatusResponse {
  /** Drivers currently on shift (DriverLocation.isOnline === true). */
  onlineDrivers: number;
}

/**
 * Public live count of cars on shift, for the landing header strip. Polls on a
 * relaxed cadence — the number moves slowly and this hits an anonymous endpoint,
 * so there's no need for tight refresh. Pass `enabled: false` on surfaces that
 * don't render the strip (e.g. the minimal header).
 */
export function useFleetStatus(enabled = true) {
  return useQuery<FleetStatusResponse, Error>({
    queryKey: ['fleet', 'status'],
    queryFn: () => apiClient.get<FleetStatusResponse>(API_ROUTES.fleet.status),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
