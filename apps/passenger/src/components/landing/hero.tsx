'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowDownUp,
  ArrowRight,
  Baby,
  Calendar,
  Clock,
  CreditCard,
  Hand,
  Lock,
  MapPin,
  Navigation,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  ShieldCheck,
  Users,
  Waves,
} from 'lucide-react';
import { AuroraSky } from './aurora-sky';

type TabId = 'toAirport' | 'fromAirport' | 'blueLagoon';

export function Hero() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();

  const verbs = [
    { text: t('verbA'), italic: false },
    { text: t('verbB'), italic: true },
    { text: t('verbC'), italic: false },
  ];

  const tabs: { id: TabId; label: string; icon: typeof PlaneTakeoff }[] = [
    { id: 'toAirport', label: t('tabToAirport'), icon: PlaneTakeoff },
    { id: 'fromAirport', label: t('tabFromAirport'), icon: PlaneLanding },
    { id: 'blueLagoon', label: t('tabBlueLagoon'), icon: Waves },
  ];

  const [tab, setTab] = useState<TabId>('toAirport');
  const [pax, setPax] = useState(2);

  const isFromAirport = tab === 'fromAirport';
  const isBlueLagoon = tab === 'blueLagoon';

  const dropLabel = isBlueLagoon
    ? t('dropLagoon')
    : isFromAirport
      ? t('dropCity')
      : t('dropAirport');
  const dropBadge = isBlueLagoon ? 'BLU' : isFromAirport ? 'RVK' : 'KEF';
  const pickupPlaceholder = isFromAirport ? t('pickupPlaceholderFrom') : t('pickupPlaceholderTo');

  return (
    <section id="top" className="ed-hero">
      <div className="ed-hero-bg" aria-hidden="true">
        <AuroraSky />
        <div className="ed-hero-video-tint" />
      </div>

      <div className="ed-hero-grid">
        <div className="ed-hero-text">
          <h1 className="ed-display">
            {verbs.map((v, i) => (
              <span
                key={i}
                className="ed-display-line"
                style={{ animationDelay: `${220 + i * 220}ms` }}
              >
                <span className={`ed-display-word${v.italic ? ' ed-italic' : ''}`}>{v.text}</span>
              </span>
            ))}
          </h1>
          <p className="ed-hero-sub">{t('sub')}</p>
        </div>

        <aside className="ed-search" aria-label={t('searchLabel')}>
          <div className="ed-search-head">
            <div className="ed-search-tabs">
              {tabs.map((it) => {
                const TabIcon = it.icon;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={`ed-search-tab${tab === it.id ? ' on' : ''}`}
                    onClick={() => setTab(it.id)}
                  >
                    <TabIcon size={15} aria-hidden="true" />
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ed-search-row">
            <div className="ed-field ed-field-grow">
              <div className="ed-field-icon">
                <MapPin size={18} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('pickup')}</div>
                <div className="ed-field-value ed-field-placeholder">{pickupPlaceholder}</div>
              </div>
              <button className="ed-field-swap" aria-label={t('swap')} type="button">
                <ArrowDownUp size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="ed-field ed-field-grow">
              <div className="ed-field-icon ed-field-icon-tinted">
                <Navigation size={18} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('dropoff')}</div>
                <div className="ed-field-value">{dropLabel}</div>
              </div>
              <span className="ed-field-pill t-mono">
                <Lock size={11} aria-hidden="true" /> {dropBadge}
              </span>
            </div>

            <div className="ed-field ed-field-compact">
              <div className="ed-field-icon">
                <Calendar size={16} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('date')}</div>
                <div className="ed-field-value">{t('today')}</div>
              </div>
            </div>

            <div className="ed-field ed-field-compact">
              <div className="ed-field-icon">
                <Clock size={16} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('time')}</div>
                <div className="ed-field-value t-mono">14:30</div>
              </div>
            </div>

            <div className="ed-field ed-field-compact ed-field-pax">
              <div className="ed-field-icon">
                <Users size={16} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('pax')}</div>
                <div className="ed-field-value ed-pax-row">
                  <button
                    type="button"
                    aria-label={t('decrement')}
                    onClick={() => setPax((p) => Math.max(1, p - 1))}
                  >
                    −
                  </button>
                  <span className="t-mono">{pax}</span>
                  <button
                    type="button"
                    aria-label={t('increment')}
                    onClick={() => setPax((p) => Math.min(8, p + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <Link href={`/${locale}/book`} className="ed-search-cta">
              <span>{t('search')}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="ed-search-foot-row">
            <div className="ed-search-chips">
              <button className="ed-chip" type="button">
                <Plane size={13} aria-hidden="true" />
                {t('addFlight')}
              </button>
              <button className="ed-chip" type="button">
                <Baby size={13} aria-hidden="true" />
                {t('childSeat')}
              </button>
              <button className="ed-chip ed-chip-on" type="button">
                <Hand size={13} aria-hidden="true" />
                {t('meetGreet')}
              </button>
            </div>
            <div className="ed-search-foot">
              <span className="ed-search-foot-live">
                <span className="ed-livedot" />
                <strong>{t('footCarsStrong')}</strong> {t('footCarsRest')}
              </span>
              <span>
                <ShieldCheck size={13} aria-hidden="true" />
                <strong>{t('footCancelStrong')}</strong> {t('footCancelRest')}
              </span>
              <span>
                <CreditCard size={13} aria-hidden="true" />
                {t('footPay')}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
