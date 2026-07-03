'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { usePublicReceipt } from '@/lib/api-client/hooks/useReceipt';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReceiptDocument } from '@/components/admin/ReceiptDocument';

/**
 * Public receipt view — the target of the QR printed on every receipt. Reachable
 * by the receipt's unguessable id (no login), so a customer can scan and view or
 * save their receipt. Renders the same branded document as the dashboard.
 */
export default function PublicReceiptPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0]! : (params.id ?? '');
  const locale = useLocale() as Locale;
  const t = useTranslations('receipt');
  const query = usePublicReceipt(id);

  if (query.isLoading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Skeleton className="h-[36rem] w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-lg font-semibold">{t('notFound')}</h1>
        <p className="text-sm text-muted-foreground">{t('notFoundHint')}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex justify-end print:hidden">
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            {t('print')}
          </Button>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm print:border-0 print:shadow-none">
          <ReceiptDocument receipt={query.data} locale={locale} />
        </div>
      </div>
    </main>
  );
}
