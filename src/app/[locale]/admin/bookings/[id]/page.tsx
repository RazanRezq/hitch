'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plane } from 'lucide-react';
import type { BookingStatus, Locale } from '@/lib/types';
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  RECEIPT_SOURCES,
  WS_CHANNELS,
} from '@/lib/types';
import { HitchWsClient } from '@/lib/api-client';
import { useAdminBooking, useIssueReceipt, useUpdateBookingStatus } from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDateTime } from '@/lib/i18n-shared';
import { cn } from '@/lib/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AssignDriverDialog } from '@/components/admin/AssignDriverDialog';
import { RefundDialog } from '@/components/admin/RefundDialog';

/**
 * The single legal "advance" step a dispatcher can drive from each active status.
 * With no driver app in Phase 1, the dispatcher walks the trip forward manually;
 * each click hits POST /:id/status, which the state machine validates and audits.
 * Terminal and pre-assignment statuses have no entry — Assign handles
 * CONFIRMED/SEARCHING, and DRIVER_ARRIVED keeps its separate No-Show action.
 */
const ADVANCE_NEXT = {
  [BOOKING_STATUSES.ACCEPTED]: { to: BOOKING_STATUSES.DRIVER_ARRIVING, labelKey: 'markArriving' },
  [BOOKING_STATUSES.DRIVER_ARRIVING]: { to: BOOKING_STATUSES.DRIVER_ARRIVED, labelKey: 'markArrived' },
  [BOOKING_STATUSES.DRIVER_ARRIVED]: { to: BOOKING_STATUSES.IN_TRANSIT, labelKey: 'startTrip' },
  [BOOKING_STATUSES.IN_TRANSIT]: { to: BOOKING_STATUSES.COMPLETED, labelKey: 'completeTrip' },
} as const satisfies Partial<Record<BookingStatus, { to: BookingStatus; labelKey: string }>>;

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{children}</span>
    </div>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0]! : (params.id ?? '');
  const locale = useLocale() as Locale;
  const t = useTranslations('admin.bookings');
  const tEvent = useTranslations('admin.event');
  const tAdmin = useTranslations('admin');
  const qc = useQueryClient();

  const router = useRouter();
  const query = useAdminBooking(id);
  const updateStatus = useUpdateBookingStatus(id);
  const issueReceipt = useIssueReceipt();
  const [assignOpen, setAssignOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  async function onIssueReceipt() {
    try {
      const receipt = await issueReceipt.mutateAsync({
        source: RECEIPT_SOURCES.BOOKING,
        bookingId: id,
      });
      router.push(`/${locale}/admin/receipts/${receipt.id}`);
    } catch {
      /* surfaced via issueReceipt.isError */
    }
  }

  // Realtime nudge: refetch this booking when its channel emits a status change.
  useEffect(() => {
    if (!id) return;
    const client = new HitchWsClient();
    const unsubscribe = client.subscribe(WS_CHANNELS.booking(id), () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'booking', id] });
    });
    return () => {
      unsubscribe();
      client.close();
    };
  }, [id, qc]);

  const backHref = `/${locale}/admin/bookings`;

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-muted-foreground">{tAdmin('error')}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {tAdmin('retry')}
        </Button>
        <Link href={backHref} className="text-sm text-primary hover:underline">
          ← {t('title')}
        </Link>
      </div>
    );
  }

  const b = query.data;
  const canAssign =
    b.status === BOOKING_STATUSES.CONFIRMED || b.status === BOOKING_STATUSES.SEARCHING;
  const canNoShow = b.status === BOOKING_STATUSES.DRIVER_ARRIVED;
  const canCancel = (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(b.status);
  const advance = ADVANCE_NEXT[b.status as keyof typeof ADVANCE_NEXT] as
    | { to: BookingStatus; labelKey: string }
    | undefined;
  const canReceipt = b.status === BOOKING_STATUSES.COMPLETED;
  const latestPayment = b.payments[0];
  const canRefund =
    latestPayment?.status === PAYMENT_STATUSES.SUCCEEDED ||
    latestPayment?.status === PAYMENT_STATUSES.PARTIALLY_REFUNDED;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label={t('title')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex items-center gap-3 text-xl font-semibold">
          {t('detailTitle')}
          <span className="font-mono text-sm text-ltr text-muted-foreground">{b.id.slice(0, 8)}</span>
        </h1>
        <StatusBadge status={b.status} />

        <div className="ms-auto flex flex-wrap gap-2">
          {canAssign && <Button onClick={() => setAssignOpen(true)}>{t('assign')}</Button>}
          {advance && (
            <Button
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ to: advance.to })}
            >
              {t(advance.labelKey)}
            </Button>
          )}
          {canNoShow && (
            <Button
              variant="outline"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ to: BOOKING_STATUSES.NO_SHOW })}
            >
              {t('markNoShow')}
            </Button>
          )}
          {canReceipt && (
            <Button
              variant="outline"
              disabled={issueReceipt.isPending}
              onClick={onIssueReceipt}
            >
              {t('issueReceipt')}
            </Button>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              disabled={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ to: BOOKING_STATUSES.CANCELLED_BY_SYSTEM })}
            >
              {t('cancelBooking')}
            </Button>
          )}
        </div>
      </div>

      {updateStatus.isError && (
        <p className="text-sm text-destructive">{t('statusError')}</p>
      )}
      {issueReceipt.isError && (
        <p className="text-sm text-destructive">{t('receiptError')}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trip + people */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('route')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <InfoRow label={t('route')}>
              <span className="text-end">
                {b.pickup.address} → {b.dropoff.address}
              </span>
            </InfoRow>
            <InfoRow label={t('schedule')}>{formatDateTime(b.scheduledTime, locale)}</InfoRow>
            {b.flightNumber && (
              <InfoRow label={t('flight')}>
                <span className="inline-flex items-center gap-1 text-ltr">
                  <Plane className="size-3.5" />
                  {b.flightNumber}
                </span>
              </InfoRow>
            )}
            {b.estimatedDistanceKm != null && (
              <InfoRow label={t('distance')}>{Math.round(b.estimatedDistanceKm)} km</InfoRow>
            )}
            <InfoRow label={t('price')}>
              {formatCurrencyMinor(b.displayPrice, b.displayCurrency, locale)}
            </InfoRow>
            <InfoRow label={t('passenger')}>
              {b.passenger?.name ?? b.passenger?.email ?? t('guest')}
            </InfoRow>
            <InfoRow label={t('driver')}>
              {b.driver?.name ?? <span className="text-muted-foreground">{t('unassigned')}</span>}
            </InfoRow>
            {b.vehicle && (
              <InfoRow label={t('vehicle')}>
                {b.vehicle.make} {b.vehicle.model}{' '}
                <span className="text-ltr text-muted-foreground">({b.vehicle.licensePlate})</span>
              </InfoRow>
            )}
          </CardContent>
        </Card>

        {/* Payment + timeline */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('payment')}</CardTitle>
            </CardHeader>
            <CardContent>
              {latestPayment ? (
                <div className="flex flex-col gap-1">
                  <InfoRow label={t('colStatus')}>{latestPayment.status}</InfoRow>
                  <InfoRow label={t('price')}>
                    {formatCurrencyMinor(latestPayment.amount, latestPayment.currency, locale)}
                  </InfoRow>
                  <InfoRow label="ISK">
                    {formatCurrencyMinor(latestPayment.amountISK, 'ISK', locale)}
                  </InfoRow>
                  {latestPayment.refundedAt && (
                    <InfoRow label={t('refundedAt')}>
                      {formatDateTime(latestPayment.refundedAt, locale)}
                    </InfoRow>
                  )}
                  {canRefund && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 self-start"
                      onClick={() => setRefundOpen(true)}
                    >
                      {t('refund')}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tAdmin('empty')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {b.events.map((e) => (
                  <li key={e.id} className="relative ps-4">
                    <span className="absolute start-0 top-1.5 size-2 rounded-full bg-primary" />
                    <p className="text-sm font-medium">{tEvent(e.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(e.createdAt, locale)}
                      {e.actor?.name ? ` · ${e.actor.name}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <AssignDriverDialog
        bookingId={b.id}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
      {latestPayment && (
        <RefundDialog
          bookingId={b.id}
          amountMinor={latestPayment.amount}
          currency={latestPayment.currency}
          open={refundOpen}
          onClose={() => setRefundOpen(false)}
        />
      )}
    </div>
  );
}
