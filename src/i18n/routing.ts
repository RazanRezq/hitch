import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['is', 'en', 'ar'],
  defaultLocale: 'is',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];
