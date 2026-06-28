'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPresetTrip } from '@/lib/types';
import { useBookingDraft, type DraftPoint } from '@/stores/booking-draft';
import type { BookingSearchParams } from '@/app/[locale]/book/page';
import { QuoteStep } from './quote-step';
import { PassengerDetailsStep } from './passenger-details-step';
import { PaymentStep } from './payment-step';
import { StepProgress } from './step-progress';

/**
 * The booking wizard. Hydrates from the URL search params on mount; thereafter
 * the Zustand draft store is the source of truth. We do not persist the draft
 * between sessions — see src/stores/booking-draft.ts.
 *
 * Resolution order for the route:
 *   1. ?preset=<id> wins if known.
 *   2. Else, all six custom-trip params must parse cleanly.
 *   3. Either way, ?pax= and ?scheduledTime= override the draft defaults.
 *
 * We guard with `!draft.pickup` so a hot reload mid-flow doesn't blow away
 * the in-progress draft.
 */
export function BookingWizard({ initialSearch }: { initialSearch: BookingSearchParams }) {
  const locale = useLocale();
  const t = useTranslations('book');
  const draft = useBookingDraft();

  useEffect(() => {
    if (draft.pickup) return;

    const route = parseRoute(initialSearch);
    if (route) {
      draft.setRoute(route.pickup, route.dropoff, {
        pickupAirportCode: route.pickupAirportCode,
        via: route.via,
        combo: route.combo,
      });
    }

    const pax = parsePax(initialSearch.pax);
    if (pax !== null) draft.setPassengerCount(pax);

    const scheduledTime = parseScheduledTime(initialSearch.scheduledTime);
    if (scheduledTime) draft.setScheduledTime(scheduledTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

interface ParsedRoute {
  pickup: DraftPoint;
  dropoff: DraftPoint;
  via?: DraftPoint;
  pickupAirportCode?: string;
  combo?: boolean;
}

function parseRoute(s: BookingSearchParams): ParsedRoute | null {
  const preset = getPresetTrip(s.preset);
  if (preset) {
    return {
      pickup: { ...preset.pickup },
      dropoff: { ...preset.dropoff },
      via: preset.via ? { ...preset.via } : undefined,
      pickupAirportCode: preset.pickupAirportCode,
      combo: preset.combo,
    };
  }
  const pickup = parseDraftPoint(s.pickupLat, s.pickupLng, s.pickupAddress);
  const dropoff = parseDraftPoint(s.dropoffLat, s.dropoffLng, s.dropoffAddress);
  if (!pickup || !dropoff) return null;
  return { pickup, dropoff };
}

function parseDraftPoint(
  lat: string | undefined,
  lng: string | undefined,
  address: string | undefined,
): DraftPoint | null {
  if (!lat || !lng || !address) return null;
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
  if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return null;
  return { lat: latN, lng: lngN, address };
}

function parsePax(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 8) return null;
  return n;
}

function parseScheduledTime(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() < Date.now() - 60 * 1000) return null; // tolerate ~1min clock skew
  return d.toISOString();
}
