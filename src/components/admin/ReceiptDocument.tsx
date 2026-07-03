import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Phone, Mail, Globe, MapPin, Check } from 'lucide-react';
import { HITCH_COMPANY, type Locale } from '@/lib/types';
import type { AdminReceiptDetail } from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDate, formatTime } from '@/lib/i18n-shared';
import { HitchTaxiLogo } from '@/components/brand/HitchTaxiLogo';
import { QrCode } from '@/components/brand/QrCode';

/**
 * The branded fare receipt (kvittun) — a formal, international-style payment
 * receipt built around the HITCH TAXI logo and brand colours (navy #163F81,
 * taxi-yellow #F9D100). This is a print/PDF artifact: intentionally
 * document-styled (brand colours on white) rather than app-themed, so it prints
 * cleanly and reads as an official receipt. Consumed by the print view; safe to
 * render off-screen. NOT a legal VAT invoice — the client keeps that separate.
 */
export function ReceiptDocument({
  receipt,
  locale,
}: {
  receipt: AdminReceiptDetail;
  locale: Locale;
}) {
  const t = useTranslations('admin.receipts');

  const fare = formatCurrencyMinor(receipt.fareAmount, receipt.currency, locale);
  const total = formatCurrencyMinor(receipt.totalAmount, receipt.currency, locale);
  const tipStr =
    receipt.tipAmount != null ? formatCurrencyMinor(receipt.tipAmount, receipt.currency, locale) : null;
  const cab = [receipt.cabNumber, receipt.vehiclePlate].filter(Boolean).join(' · ');

  // Every receipt carries a QR to its own public page (reachable by unguessable
  // id, no login) so the customer can scan to view or save it.
  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hitch.is').replace(/\/+$/, '');
  const receiptUrl = `${siteBase}/${locale}/receipt/${receipt.id}`;

  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-8 text-[#1a1a1a]">
      {/* Header: logo + receipt title / number / issue date */}
      <header className="flex items-start justify-between gap-4">
        <HitchTaxiLogo className="h-12 w-auto" />
        <div className="text-end">
          <div className="text-2xl font-bold uppercase tracking-wide text-[#163F81]">
            {t('heading')}
          </div>
          <div className="mt-0.5 text-ltr font-mono text-sm font-bold text-[#163F81]">
            {receipt.number}
          </div>
          <div className="text-xs text-black/60">
            {t('issued')}: {formatDate(receipt.createdAt, locale)}
          </div>
        </div>
      </header>

      {/* Brand accent rule */}
      <div className="mt-4 flex h-1 w-full overflow-hidden rounded-full">
        <div className="w-20 bg-[#F9D100]" />
        <div className="flex-1 bg-[#163F81]" />
      </div>

      {/* Issuer + trip details */}
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <SectionLabel>{t('from')}</SectionLabel>
          <div className="mt-1.5 text-sm font-semibold text-[#163F81]">{HITCH_COMPANY.legalName}</div>
          <div className="mt-1 space-y-0.5 text-xs text-black/70">
            <div>Kt: {HITCH_COMPANY.kennitala}</div>
            <div>{HITCH_COMPANY.address}</div>
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 shrink-0 text-[#163F81]" aria-hidden="true" />
              <span className="text-ltr">{HITCH_COMPANY.phones[0]}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 shrink-0 text-[#163F81]" aria-hidden="true" />
              <span className="text-ltr">{HITCH_COMPANY.email}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="size-3 shrink-0 text-[#163F81]" aria-hidden="true" />
              <span className="text-ltr">{HITCH_COMPANY.web}</span>
            </div>
          </div>
        </div>

        <div className="text-end">
          <SectionLabel end>{t('details')}</SectionLabel>
          <dl className="mt-1.5 space-y-0.5 text-xs">
            <MetaRow label={t('date')}>{formatDate(receipt.issuedFor, locale)}</MetaRow>
            <MetaRow label={t('time')}>{formatTime(receipt.issuedFor, locale)}</MetaRow>
            {receipt.driverName && <MetaRow label={t('driver')}>{receipt.driverName}</MetaRow>}
            {cab && (
              <MetaRow label={t('cab')}>
                <span className="text-ltr font-mono">{cab}</span>
              </MetaRow>
            )}
          </dl>
        </div>
      </div>

      {/* Trip route */}
      <div className="mt-6">
        <SectionLabel>{t('trip')}</SectionLabel>
        <div className="mt-2 rounded-lg border border-black/10 p-3">
          <RoutePoint icon={<MapPin className="size-4 text-[#163F81]" aria-hidden="true" />} label={t('pickup')}>
            {receipt.pickupAddress}
          </RoutePoint>
          <div className="my-1 ms-2 h-3 border-s border-dashed border-black/25" />
          <RoutePoint
            icon={<MapPin className="size-4 text-[#163F81]" fill="#163F81" aria-hidden="true" />}
            label={t('destination')}
          >
            {receipt.dropoffAddress}
          </RoutePoint>
        </div>
      </div>

      {/* Line items */}
      <div className="mt-6 overflow-hidden rounded-lg border border-black/10">
        <div className="flex items-center justify-between bg-[#163F81] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white">
          <span>{t('description')}</span>
          <span>{t('amount')}</span>
        </div>
        <LineItem label={`${receipt.pickupAddress} → ${receipt.dropoffAddress}`} value={fare} />
        {tipStr && <LineItem label={t('tip')} value={tipStr} />}
      </div>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-[16rem]">
          {tipStr && (
            <>
              <TotalRow label={t('fare')} value={fare} />
              <TotalRow label={t('tip')} value={tipStr} />
            </>
          )}
          <div className="mt-1 flex items-center justify-between border-t-2 border-[#163F81] pt-2">
            <span className="text-sm font-bold uppercase tracking-wide text-[#163F81]">{t('total')}</span>
            <span className="text-lg font-bold tabular-nums text-[#163F81]">{total}</span>
          </div>
        </div>
      </div>

      {/* Paid badge + currency note */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#163F81] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          <Check className="size-3.5" aria-hidden="true" />
          {t('paid')}
        </span>
        <span className="text-[11px] text-black/50">
          {t('amountsIn', { currency: receipt.currency })}
        </span>
      </div>

      {receipt.notes && (
        <p className="mt-4 text-xs text-black/70">
          <span className="font-semibold">{t('notes')}:</span> {receipt.notes}
        </p>
      )}

      {/* Footer */}
      <footer className="mt-6 border-t border-black/10 pt-4 text-center">
        <div className="mb-4 flex flex-col items-center gap-1.5">
          <QrCode value={receiptUrl} className="size-24" title={t('scanToView')} />
          <span className="text-[11px] text-black/50">{t('scanToView')}</span>
        </div>
        <div className="text-sm font-semibold text-[#163F81]">{t('thanks')}</div>
        <div className="mt-1 text-ltr text-[11px] text-black/50">
          {HITCH_COMPANY.legalName} · Kt {HITCH_COMPANY.kennitala} · {HITCH_COMPANY.web}
        </div>
      </footer>
    </div>
  );
}

function SectionLabel({ children, end }: { children: ReactNode; end?: boolean }) {
  return (
    <div
      className={[
        'text-[11px] font-semibold uppercase tracking-widest text-black/40',
        end ? 'text-end' : '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/50">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function RoutePoint({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-black/45">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-black/10 px-4 py-2.5 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-xs text-black/60">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
