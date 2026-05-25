'use client';

import { type ReactNode, useMemo } from 'react';
import { loadStripe, type Stripe, type StripeElementLocale } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import type { Locale } from '@/lib/types';

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// Stripe Elements doesn't ship an Icelandic translation, so fall back to
// English for `is`. Arabic is supported natively.
const LOCALE_MAP: Record<Locale, StripeElementLocale> = {
  is: 'en',
  en: 'en',
  ar: 'ar',
};

/**
 * Stripe Elements wrapper. Renders <Elements> with the booking's
 * PaymentIntent client_secret. Only used inside the booking payment step;
 * the rest of the app does not need Stripe loaded.
 */
export function StripeProvider({
  clientSecret,
  locale,
  children,
}: {
  clientSecret: string;
  locale: Locale;
  children: ReactNode;
}) {
  const options = useMemo(
    () => ({
      clientSecret,
      locale: LOCALE_MAP[locale],
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#3b30c9',
          borderRadius: '12px',
          fontFamily:
            'var(--font-sans-active, var(--font-sans)), system-ui, sans-serif',
        },
      },
    }),
    [clientSecret, locale],
  );

  return (
    <Elements stripe={getStripe()} options={options}>
      {children}
    </Elements>
  );
}
