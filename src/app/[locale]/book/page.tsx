import { setRequestLocale } from 'next-intl/server';
import { BookingWizard } from '@/components/book/booking-wizard';

/**
 * Three URL shapes are accepted:
 *  - Preset:  ?preset=kef-to-rvk
 *  - Custom:  ?pickupLat=…&pickupLng=…&pickupAddress=…&dropoffLat=…&dropoffLng=…&dropoffAddress=…
 *  - Either of the above plus &pax=N&scheduledTime=ISO overrides.
 *
 * BookingWizard parses these client-side; we just forward them.
 */
export interface BookingSearchParams {
  preset?: string;
  pickupLat?: string;
  pickupLng?: string;
  pickupAddress?: string;
  dropoffLat?: string;
  dropoffLng?: string;
  dropoffAddress?: string;
  pax?: string;
  scheduledTime?: string;
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<BookingSearchParams>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  return <BookingWizard initialSearch={search} />;
}
