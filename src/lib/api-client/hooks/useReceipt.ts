'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';
import type { AdminReceiptDetail } from './admin/types';

/** Full receipt shape returned by the public GET /api/receipts/:id endpoint. */
export type ReceiptDetail = AdminReceiptDetail;

/**
 * Fetch a receipt by id from the PUBLIC endpoint (no auth) — backs the public
 * receipt page the QR points to. Receipts are immutable, so the result never
 * goes stale.
 */
export function usePublicReceipt(id: string | undefined) {
  return useQuery<ReceiptDetail, Error>({
    queryKey: ['receipt', id],
    enabled: !!id,
    staleTime: Infinity,
    queryFn: () => apiClient.get<ReceiptDetail>(API_ROUTES.receipts.byId(id!)),
  });
}
