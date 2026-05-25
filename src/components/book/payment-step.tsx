'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { formatCurrencyMinor, type Locale } from '@/lib/i18n-shared';
import { useCreateBooking } from '@/lib/api-client/hooks/useCreateBooking';
import type { CreateBookingResponse } from '@/lib/api-client/hooks/useCreateBooking';
import { StripeProvider } from '@/components/providers/stripe-provider';
import { useBookingDraft } from '@/stores/booking-draft';
import { cn } from '@/lib/ui';

/**
 * Creates the booking + PaymentIntent on mount, then mounts the Stripe
 * Payment Element inside a memoized <StripeProvider>. The actual Pay button
 * lives inside <PaymentForm/> because it needs to live inside <Elements/> to
 * read `useStripe`/`useElements`.
 */
export function PaymentStep() {
  const t = useTranslations('book.payment');
  const locale = useLocale() as Locale;
  const draft = useBookingDraft();
  const create = useCreateBooking();
  const startedRef = useRef(false);

  useEffect(() => {
    // Ref guard: StrictMode's double-invocation in dev would otherwise create
    // two bookings + two PaymentIntents with different idempotency keys.
    if (startedRef.current) return;
    if (!draft.pickup || !draft.dropoff || !draft.guest) return;
    startedRef.current = true;
    create.mutate({
      pickup: draft.pickup,
      dropoff: draft.dropoff,
      pickupAirportCode: draft.pickupAirportCode,
      flightNumber: draft.flightNumber,
      scheduledTime: new Date(draft.scheduledTime),
      vehicleTypeRequested: draft.vehicleTypeRequested,
      passengerCount: draft.passengerCount,
      displayCurrency: draft.displayCurrency,
      guest: draft.guest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (create.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
        <p className="text-destructive">{t('error')}</p>
        <button
          type="button"
          onClick={() => draft.setStep('details')}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{t('back')}</span>
        </button>
      </div>
    );
  }

  if (!create.data) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-6">
        <Loader2 className="animate-spin" size={20} aria-hidden="true" />
        <span className="text-muted-foreground text-sm">{t('preparing')}</span>
      </div>
    );
  }

  return (
    <StripeProvider clientSecret={create.data.clientSecret} locale={locale}>
      <PaymentForm response={create.data} />
    </StripeProvider>
  );
}

function PaymentForm({ response }: { response: CreateBookingResponse }) {
  const t = useTranslations('book.payment');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const draft = useBookingDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = formatCurrencyMinor(response.displayPrice, response.displayCurrency, locale);
  const guestToken = response.guestToken;
  const confirmationUrl = `/${locale}/book/confirmation/${response.bookingId}${
    guestToken ? `?t=${encodeURIComponent(guestToken)}` : ''
  }`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${confirmationUrl}`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? t('error'));
      setSubmitting(false);
      return;
    }

    // Successful authorization OR pending — confirmation page will poll the
    // backend until the webhook flips status to CONFIRMED.
    draft.reset();
    router.push(confirmationUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
      </header>

      <div className="rounded-2xl border bg-card p-4">
        <div className="text-muted-foreground text-xs uppercase tracking-wider">
          {t('summary')}
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <span className="text-sm">
            {draft.pickup?.address}
            <span className="text-muted-foreground"> → </span>
            {draft.dropoff?.address}
          </span>
          <span className="text-lg font-semibold tabular-nums">{amount}</span>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">{t('authorizeOnly')}</p>

      <div className="rounded-2xl border bg-card p-4">
        <PaymentElement options={{ layout: 'accordion' }} />
      </div>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className={cn(
          'bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold',
          'transition-opacity disabled:opacity-50',
        )}
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        ) : (
          <Lock size={16} aria-hidden="true" />
        )}
        {t('payCta', { amount })}
      </button>

      <p className="text-muted-foreground inline-flex items-center justify-center gap-1 text-xs">
        <Lock size={12} aria-hidden="true" />
        {t('secured')}
      </p>
    </form>
  );
}
