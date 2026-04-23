import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { DM_Sans, Cairo, Space_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { Providers } from '@/providers';
import { Sidebar } from '@/components/Sidebar';
import '../globals.css';

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

export const metadata: Metadata = {
  title: 'Hitch Dashboard',
  description: 'Admin + dispatcher panel',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers dir={dir}>
            <div className="flex min-h-screen">
              <Sidebar locale={locale} />
              <main className="flex-1 p-8">{children}</main>
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
