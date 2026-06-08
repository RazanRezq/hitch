'use client';
import { useMutation } from '@tanstack/react-query';
import type { FeedbackSubmitValues } from '@/lib/types';
import { apiClient } from '../client';
import { API_ROUTES } from '../routes';

export interface SubmitFeedbackResponse {
  ok: boolean;
  id?: string;
  reference?: string | null;
}

// Takes the schema's parsed output: incidentDateTime is a Date here, which
// JSON-serializes to an ISO …Z string the API re-parses to the same instant.
export function useSubmitFeedback() {
  return useMutation<SubmitFeedbackResponse, Error, FeedbackSubmitValues>({
    mutationFn: (input) =>
      apiClient.post<SubmitFeedbackResponse>(API_ROUTES.feedback.submit, input, {
        idempotencyKey: crypto.randomUUID(),
      }),
    retry: false,
  });
}
