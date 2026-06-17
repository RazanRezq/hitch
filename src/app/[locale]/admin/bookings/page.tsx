'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import type { BookingStatus, Locale } from '@/lib/types';
import { BOOKING_STATUSES } from '@/lib/types';
import { useAdminBookings } from '@/lib/api-client/hooks/admin';
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
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Pagination } from '@/components/admin/Pagination';

const STATUS_VALUES = Object.values(BOOKING_STATUSES);

export default function BookingsPage() {
  const t = useTranslations('admin.bookings');
  const tStatus = useTranslations('admin.status');
  const tAdmin = useTranslations('admin');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const query = useAdminBookings({
    page,
    pageSize: 20,
    q: q || undefined,
    status: status || undefined,
  });

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

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
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as BookingStatus | '');
          }}
          className="sm:w-60"
          aria-label={t('filterStatus')}
        >
          <option value="">{`${t('filterStatus')}: ${tAdmin('all')}`}</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
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
                <TableHead>{t('colId')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead>{t('colRoute')}</TableHead>
                <TableHead>{t('colSchedule')}</TableHead>
                <TableHead>{t('colPassenger')}</TableHead>
                <TableHead>{t('colDriver')}</TableHead>
                <TableHead className="text-end">{t('colPrice')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((b) => (
                <TableRow
                  key={b.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${locale}/admin/bookings/${b.id}`)}
                >
                  <TableCell className="font-mono text-xs text-ltr">{b.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-sm">
                    {b.pickupAddress} → {b.dropoffAddress}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(b.scheduledTime, locale)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.passenger?.name ?? b.passenger?.email ?? t('guest')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {b.driver?.name ?? (
                      <span className="text-muted-foreground">{t('unassigned')}</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-end text-sm tabular-nums">
                    {formatCurrencyMinor(b.displayPrice, b.displayCurrency, locale)}
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
    </div>
  );
}
