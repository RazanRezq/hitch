import { format as formatDateFn } from 'date-fns';
import { is, enGB, arSA } from 'date-fns/locale';
import type { Currency, Locale } from '@/lib/types';

export {
  LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  CURRENCIES,
  DEFAULT_CURRENCY,
  CURRENCY_DECIMALS,
  isRtl,
} from '@/lib/types';
export type { Locale, Currency } from '@/lib/types';

const LOCALE_TAG: Record<Locale, string> = {
  is: 'is-IS',
  en: 'en-IS',
  ar: 'ar',
};

const DATE_FNS_LOCALE = { is, en: enGB, ar: arSA };

/**
 * Format currency with Western digits always, even in Arabic. ISK has no decimals;
 * EUR/USD have 2. See CLAUDE.md "Currency & Number Formatting".
 */
export function formatCurrency(amount: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: 'currency',
    currency,
    numberingSystem: 'latn',
    maximumFractionDigits: currency === 'ISK' ? 0 : 2,
    minimumFractionDigits: currency === 'ISK' ? 0 : 2,
  }).format(amount);
}

/**
 * Format an integer in the currency's smallest unit (kr for ISK, cents for
 * EUR/USD). Mirrors the contract used by Booking.displayPrice and the quote
 * endpoint. See CLAUDE.md "Currency & Number Formatting".
 */
export function formatCurrencyMinor(
  amountMinor: number,
  currency: Currency,
  locale: Locale,
): string {
  const decimals = currency === 'ISK' ? 0 : 2;
  const major = amountMinor / 10 ** decimals;
  return formatCurrency(major, currency, locale);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    numberingSystem: 'latn',
  }).format(value);
}

export function formatDate(value: Date | string | number, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  const pattern = locale === 'ar' ? 'dd/MM/yyyy' : 'dd.MM.yyyy';
  return formatDateFn(date, pattern, { locale: DATE_FNS_LOCALE[locale] });
}

export function formatDateTime(value: Date | string | number, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  const pattern = locale === 'ar' ? 'dd/MM/yyyy HH:mm' : 'dd.MM.yyyy HH:mm';
  return formatDateFn(date, pattern, { locale: DATE_FNS_LOCALE[locale] });
}

export function formatTime(value: Date | string | number, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  return formatDateFn(date, 'HH:mm', { locale: DATE_FNS_LOCALE[locale] });
}
