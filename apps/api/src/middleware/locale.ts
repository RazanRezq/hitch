import type { MiddlewareHandler } from 'hono';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@hitch/types';

/** Reads Accept-Language and attaches `c.get('locale')`. */
export const localeMiddleware: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('accept-language') ?? '';
  const candidate = header.split(',')[0]?.slice(0, 2).toLowerCase();
  const locale: Locale = (LOCALES as readonly string[]).includes(candidate ?? '')
    ? (candidate as Locale)
    : DEFAULT_LOCALE;
  c.set('locale', locale);
  await next();
};
