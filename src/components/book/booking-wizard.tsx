'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPresetTrip } from '@/lib/types';
import { useBookingDraft } from '@/stores/booking-draft';
import { QuoteStep } from './quote-step';
import { PassengerDetailsStep } from './passenger-details-step';
import { PaymentStep } from './payment-step';
import { StepProgress } from './step-progress';

/**
 * The booking wizard. Hydrates from `?preset=<id>` on mount; thereafter the
 * Zustand draft store is the source of truth. We do not persist the draft
 * between sessions — see src/stores/booking-draft.ts.
 */
export function BookingWizard({ initialPreset }: { initialPreset: string | null }) {
  const locale = useLocale();
  const t = useTranslations('book');
  const draft = useBookingDraft();

  useEffect(() => {
    const preset = getPresetTrip(initialPreset);
    if (preset && !draft.pickup) {
      draft.setRoute(preset.pickup, preset.dropoff, preset.pickupAirportCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPreset]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-5 py-8 md:py-12">
      <header className="flex items-center justify-between gap-4">
        <Link
          href={`/${locale}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('backHome')}</span>
        </Link>
        <StepProgress current={draft.step} />
      </header>

      <section>
        {draft.step === 'quote' && <QuoteStep />}
        {draft.step === 'details' && <PassengerDetailsStep />}
        {draft.step === 'payment' && <PaymentStep />}
      </section>
    </main>
  );
}
