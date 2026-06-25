import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, type AppLocale } from '@/i18n/routing';
import { Header } from '@/components/landing/header';
import { ToursCatalog } from '@/components/tours/tours-catalog';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale as AppLocale)) return { title: 'Hitch' };
  const t = await getTranslations({ locale, namespace: 'tours' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}

export default async function ToursPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Header />
      <ToursCatalog />
    </>
  );
}
