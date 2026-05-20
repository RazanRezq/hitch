'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { LOCALES, type Locale } from '@hitch/i18n';

/**
 * Switches the active locale by swapping the leading `/{locale}` URL segment
 * (localePrefix is 'always'), preserving the rest of the path. Language is a
 * routing concern, not client state — see usePreferences for currency.
 */
export function useChangeLocale() {
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === current) return;
    const segments = pathname.split('/');
    // segments[0] is '' (leading slash); segments[1] is the locale.
    if (LOCALES.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const target = segments.join('/') || `/${next}`;
    startTransition(() => router.replace(target));
  };

  return { locale: current, change, isPending };
}
