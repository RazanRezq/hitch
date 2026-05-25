'use client';
import { useMutation } from '@tanstack/react-query';
import type { QuoteRequestInput, QuoteResponse } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export function useQuote() {
  return useMutation<QuoteResponse, Error, QuoteRequestInput>({
    mutationFn: (input) => apiClient.post<QuoteResponse>(API_ROUTES.quotes.create, input),
  });
}
