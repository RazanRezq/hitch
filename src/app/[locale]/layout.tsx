import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { DM_Sans, Cairo, Space_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { Providers } from '@/providers';
import '../globals.css';
import '../editorial.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const OG_LOCALE: Record<AppLocale, string> = {
  is: 'is_IS',
  en: 'en_US',
  ar: 'ar_AR',
};

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-sans-ar',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) {
    return { title: 'Hitch' };
  }
  const t = await getTranslations({ locale, namespace: 'meta' });
  const appLocale = locale as AppLocale;
  const path = locale === routing.defaultLocale ? '/' : `/${locale}`;
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `/${l}`]),
  ) as Record<AppLocale, string>;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      template: t('titleTemplate'),
    },
    description: t('description'),
    applicationName: 'Hitch',
    keywords: [
      'Iceland',
      'Keflavík Airport',
      'KEF',
      'Reykjavík',
      'airport transfer',
      'taxi',
      'ride booking',
      'Blue Lagoon',
      'Bláa Lónið',
      'Hitch',
    ],
    authors: [{ name: 'Hitch ehf.' }],
    creator: 'Hitch ehf.',
    publisher: 'Hitch ehf.',
    formatDetection: { telephone: false, email: false, address: false },
    alternates: {
      canonical: path,
      languages: { ...languages, 'x-default': '/' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Hitch',
      title: t('ogTitle'),
      description: t('ogDescription'),
      url: path,
      locale: OG_LOCALE[appLocale],
      alternateLocale: routing.locales
        .filter((l) => l !== appLocale)
        .map((l) => OG_LOCALE[l as AppLocale]),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    icons: {
      icon: '/favicon.ico',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) notFound();

  setRequestLocale(locale);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${dmSans.variable} ${cairo.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers dir={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
