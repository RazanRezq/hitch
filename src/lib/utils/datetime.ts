import { format, isToday, isTomorrow } from 'date-fns';
import { enGB, is } from 'date-fns/locale';

const dfLocales = { is, en: enGB } as const;

/**
 * Format an ISO date string into the value an `<input type="datetime-local">`
 * expects (`YYYY-MM-DDTHH:mm`, in the user's local timezone). Used by both
 * the booking wizard's Quote step and the landing-page hero search widget.
 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Friendly label for a scheduled pickup, e.g. `Today · 15:30`, `Tomorrow · 09:00`,
 * or `30.06 · 15:30` for any other day. Used by the hero search widget so the
 * WHEN field reads naturally instead of showing a raw datetime string. Pass the
 * already-localised "today"/"tomorrow" words so this stays i18n-clean.
 */
export function formatWhenLabel(
  localInput: string,
  locale: 'is' | 'en',
  labels: { today: string; tomorrow: string },
): string {
  const d = new Date(localInput);
  if (Number.isNaN(d.getTime())) return '';
  const dfLocale = dfLocales[locale];
  const time = format(d, 'HH:mm', { locale: dfLocale });
  if (isToday(d)) return `${labels.today} · ${time}`;
  if (isTomorrow(d)) return `${labels.tomorrow} · ${time}`;
  return `${format(d, 'dd.MM', { locale: dfLocale })} · ${time}`;
}
