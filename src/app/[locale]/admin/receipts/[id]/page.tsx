'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { useAdminReceipt } from '@/lib/api-client/hooks/admin';
import { cn } from '@/lib/ui';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReceiptDocument } from '@/components/admin/ReceiptDocument';

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0]! : (params.id ?? '');
  const locale = useLocale() as Locale;
  const t = useTranslations('admin.receipts');
  const tAdmin = useTranslations('admin');

  const query = useAdminReceipt(id);
  const backHref = `/${locale}/admin/receipts`;

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mx-auto h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-muted-foreground">{tAdmin('error')}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {tAdmin('retry')}
        </Button>
        <Link href={backHref} className="text-sm text-primary hover:underline">
          ← {t('title')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar — hidden when printing */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label={t('title')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex items-center gap-3 text-xl font-semibold">
          {t('detailTitle')}
          <span className="font-mono text-sm text-ltr text-muted-foreground">
            {query.data.number}
          </span>
        </h1>
        <Button className="ms-auto" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t('print')}
        </Button>
      </div>

      {/* The printable document */}
      <div className="rounded-2xl border bg-white shadow-sm print:border-0 print:shadow-none">
        <ReceiptDocument receipt={query.data} locale={locale} />
      </div>
    </div>
  );
}
