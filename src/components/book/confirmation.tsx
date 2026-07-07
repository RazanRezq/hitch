'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Copy, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { formatCurrencyMinor, formatDateTime, type Locale } from '@/lib/i18n-shared';
import { useBooking } from '@/lib/api-client/hooks/useBooking';
import { useBookingChannel, type WsStatus } from '@/lib/api-client/hooks/useBookingChannel';
import { useCancelBooking } from '@/lib/api-client/hooks/useCancelBooking';
import { BOOKING_STATUSES, PASSENGER_CANCELLABLE_STATUSES } from '@/lib/types';
import { cn } from '@/lib/ui';

export function Confirmation({
  bookingId,
  guestToken,
}: {
  bookingId: string;
  guestToken?: string;
}) {
  const t = useTranslations('book.confirmation');
  const tCommon = useTranslations('book');
  const locale = useLocale() as Locale;
  const { data, isError } = useBooking(bookingId, guestToken);
  // Realtime: subscribe to this booking's channel for instant status updates.
  const wsStatus = useBookingChannel(bookingId, guestToken);

  const isConfirmed = data?.status === BOOKING_STATUSES.CONFIRMED;
  const isPending = !data || data.status === BOOKING_STATUSES.PENDING_PAYMENT;
  const isCancelled = !!data && data.status.startsWith('CANCELLED');
  const canCancel =
    !!data && (PASSENGER_CANCELLABLE_STATUSES as readonly string[]).includes(data.status);

  if (isError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-5 py-12 text-center">
        <p className="text-destructive">{t('notFound')}</p>
        <Link
          href={`/${locale}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {tCommon('backHome')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-8 md:py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
            isConfirmed
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
          aria-live="polite"
        >
          {isConfirmed ? (
            <CheckCircle2 size={28} aria-hidden="true" />
          ) : isCancelled ? (
            <XCircle size={28} aria-hidden="true" />
          ) : (
            <Loader2 size={28} className="animate-spin" aria-hidden="true" />
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isConfirmed ? t('title') : isCancelled ? t('cancelled') : t('pending')}
        </h1>
        {isCancelled && (
          <p className="text-muted-foreground text-sm">{t('cancelledBody')}</p>
        )}
        {/* Prefer the human-friendly HTCH-XXXX-XXXX code; fall back to the raw
            id only for legacy bookings created before codes existed. */}
        <BookingIdChip
          code={data ? (data.code ?? bookingId) : undefined}
          label={t('bookingIdLabel')}
        />
        <LiveIndicator
          status={wsStatus}
          liveLabel={t('live')}
          offlineLabel={t('reconnecting')}
        />
      </header>

      {data && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-muted-foreground text-xs uppercase tracking-wider">
            {t('summary')}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryRow term={t('pickup')} value={data.pickup.address} />
            <SummaryRow term={t('dropoff')} value={data.dropoff.address} />
            <SummaryRow term={t('scheduledFor')} value={formatDateTime(data.scheduledTime, locale)} />
            <SummaryRow
              term={t('total')}
              value={formatCurrencyMinor(data.displayPrice, data.displayCurrency, locale)}
            />
          </dl>
        </section>
      )}

      {isConfirmed && (
        <section className="rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-5">
          <h2 className="text-base font-semibold">{t('saveAccountTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('saveAccountBody')}</p>
          <button
            type="button"
            disabled
            className="bg-primary text-primary-foreground mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold opacity-60"
          >
            {t('saveAccountCta')}
          </button>
        </section>
      )}

      {isPending && (
        <p className="text-muted-foreground text-center text-xs">
          {/* Polling for webhook-driven CONFIRMED. */}
        </p>
      )}

      {canCancel && (
        <CancelSection bookingId={bookingId} guestToken={guestToken} />
      )}

      <Link
        href={`/${locale}`}
        className="text-muted-foreground hover:text-foreground mt-4 inline-flex items-center justify-center gap-2 text-sm"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {tCommon('backHome')}
      </Link>
    </main>
  );
}

/**
 * Passenger self-cancel — pre-capture only (the server enforces it), so this
 * is always "release the hold, nothing charged". Two-step inline confirm; the
 * cancelled state then arrives via the booking refetch + WS update.
 */
function CancelSection({
  bookingId,
  guestToken,
}: {
  bookingId: string;
  guestToken?: string;
}) {
  const t = useTranslations('book.confirmation');
  const cancel = useCancelBooking(bookingId, guestToken);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-muted-foreground hover:text-destructive text-sm underline underline-offset-4"
        >
          {t('cancelCta')}
        </button>
      </div>
    );
  }

  return (
    <section className="border-destructive/30 rounded-2xl border p-5 text-center">
      <p className="text-sm">{t('cancelConfirmBody')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={cancel.isPending}
          className="bg-card inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold"
        >
          {t('cancelKeep')}
        </button>
        <button
          type="button"
          onClick={() => cancel.mutate()}
          disabled={cancel.isPending}
          className="bg-destructive text-destructive-foreground inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t('cancelConfirm')}
        </button>
      </div>
      {cancel.isError && (
        <p className="text-destructive mt-3 text-sm">{t('cancelError')}</p>
      )}
    </section>
  );
}

function LiveIndicator({
  status,
  liveLabel,
  offlineLabel,
}: {
  status: WsStatus;
  liveLabel: string;
  offlineLabel: string;
}) {
  const isLive = status === 'live';
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
      aria-live="polite"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isLive ? 'bg-primary motion-safe:animate-pulse' : 'bg-muted-foreground/40',
        )}
        aria-hidden="true"
      />
      {isLive ? liveLabel : offlineLabel}
    </span>
  );
}

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{term}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function BookingIdChip({ code, label }: { code?: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  }

  return (
    <div className="bg-card inline-flex items-center gap-2 rounded-full border px-3 py-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      {code ? (
        <>
          <span className="text-ltr font-mono text-sm">{code}</span>
          <button
            type="button"
            onClick={copy}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Copy booking ID"
          >
            <Copy size={14} aria-hidden="true" />
          </button>
          {copied && <span className="text-primary text-xs">✓</span>}
        </>
      ) : (
        <span
          className="bg-muted h-4 w-28 rounded motion-safe:animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
