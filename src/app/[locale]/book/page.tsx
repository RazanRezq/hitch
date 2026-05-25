import { setRequestLocale } from 'next-intl/server';
import { BookingWizard } from '@/components/book/booking-wizard';

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { locale } = await params;
  const { preset } = await searchParams;
  setRequestLocale(locale);

  return <BookingWizard initialPreset={preset ?? null} />;
}
