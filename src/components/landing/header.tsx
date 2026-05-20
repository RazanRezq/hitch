'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Globe } from 'lucide-react';
import { CURRENCIES, LOCALES, type Currency, type Locale } from '@/lib/i18n-shared';
import { Logo } from '@/components/brand/logo';
import { usePreferences } from '@/stores/preferences';
import { useChangeLocale } from '@/lib/use-change-locale';
import { HeaderDropdown } from './header-dropdown';

const LOCALE_TAG: Record<Locale, string> = { is: 'is-IS', en: 'en-GB', ar: 'ar' };
/** Language endonyms — shown in each language's own script (standard). */
const LOCALE_ENDONYM: Record<Locale, string> = {
  is: 'Íslenska',
  en: 'English',
  ar: 'العربية',
};
const CURRENCY_SYMBOL: Record<Currency, string> = { ISK: 'kr.', EUR: '€', USD: '$' };

export function Header() {
  const t = useTranslations('landing.header');
  const tc = useTranslations('currency');
  const { locale, change: changeLocale } = useChangeLocale();
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);

  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const hero = document.querySelector('.ed-hero, .ed-finale, .ed-cov, .h-hero');
      if (!hero) {
        setOverHero(false);
        return;
      }
      if (window.scrollY < 8) {
        setOverHero(true);
        return;
      }
      const r = hero.getBoundingClientRect();
      const headerEl = document.querySelector('.ed-header');
      const hh = headerEl ? headerEl.getBoundingClientRect().height : 80;
      setOverHero(r.bottom > hh);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Defer the first tick out of the effect body so server and client
    // render the same (empty) markup, then the clock comes alive.
    const raf = requestAnimationFrame(() => setTime(new Date()));
    const id = window.setInterval(() => setTime(new Date()), 30_000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  // Western digits always, even in Arabic (CLAUDE.md).
  const timeStr = time
    ? time.toLocaleTimeString(LOCALE_TAG[locale], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn',
      })
    : '';

  const cls = [
    'h-header',
    'ed-header',
    scrolled && 'is-scrolled',
    overHero ? 'is-dark' : 'is-light',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={cls}>
      <div className="ed-header-strip" aria-hidden="true">
        <div className="ed-header-strip-inner">
          <span className="t-mono">{t('coords')}</span>
          <span className="ed-strip-dot">·</span>
          <span className="t-mono">
            {timeStr} {t('local')}
          </span>
          <span className="ed-strip-dot">·</span>
          <span className="t-mono ed-strip-live">
            <span className="ed-livedot" />
            {t('cars')}
          </span>
          <span className="ed-strip-spacer" />
          <span className="t-mono ed-strip-channel">{t('channel')}</span>
          <span className="ed-strip-dot">·</span>
          <span className="t-mono text-ltr">{t('phone')}</span>
        </div>
      </div>

      <div className="ed-header-main">
        <Link href={`/${locale}`} className="ed-header-logo" aria-label={t('logoHome')}>
          <Logo size={28} />
        </Link>

        <nav className="ed-header-nav" aria-label="Primary">
          <a href="#top" className="ed-nav-link is-active">
            <span>{t('fly')}</span>
          </a>
          <a href="#fleet" className="ed-nav-link">
            <span>{t('fleet')}</span>
          </a>
          <a href="#coverage" className="ed-nav-link">
            <span>{t('coverage')}</span>
          </a>
          <a href="#stories" className="ed-nav-link">
            <span>{t('stories')}</span>
          </a>
        </nav>

        <div className="ed-header-tools">
          <HeaderDropdown
            ariaLabel={t('language')}
            leadingIcon={<Globe size={14} aria-hidden="true" />}
            value={locale}
            onChange={(v) => changeLocale(v)}
            options={LOCALES.map((l) => ({
              value: l,
              short: l.toUpperCase(),
              label: LOCALE_ENDONYM[l],
              hint: l.toUpperCase(),
            }))}
          />
          <div className="ed-pill-divider" aria-hidden="true" />
          <HeaderDropdown
            ariaLabel={t('currencyLabel')}
            value={currency}
            onChange={(v) => setCurrency(v)}
            options={CURRENCIES.map((c) => ({
              value: c,
              short: c,
              label: tc(c.toLowerCase() as 'isk' | 'eur' | 'usd'),
              hint: CURRENCY_SYMBOL[c],
            }))}
          />
          <Link href={`/${locale}/book`} className="ed-header-signin">
            {t('signin')}
          </Link>
          <Link href={`/${locale}/book`} className="ed-header-cta">
            <span>{t('book')}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
