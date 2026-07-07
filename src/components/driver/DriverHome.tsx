'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserButton } from '@clerk/nextjs';
import { Car, MapPin } from 'lucide-react';
import { BOOKING_STATUSES, LOCALES, type BookingStatus } from '@/lib/types';
import {
  useDriverJobs,
  useDriverMe,
  useDriverRealtime,
} from '@/lib/api-client/hooks/driver';
import { useChangeLocale } from '@/lib/use-change-locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/ui';
import { DriverJobCard, DriverJobRow } from './DriverJobCard';

/** A job the driver is mid-flow on — exactly one of these can exist at a time. */
const IN_PROGRESS: readonly BookingStatus[] = [
  BOOKING_STATUSES.DRIVER_ARRIVING,
  BOOKING_STATUSES.DRIVER_ARRIVED,
  BOOKING_STATUSES.IN_TRANSIT,
];

/**
 * The driver's one-screen home: shift (GPS) toggle, the current job with its
 * one big forward button, upcoming jobs and today's completed runs. Mobile-web
 * first — this is what a driver has open on the dash of the car.
 */
export function DriverHome() {
  const t = useTranslations('driver');
  const { locale: currentLocale, change } = useChangeLocale();

  const meQuery = useDriverMe();
  const jobsQuery = useDriverJobs();
  const me = meQuery.data;

  // Until the driver touches the toggle, the server's isOnline flag is the
  // shift state (so an in-progress shift survives a reload); after the first
  // tap the override is client truth for this session.
  const [shiftOverride, setShiftOverride] = useState<boolean | null>(null);
  const streaming = shiftOverride ?? me?.isOnline ?? false;

  const jobs = jobsQuery.data?.items ?? [];
  const inProgress = jobs.find((j) => IN_PROGRESS.includes(j.status));
  const active = inProgress ?? jobs.find((j) => j.status === BOOKING_STATUSES.ACCEPTED);
  const upcoming = jobs.filter(
    (j) => j.status === BOOKING_STATUSES.ACCEPTED && j.id !== active?.id,
  );
  const doneToday = jobs.filter((j) => j.status === BOOKING_STATUSES.COMPLETED);

  const { wsStatus, gpsStatus } = useDriverRealtime({
    driverId: me?.id,
    // Only an in-progress job rides along on location frames (passenger relay).
    activeBookingId: inProgress?.id,
    streaming,
  });

  const shiftHint = !streaming
    ? t('jobs.offShiftHint')
    : gpsStatus === 'denied'
      ? t('shift.denied')
      : gpsStatus === 'unavailable'
        ? t('shift.unavailable')
        : gpsStatus === 'acquiring'
          ? t('shift.acquiring')
          : wsStatus === 'live'
            ? t('shift.sharing')
            : t('connecting');

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 px-4 py-5 md:py-8">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight">Hitch</span>
          <span className="text-sm text-muted-foreground">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => change(l)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-xs font-medium uppercase transition-colors',
                  currentLocale === l
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <UserButton />
        </div>
      </header>

      {/* Shift toggle — the driver's "I'm working" switch. While on, the page
          streams GPS to dispatch (and the passenger, during a live trip). */}
      <section
        className={cn(
          'rounded-2xl border p-4 transition-colors',
          streaming
            ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10'
            : 'bg-card',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  streaming && gpsStatus === 'active'
                    ? 'bg-secondary motion-safe:animate-pulse'
                    : streaming
                      ? 'bg-accent motion-safe:animate-pulse'
                      : 'bg-muted-foreground/40',
                )}
                aria-hidden="true"
              />
              {streaming ? t('shift.on') : t('shift.off')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
              {shiftHint}
            </p>
          </div>
          <Button
            size="lg"
            variant={streaming ? 'outline' : 'default'}
            onClick={() => setShiftOverride(!streaming)}
            disabled={!me}
          >
            {streaming ? t('shift.end') : t('shift.start')}
          </Button>
        </div>
        {me?.vehicle ? (
          <p className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Car className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {me.vehicle.make} {me.vehicle.model}
            </span>
            <span className="text-ltr ms-auto font-mono">{me.vehicle.licensePlate}</span>
          </p>
        ) : me ? (
          <p className="mt-3 border-t pt-3 text-xs text-destructive">{t('jobs.noVehicle')}</p>
        ) : null}
      </section>

      {jobsQuery.isError ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('error')}</p>
          <Button variant="outline" size="sm" onClick={() => void jobsQuery.refetch()}>
            {t('retry')}
          </Button>
        </section>
      ) : jobsQuery.isLoading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {active ? (
            <section aria-label={t('jobs.current')}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('jobs.current')}
              </h2>
              <DriverJobCard job={active} />
            </section>
          ) : (
            <section className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-card/50 p-8 text-center">
              <MapPin className="size-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium">{t('jobs.empty')}</p>
              <p className="max-w-xs text-sm text-muted-foreground">{t('jobs.emptyHint')}</p>
            </section>
          )}

          {upcoming.length > 0 && (
            <section aria-label={t('jobs.upcoming')}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('jobs.upcoming')}
              </h2>
              <div className="flex flex-col gap-2">
                {upcoming.map((j) => (
                  <DriverJobRow key={j.id} job={j} />
                ))}
              </div>
            </section>
          )}

          {doneToday.length > 0 && (
            <section aria-label={t('jobs.doneToday', { count: doneToday.length })}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('jobs.doneToday', { count: doneToday.length })}
              </h2>
              <div className="flex flex-col gap-2">
                {doneToday.map((j) => (
                  <DriverJobRow key={j.id} job={j} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
