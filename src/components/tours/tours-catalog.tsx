'use client';

import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Compass } from 'lucide-react';
import { type Currency, type Locale } from '@/lib/i18n-shared';
import { useTours } from '@/lib/api-client/hooks/useTours';
import { usePreferences } from '@/stores/preferences';
import { TOUR_ORDER } from './tour-meta';
import { TourCard } from './tour-card';

/** Strip a display phone string down to a dialable `tel:` value. */
function dialable(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function ToursCatalog() {
  const t = useTranslations('tours');
  const th = useTranslations('landing.header');
  const locale = useLocale() as Locale;
  const currency: Currency = usePreferences((s) => s.currency);
  const { data, isLoading, isError, refetch } = useTours();

  const phone = dialable(th('phone'));
  const byId = new Map((data?.tours ?? []).map((entry) => [entry.tourId, entry]));
  const ordered = TOUR_ORDER.map((id) => byId.get(id)).filter((e) => e !== undefined);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-28 md:pt-32">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t('hero.eyebrow')}
        </span>
        <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-5xl">
          {t('hero.titleA')}{' '}
          <span className="bg-[linear-gradient(120deg,#7C3AED,#0EA5E9)] bg-clip-text text-transparent">
            {t('hero.titleB')}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground">
          {t('hero.subtitle')}
        </p>
      </header>

      {isError ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <h2 className="text-lg font-semibold text-card-foreground">{t('states.errorTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('states.errorBody')}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-1 inline-flex min-h-11 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t('states.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <ul
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label={t('states.loading')}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-border bg-muted/50"
            />
          ))}
        </ul>
      ) : ordered.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
          <Compass className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-card-foreground">{t('states.emptyTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('states.emptyBody')}</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((entry) => (
              <li key={entry.tourId}>
                <TourCard entry={entry} currency={currency} locale={locale} phone={phone} />
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-xs text-muted-foreground">{t('note')}</p>
        </>
      )}
    </main>
  );
}
