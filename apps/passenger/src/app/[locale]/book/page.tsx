import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';

/**
 * Placeholder for the booking flow. The landing page's CTAs route here;
 * the quote/confirm/track screens are out of scope for this pass.
 */
export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('book');

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground max-w-prose">{t('body')}</p>
      <Link
        href={`/${locale}`}
        className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {t('backHome')}
      </Link>
    </main>
  );
}
