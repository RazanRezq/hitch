'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';

export interface EarningsTripDto {
  id: string;
  code: string | null;
  scheduledTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  amountISK: number;
}

export interface DriverEarningsDto {
  driverId: string;
  driverName: string | null;
  driverEmail: string;
  tripCount: number;
  grossISK: number;
  trips: EarningsTripDto[];
}

export interface EarningsReportDto {
  from: string;
  to: string;
  drivers: DriverEarningsDto[];
  totals: { tripCount: number; grossISK: number };
  excluded: { refunded: number; unpaid: number; unassigned: number };
}

export interface EarningsParams {
  /** ISO datetimes; server defaults to month-to-date when omitted. */
  from?: string;
  to?: string;
}

export function useAdminEarnings(params: EarningsParams = {}) {
  const sp = new URLSearchParams();
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  const qs = sp.toString();
  return useQuery<EarningsReportDto, Error>({
    queryKey: ['admin', 'earnings', params],
    queryFn: () =>
      apiClient.get<EarningsReportDto>(
        `${API_ROUTES.admin.earnings.report}${qs ? `?${qs}` : ''}`,
      ),
  });
}
