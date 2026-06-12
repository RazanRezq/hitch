'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, Plus, Star } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { cn } from '@/lib/ui';
import { useAdminDrivers } from '@/lib/api-client/hooks/admin';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Avatar } from '@/components/ui/avatar';
import { Pagination } from '@/components/admin/Pagination';
import { CreateDriverDialog } from '@/components/admin/CreateDriverDialog';

export default function DriversPage() {
  const t = useTranslations('admin.drivers');
  const tAdmin = useTranslations('admin');
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [online, setOnline] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const query = useAdminDrivers({
    page,
    pageSize: 20,
    q: q || undefined,
    online: online || undefined,
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
          {t('create')}
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={online}
            onChange={(e) => {
              setPage(1);
              setOnline(e.target.checked);
            }}
            className="size-4 rounded border-input accent-primary"
          />
          {t('onlyOnline')}
        </label>
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
                <TableHead>{t('colName')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead>{t('colVehicle')}</TableHead>
                <TableHead>{t('colRating')}</TableHead>
                <TableHead className="text-end">{t('colActive')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/${locale}/admin/drivers/${d.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={d.name} src={d.avatarUrl} className="size-8" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name ?? '—'}</p>
                        <p className="truncate text-xs text-ltr text-muted-foreground">{d.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          d.isOnline ? 'bg-secondary' : 'bg-muted-foreground/40',
                        )}
                      />
                      {d.isOnline ? t('online') : t('offline')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.vehicle ? (
                      <span>
                        {d.vehicle.make} {d.vehicle.model}{' '}
                        <span className="text-ltr text-muted-foreground">
                          ({d.vehicle.licensePlate})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t('noVehicle')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {d.rating.avg != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 text-accent" />
                        {d.rating.avg.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end text-sm tabular-nums">{d.activeTrips}</TableCell>
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

      <CreateDriverDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
