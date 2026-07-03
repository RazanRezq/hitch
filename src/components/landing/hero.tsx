'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Baby,
  Calendar,
  Coins,
  CreditCard,
  Hand,
  Lock,
  Map as MapIcon,
  MapPin,
  Navigation,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  ShieldCheck,
  Users,
  Waves,
} from 'lucide-react';
import { LANDMARKS } from '@/lib/types';
import { formatWhenLabel, toLocalInput } from '@/lib/utils';
import { PlacesAutocomplete, type PlacePick } from '@/components/book/places-autocomplete';
import { AuroraSky } from './aurora-sky';

type TabId = 'toAirport' | 'fromAirport' | 'blueLagoon' | 'custom';
type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export function Hero() {
  const t = useTranslations('landing.hero');
  const locale = useLocale();
  const router = useRouter();

  const verbs = [
    { text: t('verbA'), italic: false },
    { text: t('verbB'), italic: true },
    { text: t('verbC'), italic: false },
  ];

  const tabs: { id: TabId; label: string; icon: IconComponent }[] = [
    { id: 'toAirport', label: t('tabToAirport'), icon: PlaneTakeoff },
    { id: 'fromAirport', label: t('tabFromAirport'), icon: PlaneLanding },
    { id: 'blueLagoon', label: t('tabBlueLagoon'), icon: Waves },
    { id: 'custom', label: t('tabCustom'), icon: MapIcon },
  ];

  const [tab, setTab] = useState<TabId>('toAirport');
  const [pax, setPax] = useState(2);
  const [pickup, setPickup] = useState<PlacePick | null>(null);
  const [dropoff, setDropoff] = useState<PlacePick | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
  );
  const [error, setError] = useState<string | null>(null);

  function changeTab(next: TabId) {
    if (next === tab) return;
    setTab(next);
    setPickup(null);
    setDropoff(null);
    setError(null);
  }

  // Per-tab locked-end resolution.
  const lockedPickup = tab === 'fromAirport' ? LANDMARKS.kef : null;
  const lockedDropoff =
    tab === 'toAirport' ? LANDMARKS.kef : tab === 'blueLagoon' ? LANDMARKS.blueLagoon : null;

  const pickupPlaceholder =
    tab === 'custom' ? t('pickupPlaceholderCustom') : t('pickupPlaceholderFrom');
  const dropoffPlaceholder = t('dropoffPlaceholderCustom');

  const whenLabel = formatWhenLabel(scheduledTime, locale as 'is' | 'en', {
    today: t('today'),
    tomorrow: t('tomorrow'),
  });

  function handleSubmit() {
    setError(null);

    // Blue Lagoon special-case: blank custom pickup → fall back to preset URL
    if (tab === 'blueLagoon' && !pickup) {
      const params = new URLSearchParams({ preset: 'kef-to-blue-lagoon' });
      if (pax !== 1) params.set('pax', String(pax));
      params.set('scheduledTime', new Date(scheduledTime).toISOString());
      router.push(`/${locale}/book?${params.toString()}`);
      return;
    }

    const finalPickup = lockedPickup ?? pickup;
    const finalDropoff = lockedDropoff ?? dropoff;
    if (!finalPickup || !finalDropoff) {
      setError(t('searchErrorMissing'));
      return;
    }

    const params = new URLSearchParams({
      pickupLat: String(finalPickup.lat),
      pickupLng: String(finalPickup.lng),
      pickupAddress: finalPickup.address,
      dropoffLat: String(finalDropoff.lat),
      dropoffLng: String(finalDropoff.lng),
      dropoffAddress: finalDropoff.address,
    });
    if (pax !== 1) params.set('pax', String(pax));
    params.set('scheduledTime', new Date(scheduledTime).toISOString());
    router.push(`/${locale}/book?${params.toString()}`);
  }

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
                    onClick={() => changeTab(it.id)}
                  >
                    <TabIcon size={15} aria-hidden="true" />
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ed-search-row">
            {/* Pickup slot */}
            {lockedPickup ? (
              <LockedSide
                label={t('pickup')}
                value={lockedPickup.address}
                code="KEF"
                icon={MapPin}
              />
            ) : (
              <AutocompleteSlot
                key={`pickup-${tab}`}
                label={t('pickup')}
                placeholder={pickupPlaceholder}
                icon={MapPin}
                onPick={setPickup}
              />
            )}

            {/* Dropoff slot */}
            {lockedDropoff ? (
              <LockedSide
                label={t('dropoff')}
                value={lockedDropoff.address}
                code={tab === 'toAirport' ? 'KEF' : 'BLU'}
                icon={Navigation}
                tinted
              />
            ) : (
              <AutocompleteSlot
                key={`dropoff-${tab}`}
                label={t('dropoff')}
                placeholder={dropoffPlaceholder}
                icon={Navigation}
                onPick={setDropoff}
                tinted
              />
            )}

            {/* When — friendly "Today · 15:30" label over a transparent native
                datetime-local input (keeps the picker + keyboard editing). */}
            <div className="ed-field ed-field-compact ed-field-when">
              <div className="ed-field-icon">
                <Calendar size={16} aria-hidden="true" />
              </div>
              <div className="ed-field-body">
                <div className="ed-field-label">{t('scheduledTime')}</div>
                <div className="ed-field-value t-mono" suppressHydrationWarning>
                  {whenLabel}
                </div>
              </div>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                aria-label={t('scheduledTime')}
                className="ed-when-input"
              />
            </div>

            {/* Pax */}
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

            <button type="button" onClick={handleSubmit} className="ed-search-cta">
              <span>{t('search')}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>

          {error && (
            <p className="text-destructive ms-2 mt-2 text-xs" role="alert">
              {error}
            </p>
          )}

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
              <span>
                <ShieldCheck size={13} aria-hidden="true" />
                <strong>{t('footChargeStrong')}</strong> {t('footChargeRest')}
              </span>
              <span>
                <CreditCard size={13} aria-hidden="true" />
                <strong>{t('footCancelStrong')}</strong> {t('footCancelRest')}
              </span>
              <span>
                <Coins size={13} aria-hidden="true" />
                {t('footPay')}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

interface LockedSideProps {
  label: string;
  value: string;
  code: string;
  icon: IconComponent;
  tinted?: boolean;
}

function LockedSide({ label, value, code, icon: Icon, tinted = false }: LockedSideProps) {
  return (
    <div className="ed-field ed-field-grow">
      <div className={`ed-field-icon${tinted ? ' ed-field-icon-tinted' : ''}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="ed-field-body">
        <div className="ed-field-label">{label}</div>
        <div className="ed-field-value ed-field-value-multiline">{value}</div>
      </div>
      <span className="ed-field-pill t-mono">
        <Lock size={11} aria-hidden="true" /> {code}
      </span>
    </div>
  );
}

interface AutocompleteSlotProps {
  label: string;
  placeholder: string;
  icon: IconComponent;
  onPick: (p: PlacePick) => void;
  tinted?: boolean;
}

function AutocompleteSlot({
  label,
  placeholder,
  icon: Icon,
  onPick,
  tinted = false,
}: AutocompleteSlotProps) {
  return (
    <div className="ed-field ed-field-grow">
      <div className={`ed-field-icon${tinted ? ' ed-field-icon-tinted' : ''}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="ed-field-body">
        <div className="ed-field-label">{label}</div>
        <PlacesAutocomplete
          placeholder={placeholder}
          onPick={onPick}
          inputClassName="ed-field-value w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
          hideStatus
        />
      </div>
    </div>
  );
}
