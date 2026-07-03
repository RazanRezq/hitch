'use client';

import { useTranslations } from 'next-intl';
import { Clock, Phone } from 'lucide-react';
import { formatCurrency, type Currency, type Locale } from '@/lib/i18n-shared';
import type { TourCatalogResponse } from '@/lib/types';
import { TOUR_META } from './tour-meta';

type TourEntry = TourCatalogResponse['tours'][number];

/** Tier display ranges — numeric, not translated prose. */
const TIERS = [
  { key: '1-4', range: '1–4' },
  { key: '5-8', range: '5–8' },
] as const;

interface Props {
  entry: TourEntry;
  currency: Currency;
  locale: Locale;
  /** Dispatch phone in dialable form (e.g. +3545551234). */
  phone: string;
}

/**
 * One sightseeing tour: decorative Iceland accent header, localized name +
 * blurb, both per-car tier prices in the active currency, and a call-to-book
 * CTA (tours are manual/booked — the in-app booking flow lands in a later slice).
 */
export function TourCard({ entry, currency, locale, phone }: Props) {
  const t = useTranslations('tours');
  const meta = TOUR_META[entry.tourId];
  const Icon = meta.icon;
  const name = t(`items.${entry.tourId}.name`);
  const blurb = t(`items.${entry.tourId}.blurb`);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div
        className="relative flex h-28 items-end p-4"
        style={{ backgroundImage: meta.accent }}
        aria-hidden="true"
      >
        <Icon className="size-9 text-white/90" strokeWidth={1.5} />
        {meta.durationHours !== undefined && (
          <span className="absolute end-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 font-mono text-xs text-white backdrop-blur-sm">
            <Clock className="size-3" />
            {t('card.duration', { hours: meta.durationHours })}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold leading-tight text-card-foreground">{name}</h3>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{blurb}</p>

        <dl className="mt-1 space-y-1.5 border-t border-border pt-3">
          {TIERS.map((tier) => (
            <div key={tier.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-muted-foreground">
                {tier.range} {t('card.paxUnit')}
              </dt>
              <dd className="font-mono text-sm font-semibold tabular-nums text-card-foreground">
                {formatCurrency(entry.pricesByTier[tier.key][currency], currency, locale)}
              </dd>
            </div>
          ))}
          <p className="text-end text-[0.7rem] uppercase tracking-wide text-muted-foreground">
            {t('card.perCar')}
          </p>
        </dl>

        <a
          href={`tel:${phone}`}
          aria-label={t('card.ctaAria', { tour: name })}
          className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Phone className="size-4" />
          {t('card.cta')}
        </a>
      </div>
    </article>
  );
}
