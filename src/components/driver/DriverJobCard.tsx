'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Navigation, Phone, Plane, Users } from 'lucide-react';
import { BOOKING_STATUSES, driverNextStatus } from '@/lib/types';
import { formatCurrency, formatDateTime, formatTime, type Locale } from '@/lib/i18n-shared';
import { useAdvanceJob, type DriverJob } from '@/lib/api-client/hooks/driver';
import { ApiError } from '@/lib/api-client';
import { Button, buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { cn } from '@/lib/ui';

/** Google Maps deep link — opens the phone's navigation app with the destination set. */
function mapsUrl(dest: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

// Iceland is UTC+0 year-round, so comparing UTC days matches the local day.
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function scheduledLabel(iso: string, locale: Locale): string {
  return isToday(iso) ? formatTime(iso, locale) : formatDateTime(iso, locale);
}

/**
 * The active job, full size: route, passenger contact, navigation deep link and
 * the single big forward-path button (label = the next DRIVER_NEXT_STATUS step).
 * Completing a trip needs a second tap within 4s — it's the one step that ends
 * the job, and gloved airport taps deserve an undo window.
 */
export function DriverJobCard({ job }: { job: DriverJob }) {
  const t = useTranslations('driver');
  const locale = useLocale() as Locale;
  const advance = useAdvanceJob();
  const next = driverNextStatus(job.status);
  const needsConfirm = next === BOOKING_STATUSES.COMPLETED;

  // The confirm is "armed" only for the status it was tapped on — a status
  // change (or the 4s timer) disarms it without needing a reset effect.
  const [armedFor, setArmedFor] = useState<string | null>(null);
  const armed = armedFor === job.status;
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );

  function onAdvance() {
    if (!next || advance.isPending) return;
    if (needsConfirm && !armed) {
      setArmedFor(job.status);
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
      disarmTimer.current = setTimeout(() => setArmedFor(null), 4_000);
      return;
    }
    setArmedFor(null);
    advance.mutate({ bookingId: job.id, to: next });
  }

  // Until the passenger is in the car, the driver is heading to the pickup.
  const navDest = job.status === BOOKING_STATUSES.IN_TRANSIT ? job.dropoff : job.pickup;
  const conflict = advance.error instanceof ApiError && advance.error.status === 409;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-gradient-to-r from-primary/5 to-secondary/5 px-4 py-3">
        <StatusBadge status={job.status} />
        <span className="text-sm font-semibold">{scheduledLabel(job.scheduledTime, locale)}</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-[auto_1fr] gap-x-3">
          <div className="flex flex-col items-center pt-1.5">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
            <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />
            <span className="size-2.5 rounded-full border-2 border-secondary" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('jobs.pickup')}
                {job.pickupAirportCode ? ` · ${job.pickupAirportCode}` : ''}
              </p>
              <p className="text-sm font-medium">{job.pickup.address}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('jobs.dropoff')}</p>
              <p className="text-sm font-medium">{job.dropoff.address}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            {job.passengerCount}
          </span>
          {job.flightNumber && (
            <span className="inline-flex items-center gap-1.5">
              <Plane className="size-4" aria-hidden="true" />
              <span className="text-ltr font-mono">{job.flightNumber}</span>
            </span>
          )}
          <span className="ms-auto font-semibold text-foreground">
            {formatCurrency(job.basePriceISK, 'ISK', locale)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
          <span className="min-w-0 truncate text-sm font-medium">
            {job.passenger.name ?? t('jobs.passengerFallback')}
          </span>
          {job.passenger.phone && (
            <a
              href={`tel:${job.passenger.phone}`}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <Phone className="size-4" aria-hidden="true" />
              {t('jobs.call')}
            </a>
          )}
        </div>

        <a
          href={mapsUrl(navDest)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
        >
          <Navigation className="size-4" aria-hidden="true" />
          {t('jobs.navigate')}
        </a>

        {next && (
          <Button
            size="lg"
            className="h-14 w-full text-base font-semibold"
            onClick={onAdvance}
            disabled={advance.isPending}
          >
            <span aria-live="polite">{armed ? t('advance.confirm') : t(`advance.${next}`)}</span>
            {!armed && <ArrowRight className="size-5" aria-hidden="true" />}
          </Button>
        )}
        {advance.isError && (
          <p className="text-center text-xs text-destructive" role="alert">
            {conflict ? t('advance.conflict') : t('error')}
          </p>
        )}
      </div>
    </article>
  );
}

/** Compact row for upcoming / completed jobs. */
export function DriverJobRow({ job }: { job: DriverJob }) {
  const locale = useLocale() as Locale;
  const done = job.status === BOOKING_STATUSES.COMPLETED;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5',
        done && 'opacity-70',
      )}
    >
      <span className="whitespace-nowrap text-sm font-medium">
        {scheduledLabel(job.scheduledTime, locale)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {job.pickup.address} → {job.dropoff.address}
      </span>
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-secondary" aria-hidden="true" />
      ) : (
        <StatusBadge status={job.status} />
      )}
    </div>
  );
}
