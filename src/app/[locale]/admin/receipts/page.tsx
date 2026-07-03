'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, Plus } from 'lucide-react';
import type { Locale, ReceiptSource } from '@/lib/types';
import { RECEIPT_SOURCES } from '@/lib/types';
import { useAdminReceipts } from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDateTime } from '@/lib/i18n-shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/admin/Pagination';
import { IssueReceiptDialog } from '@/components/admin/IssueReceiptDialog';

export default function ReceiptsPage() {
  const t = useTranslations('admin.receipts');
  const tAdmin = useTranslations('admin');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [source, setSource] = useState<ReceiptSource | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const query = useAdminReceipts({
    page,
    pageSize: 20,
    q: q || undefined,
    source: source || undefined,
  });

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t('new')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="ps-9"
          />
        </form>
        <Select
          value={source}
          onChange={(e) => {
            setPage(1);
            setSource(e.target.value as ReceiptSource | '');
          }}
          className="sm:w-52"
          aria-label={t('filterSource')}
        >
          <option value="">{`${t('filterSource')}: ${tAdmin('all')}`}</option>
          <option value={RECEIPT_SOURCES.BOOKING}>{t('sourceBooking')}</option>
          <option value={RECEIPT_SOURCES.MANUAL}>{t('sourceManual')}</option>
        </Select>
      </div>

      <Card className="overflow-hidden p-0">
        {query.isError ? (
          <div className="flex flex-col items-center gap-3 p-10">
            <p className="text-sm text-muted-foreground">{tAdmin('error')}</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              {tAdmin('retry')}
            </Button>
          </div>
        ) : query.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t('noResults')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colNumber')}</TableHead>
                <TableHead>{t('colDate')}</TableHead>
                <TableHead>{t('colRoute')}</TableHead>
                <TableHead>{t('colDriver')}</TableHead>
                <TableHead>{t('colSource')}</TableHead>
                <TableHead className="text-end">{t('colAmount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${locale}/admin/receipts/${r.id}`)}
                >
                  <TableCell className="font-mono text-xs text-ltr">{r.number}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(r.issuedFor, locale)}
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm">
                    {r.pickupAddress} → {r.dropoffAddress}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.driverName ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.source === RECEIPT_SOURCES.BOOKING ? t('sourceBooking') : t('sourceManual')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-end text-sm tabular-nums">
                    {formatCurrencyMinor(r.totalAmount, r.currency, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {query.data && query.data.total > 0 && (
        <Pagination
          page={page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPage={setPage}
        />
      )}

      <IssueReceiptDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
