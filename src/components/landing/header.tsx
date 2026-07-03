'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, Globe } from 'lucide-react';
import { CURRENCIES, LOCALES, type Currency, type Locale } from '@/lib/i18n-shared';
import { Logo } from '@/components/brand/logo';
import { usePreferences } from '@/stores/preferences';
import { useChangeLocale } from '@/lib/use-change-locale';
import { useFleetStatus } from '@/lib/api-client/hooks/useFleetStatus';
import { HeaderDropdown } from './header-dropdown';

const LOCALE_TAG: Record<Locale, string> = { is: 'is-IS', en: 'en-GB' };
/** Language endonyms — shown in each language's own script (standard). */
const LOCALE_ENDONYM: Record<Locale, string> = {
  is: 'Íslenska',
  en: 'English',
};
const CURRENCY_SYMBOL: Record<Currency, string> = { ISK: 'kr.', EUR: '€', USD: '$' };

/**
 * Landing-page section anchors in DOM order (see landing-page.tsx render order:
 * Hero → Fleet → PulledQuote(#stories) → Coverage). Drives nav scroll-spy: the
 * active section is the last one whose top has crossed the trigger line. Note
 * this differs from the nav's display order (Coverage is shown before Stories);
 * scroll-spy must follow document order, so keep this list in render order.
 * `top` is the hero (the "Fly" nav item).
 */
const SECTION_IDS = ['top', 'fleet', 'stories', 'coverage'] as const;
type SectionId = (typeof SECTION_IDS)[number];

/**
 * `variant`:
 * - `full` (default) — the landing header: info strip, section nav, language +
 *   currency switchers, sign-in and book CTA.
 * - `minimal` — logo + language switcher only. For off-tone surfaces like the
 *   incident-report page, where the marketing chrome (cars-on-shift boast,
 *   currency, "Book now") is irrelevant or jarring.
 */
export function Header({ variant = 'full' }: { variant?: 'full' | 'minimal' }) {
  const minimal = variant === 'minimal';
  const t = useTranslations('landing.header');
  const tc = useTranslations('currency');
  const { locale, change: changeLocale } = useChangeLocale();
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);

  // Live "cars on shift" count for the info strip (only the full header shows it).
  const { data: fleet } = useFleetStatus(!minimal);
  const onlineCars = fleet?.onlineDrivers ?? 0;

  // Active nav state is derived from the route, not hardcoded. "Fly" (landing)
  // and "Tours" are real pages; Fleet/Coverage/Stories are sections of the
  // landing page, so they link to `/{locale}#section` and highlight there.
  const pathname = usePathname();
  const onHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const onTours =
    pathname === `/${locale}/tours` || pathname.startsWith(`/${locale}/tours/`);

  // Scroll-spy: on the landing page, highlight the section currently in view.
  const [activeSection, setActiveSection] = useState<SectionId>('top');
  const sectionActive = (id: SectionId) => onHome && activeSection === id;

  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const hero = document.querySelector(
        '.ed-hero, .ed-finale, .ed-cov, .h-hero, .ed-incident-hero',
      );
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
    if (!onHome) return;
    const onScroll = () => {
      // Trigger line 35% down the viewport: the active section is the last one
      // whose top has scrolled above it (SECTION_IDS is in document order).
      const line = window.innerHeight * 0.35;
      let current: SectionId = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [onHome]);

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

  // Western digits always (CLAUDE.md).
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
      {!minimal && (
        <div className="ed-header-strip" aria-hidden="true">
          <div className="ed-header-strip-inner">
            <span className="t-mono">{t('coords')}</span>
            <span className="ed-strip-dot">·</span>
            <span className="t-mono">
              {timeStr} {t('local')}
            </span>
            {/* Real count only — hide the segment entirely when nobody's on
                shift (or before it loads) rather than boast a fake or a bleak
                "0 cars on shift". */}
            {onlineCars > 0 && (
              <>
                <span className="ed-strip-dot">·</span>
                <span className="t-mono ed-strip-live">
                  <span className="ed-livedot" />
                  {t('cars', { count: onlineCars })}
                </span>
              </>
            )}
            <span className="ed-strip-spacer" />
            <span className="t-mono ed-strip-channel">{t('channel')}</span>
            <span className="ed-strip-dot">·</span>
            <span className="t-mono text-ltr">{t('phone')}</span>
          </div>
        </div>
      )}

      <div className="ed-header-main">
        <Link href={`/${locale}`} className="ed-header-logo" aria-label={t('logoHome')}>
          <Logo size={28} />
        </Link>

        {!minimal && (
          <nav className="ed-header-nav" aria-label="Primary">
            <Link
              href={`/${locale}#top`}
              className={`ed-nav-link${sectionActive('top') ? ' is-active' : ''}`}
              aria-current={sectionActive('top') ? 'page' : undefined}
            >
              <span>{t('fly')}</span>
            </Link>
            <Link
              href={`/${locale}/tours`}
              className={`ed-nav-link${onTours ? ' is-active' : ''}`}
              aria-current={onTours ? 'page' : undefined}
            >
              <span>{t('tours')}</span>
            </Link>
            <Link
              href={`/${locale}#fleet`}
              className={`ed-nav-link${sectionActive('fleet') ? ' is-active' : ''}`}
              aria-current={sectionActive('fleet') ? 'page' : undefined}
            >
              <span>{t('fleet')}</span>
            </Link>
            <Link
              href={`/${locale}#stories`}
              className={`ed-nav-link${sectionActive('stories') ? ' is-active' : ''}`}
              aria-current={sectionActive('stories') ? 'page' : undefined}
            >
              <span>{t('stories')}</span>
            </Link>
            <Link
              href={`/${locale}#coverage`}
              className={`ed-nav-link${sectionActive('coverage') ? ' is-active' : ''}`}
              aria-current={sectionActive('coverage') ? 'page' : undefined}
            >
              <span>{t('coverage')}</span>
            </Link>
          </nav>
        )}

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
          {!minimal && (
            <>
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
            </>
          )}
          {!minimal && (
            <Link href={`/${locale}/book`} className="ed-header-cta">
              <span>{t('book')}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
