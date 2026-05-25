import { setRequestLocale } from 'next-intl/server';
import { Confirmation } from '@/components/book/confirmation';

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; bookingId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale, bookingId } = await params;
  const { t } = await searchParams;
  setRequestLocale(locale);

  return <Confirmation bookingId={bookingId} guestToken={t ?? undefined} />;
}
