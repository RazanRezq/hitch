'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Briefcase,
  Clock,
  CloudSnow,
  type LucideIcon,
  Minus,
  Plane,
  Plus,
  Route,
  Star,
  Users,
} from 'lucide-react';
import { formatCurrency, type Currency, type Locale } from '@/lib/i18n-shared';
import { fromISK } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
import { usePreferences } from '@/stores/preferences';
import { useReveal } from './use-reveal';
import {
  CoverageMap,
  FleetGlacier,
  HeroStars,
  Silhouette,
  TerrainSVG,
  type SilhouetteId,
  type TerrainVariant,
} from './decorative';

interface LiveItem {
  k: string;
  v: string;
}
interface TripCardData {
  code: string;
  kmTime: string;
}
interface ManifestoItem {
  n: string;
  k: string;
  t: string;
  body: string;
}
interface FleetItem {
  name: string;
  cap: string;
  bag: string;
}
interface CoverageStop {
  code: string;
  label: string;
  meta: string;
}
interface FaqItem {
  q: string;
  a: string;
}
interface FinaleColumn {
  title: string;
  items: string[];
}

function usePrice() {
  const locale = useLocale() as Locale;
  const currency: Currency = usePreferences((s) => s.currency);
  return (isk: number) => formatCurrency(fromISK(isk, currency), currency, locale);
}

/* ───────────── Wordmark spacer ───────────── */
export function WordmarkSpacer() {
  const t = useTranslations('landing');
  const mark = t('wordmark');
  return (
    <div className="ed-wordmark" aria-hidden="true">
      <span>{mark}</span>
      <span className="ed-wordmark-dot">·</span>
      <span>{mark}</span>
      <span className="ed-wordmark-dot">·</span>
      <span>{mark}</span>
    </div>
  );
}

/* ───────────── Live conditions ───────────── */
const LIVE_ICONS: LucideIcon[] = [CloudSnow, Route, Plane, Clock];

export function LiveConditions() {
  const ref = useReveal();
  const t = useTranslations('landing.live');
  const items = t.raw('items') as LiveItem[];
  return (
    <section ref={ref} className="ed-live h-reveal">
      <div className="ed-live-head">
        <span className="t-mono ed-live-tag">
          <span className="ed-livedot" /> {t('tag')}
        </span>
        <span className="t-mono ed-live-time">{t('time')}</span>
      </div>
      <div className="ed-live-grid">
        {items.map((it, i) => {
          const Ico = LIVE_ICONS[i] ?? Clock;
          return (
            <div key={i} className="ed-live-cell h-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="ed-live-icon">
                <Ico size={18} aria-hidden={true} />
              </div>
              <div className="ed-live-k t-mono">{it.k}</div>
              <div className="ed-live-v">{it.v}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Editorial trips ───────────── */
function TripCard({
  size,
  code,
  kmTime,
  route,
  price,
  badge,
  terrain,
  cta,
  href,
}: {
  size: 'lg' | 'sm';
  code: string;
  kmTime: string;
  route: string;
  price: string;
  badge?: string;
  terrain: TerrainVariant;
  cta: string;
  href: string;
}) {
  return (
    <Link className={`ed-trip ed-trip-${size}`} href={href}>
      <div className="ed-trip-art">
        <TerrainSVG variant={terrain} />
        <div className="ed-trip-art-fade" />
        {badge && <span className="ed-trip-badge t-mono">{badge}</span>}
      </div>
      <div className="ed-trip-body">
        <div className="ed-trip-code t-mono">{code}</div>
        <div className="ed-trip-route">{route}</div>
        <div className="ed-trip-foot">
          <span className="t-mono ed-trip-meta">{kmTime}</span>
          <span className="ed-trip-price t-mono">{price}</span>
        </div>
        <span className="ed-trip-cta">
          {cta} <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function EditorialTrips() {
  const ref = useReveal();
  const t = useTranslations('landing');
  const locale = useLocale();
  const price = usePrice();
  const cards = t.raw('trips.cards') as TripCardData[];
  const routes = [
    t('presets.airportToReykjavik'),
    t('presets.reykjavikToAirport'),
    t('presets.airportToBlueLagoon'),
  ];
  const isk = [12500, 12500, 8900];
  const terrains: TerrainVariant[] = ['reykjavik', 'kef', 'lagoon'];
  const href = `/${locale}/book`;

  return (
    <section ref={ref} className="ed-trips h-reveal">
      <div className="ed-eyebrow">
        <span className="t-mono">
          {t('trips.no')} · {t('trips.eyebrow')}
        </span>
        <h2 className="ed-eyebrow-title">
          {t('trips.titleA')}
          <br />
          <span className="ed-italic">{t('trips.titleB')}</span>
        </h2>
      </div>
      <div className="ed-trips-grid">
        <TripCard
          size="lg"
          code={cards[0].code}
          kmTime={cards[0].kmTime}
          route={routes[0]}
          price={price(isk[0])}
          badge={t('trips.badge')}
          terrain={terrains[0]}
          cta={t('trips.cta')}
          href={href}
        />
        <div className="ed-trips-stack">
          <TripCard
            size="sm"
            code={cards[1].code}
            kmTime={cards[1].kmTime}
            route={routes[1]}
            price={price(isk[1])}
            terrain={terrains[1]}
            cta={t('trips.cta')}
            href={href}
          />
          <TripCard
            size="sm"
            code={cards[2].code}
            kmTime={cards[2].kmTime}
            route={routes[2]}
            price={price(isk[2])}
            terrain={terrains[2]}
            cta={t('trips.cta')}
            href={href}
          />
        </div>
      </div>
    </section>
  );
}

/* ───────────── Manifesto ───────────── */
export function Manifesto() {
  const ref = useReveal();
  const t = useTranslations('landing.manifesto');
  const items = t.raw('items') as ManifestoItem[];
  return (
    <section ref={ref} className="ed-manifesto h-reveal">
      <div className="ed-eyebrow">
        <span className="t-mono">
          {t('no')} · {t('eyebrow')}
        </span>
        <h2 className="ed-eyebrow-title">
          {t('titleA')}
          <br />
          <span className="ed-italic">{t('titleB')}</span>
        </h2>
      </div>
      <div className="ed-manifesto-grid">
        {items.map((it, i) => (
          <article key={i} className="ed-mani h-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="ed-mani-num">{it.n}</div>
            <div className="ed-mani-k t-mono">{it.k}</div>
            <h3 className="ed-mani-t">{it.t}</h3>
            <p className="ed-mani-body">{it.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Fleet ───────────── */
const FLEET_IDS: SilhouetteId[] = ['sedan', 'suv', 'van', 'lux'];
const FLEET_ISK = [12500, 17500, 23100, 22500];
const FLEET_CODES = ['S', 'X', 'V', 'L'];

export function Fleet() {
  const ref = useReveal();
  const t = useTranslations('landing.fleet');
  const price = usePrice();
  const items = t.raw('items') as FleetItem[];
  return (
    <section id="fleet" ref={ref} className="ed-fleet h-reveal">
      <FleetGlacier />
      <div className="ed-fleet-head">
        <span className="t-mono">
          {t('no')} · {t('eyebrow')}
        </span>
        <h2 className="ed-eyebrow-title">
          {t('titleA')}
          <br />
          <span className="ed-italic">{t('titleB')}</span>
        </h2>
      </div>
      <div className="ed-fleet-rail">
        {items.map((v, i) => (
          <article
            key={i}
            className="ed-fleet-card h-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="ed-fleet-code t-mono">
              {t('classLabel')} · {FLEET_CODES[i]}
            </div>
            <div className="ed-fleet-silhouette">
              <Silhouette id={FLEET_IDS[i]} />
            </div>
            <div className="ed-fleet-name">{v.name}</div>
            <div className="ed-fleet-meta t-mono">
              <span>
                <Users size={12} aria-hidden="true" /> {v.cap}
              </span>
              <span>
                <Briefcase size={12} aria-hidden="true" /> {v.bag}
              </span>
            </div>
            <div className="ed-fleet-rule" />
            <div className="ed-fleet-from t-mono">{t('from')}</div>
            <div className="ed-fleet-price t-mono">{price(FLEET_ISK[i])}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Pulled quote ───────────── */
export function PulledQuote() {
  const ref = useReveal();
  const t = useTranslations('landing.quote');
  return (
    <section id="stories" ref={ref} className="ed-quote h-reveal">
      <div className="ed-quote-mark" aria-hidden="true">
        “
      </div>
      <blockquote className="ed-quote-body">
        <span className="ed-italic">{t('body')}</span>
      </blockquote>
      <div className="ed-quote-cite">
        <div className="ed-quote-portrait">{t('initial')}</div>
        <div>
          <div className="ed-quote-who t-mono">{t('who')}</div>
          <div className="ed-quote-role t-mono">{t('role')}</div>
        </div>
        <div className="ed-quote-stars" aria-label="5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} aria-hidden="true" />
          ))}
          <span className="t-mono ed-quote-rating">{t('rating')}</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Coverage ───────────── */
export function Coverage() {
  const ref = useReveal();
  const t = useTranslations('landing.coverage');
  const stops = t.raw('stops') as CoverageStop[];
  return (
    <section id="coverage" ref={ref} className="ed-cov h-reveal">
      <div className="ed-cov-head">
        <span className="t-mono">
          {t('no')} · {t('eyebrow')}
        </span>
        <h2 className="ed-cov-title">
          {t('titleA')}
          <br />
          <span className="ed-italic">{t('titleB')}</span>
        </h2>
      </div>
      <div className="ed-cov-grid">
        <ul className="ed-cov-list">
          {stops.map((s, i) => (
            <li key={s.code} className="h-fade-up" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="ed-cov-code t-mono">{s.code}</span>
              <span className="ed-cov-label">{s.label}</span>
              <span className="ed-cov-meta t-mono">{s.meta}</span>
            </li>
          ))}
        </ul>
        <div className="ed-cov-map" aria-hidden="true">
          <CoverageMap />
          <div className="ed-cov-coords t-mono">{t('coords')}</div>
        </div>
      </div>
    </section>
  );
}

/* ───────────── FAQ ───────────── */
export function Faq() {
  const ref = useReveal();
  const t = useTranslations('landing.faq');
  const items = t.raw('items') as FaqItem[];
  const [open, setOpen] = useState(0);
  return (
    <section ref={ref} className="ed-faq h-reveal">
      <div className="ed-faq-head">
        <span className="t-mono">
          {t('no')} · {t('eyebrow')}
        </span>
        <h2 className="ed-eyebrow-title">
          {t('titleA')}
          <br />
          <span className="ed-italic">{t('titleB')}</span>
        </h2>
      </div>
      <div className="ed-faq-list">
        {items.map((it, i) => (
          <div key={i} className={`ed-faq-item${open === i ? ' open' : ''}`}>
            <button
              type="button"
              className="ed-faq-q"
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
            >
              <span className="ed-faq-num t-mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="ed-faq-q-text">{it.q}</span>
              <span className="ed-faq-toggle">
                {open === i ? (
                  <Minus size={16} aria-hidden="true" />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
              </span>
            </button>
            <div className="ed-faq-a">
              <div className="ed-faq-a-inner">{it.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Final CTA + Footer ───────────── */
export function FinalCtaFooter() {
  const ref = useReveal();
  const t = useTranslations('landing.finale');
  const locale = useLocale();
  const columns = t.raw('columns') as FinaleColumn[];
  return (
    <section ref={ref} className="ed-finale h-reveal">
      <div className="ed-finale-aurora" aria-hidden="true" />
      <HeroStars count={20} />
      <div className="ed-finale-cta">
        <h2 className="ed-finale-title">
          {t('titleA')}
          <br />
          <span className="ed-italic">{t('titleB')}</span>
        </h2>
        <Link href={`/${locale}/book`} className="ed-finale-btn">
          <span>{t('cta')}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <div className="ed-finale-trust t-mono">
          <span>{t('trustRating')}</span>
          <span>·</span>
          <span>{t('trustTrips')}</span>
          <span>·</span>
          <span>{t('trustFees')}</span>
        </div>
      </div>
      <div className="ed-finale-rule" />
      <div className="ed-finale-footer">
        <div className="ed-finale-brand">
          <div className="ed-finale-logo">
            <Logo size={28} accent="#ffffff" centerline="oklch(0.06 0.005 240)" />
          </div>
          <p className="ed-finale-tag">{t('tag')}</p>
        </div>
        {columns.map((c, i) => (
          <div key={i} className="ed-finale-col">
            <div className="ed-finale-coltitle t-mono">{c.title}</div>
            {c.items.map((it, j) => (
              <Link key={j} href={`/${locale}/book`} className="ed-finale-link">
                {it}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="ed-finale-bar t-mono">
        <span>{t('barLeft')}</span>
        <span>{t('barRight')}</span>
      </div>
    </section>
  );
}
