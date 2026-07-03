'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IssueReceiptInput, ReceiptSource } from '@/lib/types';
import { apiClient } from '../../client';
import { API_ROUTES } from '../../routes';
import type { AdminReceiptDetail, AdminReceiptListItem, ListEnvelope } from './types';

export interface AdminReceiptsParams {
  page?: number;
  pageSize?: number;
  q?: string;
  source?: ReceiptSource;
  sort?: string;
}

function buildQuery(p: AdminReceiptsParams): string {
  const sp = new URLSearchParams();
  if (p.page) sp.set('page', String(p.page));
  if (p.pageSize) sp.set('pageSize', String(p.pageSize));
  if (p.q) sp.set('q', p.q);
  if (p.source) sp.set('source', p.source);
  if (p.sort) sp.set('sort', p.sort);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function useAdminReceipts(params: AdminReceiptsParams = {}) {
  return useQuery<ListEnvelope<AdminReceiptListItem>, Error>({
    queryKey: ['admin', 'receipts', params],
    queryFn: () =>
      apiClient.get<ListEnvelope<AdminReceiptListItem>>(
        `${API_ROUTES.admin.receipts.list}${buildQuery(params)}`,
      ),
    placeholderData: (prev) => prev,
  });
}

export function useAdminReceipt(id: string | undefined) {
  return useQuery<AdminReceiptDetail, Error>({
    queryKey: ['admin', 'receipt', id],
    enabled: !!id,
    queryFn: () => apiClient.get<AdminReceiptDetail>(API_ROUTES.admin.receipts.byId(id!)),
  });
}

export function useIssueReceipt() {
  const qc = useQueryClient();
  return useMutation<AdminReceiptDetail, Error, IssueReceiptInput>({
    mutationFn: (input) =>
      apiClient.post<AdminReceiptDetail>(API_ROUTES.admin.receipts.create, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'receipts'] }),
  });
}
