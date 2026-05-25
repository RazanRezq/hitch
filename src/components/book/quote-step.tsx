'use client';

import { useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Loader2, Minus, MoveRight, Plus } from 'lucide-react';
import { formatCurrencyMinor, formatDateTime, type Locale } from '@/lib/i18n-shared';
import { CURRENCIES, type Currency, type VehicleType } from '@/lib/types';
import { useQuote } from '@/lib/api-client/hooks/useQuote';
import { useBookingDraft } from '@/stores/booking-draft';
import { cn } from '@/lib/ui';

const VEHICLES: VehicleType[] = ['SEDAN', 'SUV', 'VAN'];

export function QuoteStep() {
  const t = useTranslations('book.quote');
  const locale = useLocale() as Locale;
  const draft = useBookingDraft();
  const quote = useQuote();

  const refetch = useMemo(
    () => () => {
      if (!draft.pickup || !draft.dropoff) return;
      quote.mutate({
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        vehicleType: draft.vehicleTypeRequested,
        displayCurrency: draft.displayCurrency,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.pickup, draft.dropoff, draft.vehicleTypeRequested, draft.displayCurrency],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (!draft.pickup || !draft.dropoff) {
    return (
      <div className="text-muted-foreground rounded-2xl border p-6 text-center">
        Pick a route on the home page to start booking.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
      </header>

      <RouteCard pickup={draft.pickup.address} dropoff={draft.dropoff.address} />

      <FieldGrid>
        <Field label={t('when')}>
          <input
            type="datetime-local"
            className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            value={toLocalInput(draft.scheduledTime)}
            onChange={(e) => draft.setScheduledTime(new Date(e.target.value).toISOString())}
          />
          <span className="text-muted-foreground mt-1 block text-xs">
            {formatDateTime(draft.scheduledTime, locale)}
          </span>
        </Field>

        <Field label={t('pax')}>
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <button
              type="button"
              onClick={() => draft.setPassengerCount(Math.max(1, draft.passengerCount - 1))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('pax')}
            >
              <Minus size={16} />
            </button>
            <span className="text-sm font-medium tabular-nums">{draft.passengerCount}</span>
            <button
              type="button"
              onClick={() => draft.setPassengerCount(Math.min(8, draft.passengerCount + 1))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t('pax')}
            >
              <Plus size={16} />
            </button>
          </div>
        </Field>
      </FieldGrid>

      <Field label={t('vehicleLabel')}>
        <div className="grid grid-cols-3 gap-2">
          {VEHICLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => draft.setVehicleType(v)}
              className={cn(
                'rounded-lg border bg-card px-3 py-3 text-sm font-medium transition-colors',
                draft.vehicleTypeRequested === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:border-primary/40',
              )}
              aria-pressed={draft.vehicleTypeRequested === v}
            >
              {t(`vehicle${capitalize(v)}` as 'vehicleSedan' | 'vehicleSuv' | 'vehicleVan')}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('currencyLabel')}>
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => draft.setCurrency(c)}
              className={cn(
                'rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-colors',
                draft.displayCurrency === c
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:border-primary/40',
              )}
              aria-pressed={draft.displayCurrency === c}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <PriceCard
        loading={quote.isPending}
        error={quote.isError ? t('error') : null}
        priceMinor={quote.data?.displayPrice ?? null}
        currency={(quote.data?.displayCurrency ?? draft.displayCurrency) as Currency}
        distanceKm={quote.data?.distanceKm ?? null}
        isAirportTrip={quote.data?.isAirportTrip ?? false}
        locale={locale}
        labels={{
          estimated: t('estimatedFare'),
          loading: t('loading'),
          airport: t('airportSurcharge'),
          distance: (km: number) => t('distance', { km: km.toFixed(1) }),
        }}
      />

      <button
        type="button"
        onClick={() => draft.setStep('details')}
        disabled={!quote.data}
        className="bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
      >
        {t('continueCta')}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function RouteCard({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider">From</span>
          <span className="text-sm font-medium">{pickup}</span>
        </div>
        <MoveRight className="text-muted-foreground mx-2 shrink-0" size={16} aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider">To</span>
          <span className="text-sm font-medium">{dropoff}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function PriceCard({
  loading,
  error,
  priceMinor,
  currency,
  distanceKm,
  isAirportTrip,
  locale,
  labels,
}: {
  loading: boolean;
  error: string | null;
  priceMinor: number | null;
  currency: Currency;
  distanceKm: number | null;
  isAirportTrip: boolean;
  locale: Locale;
  labels: { estimated: string; loading: string; airport: string; distance: (km: number) => string };
}) {
  return (
    <div
      className="rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-6"
      aria-live="polite"
    >
      <div className="text-muted-foreground text-xs uppercase tracking-wider">
        {labels.estimated}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-4xl font-semibold tabular-nums">
          {loading ? (
            <span className="text-muted-foreground inline-flex items-center gap-2 text-base font-normal">
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              {labels.loading}
            </span>
          ) : error ? (
            <span className="text-destructive text-base font-normal">{error}</span>
          ) : priceMinor !== null ? (
            formatCurrencyMinor(priceMinor, currency, locale)
          ) : (
            '—'
          )}
        </div>
      </div>
      <div className="text-muted-foreground mt-3 flex flex-wrap gap-3 text-xs">
        {distanceKm !== null && <span>{labels.distance(distanceKm)}</span>}
        {isAirportTrip && <span>· {labels.airport}</span>}
      </div>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function capitalize(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
