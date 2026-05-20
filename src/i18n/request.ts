import { getRequestConfig } from 'next-intl/server';
import isMessages from '@/../messages/is.json';
import enMessages from '@/../messages/en.json';
import arMessages from '@/../messages/ar.json';
import { routing } from './routing';

const MESSAGES = {
  is: isMessages,
  en: enMessages,
  ar: arMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(
    (requested ?? '') as (typeof routing.locales)[number],
  )
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return { locale, messages: MESSAGES[locale] };
});
