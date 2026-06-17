'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Star, ExternalLink, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { cn } from '@/lib/ui';
import { useAdminDriver, useSetDriverOnline, useVerifyDocument } from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDate } from '@/lib/i18n-shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/admin/StatusBadge';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{children}</span>
    </div>
  );
}

export default function DriverDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0]! : (params.id ?? '');
  const locale = useLocale() as Locale;
  const t = useTranslations('admin.drivers');
  const tAdmin = useTranslations('admin');

  const query = useAdminDriver(id);
  const setOnline = useSetDriverOnline(id);
  const verify = useVerifyDocument(id);

  const backHref = `/${locale}/admin/drivers`;

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
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
      </div>
    );
  }

  const d = query.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label={t('title')}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar name={d.name} src={d.avatarUrl} className="size-10" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{d.name ?? '—'}</h1>
          <p className="truncate text-sm text-ltr text-muted-foreground">{d.email}</p>
        </div>
        <div className="ms-auto flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <span
              className={cn(
                'size-2 rounded-full',
                d.isOnline ? 'bg-secondary' : 'bg-muted-foreground/40',
              )}
            />
            {d.isOnline ? t('online') : t('offline')}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={setOnline.isPending}
            onClick={() => setOnline.mutate({ isOnline: !d.isOnline })}
          >
            {d.isOnline ? t('setOffline') : t('setOnline')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">{t('tabsProfile')}</TabsTrigger>
          <TabsTrigger value="vehicles">{t('tabsVehicles')}</TabsTrigger>
          <TabsTrigger value="documents">{t('tabsDocuments')}</TabsTrigger>
          <TabsTrigger value="ratings">{t('tabsRatings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-1 p-6">
                <Row label={t('name')}>{d.name ?? '—'}</Row>
                <Row label={t('email')}>
                  <span className="text-ltr">{d.email}</span>
                </Row>
                <Row label={t('phone')}>
                  <span className="text-ltr">{d.phone ?? '—'}</span>
                </Row>
                <Row label={t('colStatus')}>{d.isOnline ? t('online') : t('offline')}</Row>
                <Row label={t('colRating')}>
                  {d.rating.avg != null
                    ? `${d.rating.avg.toFixed(2)} (${t('ratingCount', { count: d.rating.count })})`
                    : '—'}
                </Row>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-3 text-sm font-medium">{t('recentTrips')}</h3>
                {d.recentBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tAdmin('empty')}</p>
                ) : (
                  <ul className="flex flex-col divide-y">
                    {d.recentBookings.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/${locale}/admin/bookings/${b.id}`}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <StatusBadge status={b.status} />
                            <span className="truncate text-sm">
                              {b.pickupAddress} → {b.dropoffAddress}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatCurrencyMinor(b.displayPrice, b.displayCurrency, locale)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardContent className="p-6">
              {d.vehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noVehicles')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.vehicles.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium">
                          {v.make} {v.model} · {v.year}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-ltr">{v.licensePlate}</span> · {v.color} · {v.vehicleType} ·{' '}
                          {v.capacity}
                        </p>
                      </div>
                      <Badge variant={v.isActive ? 'secondary' : 'muted'}>
                        {v.isActive ? t('online') : t('offline')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-6">
              {d.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noDocuments')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{doc.type}</span>
                        {doc.verifiedAt ? (
                          <Badge variant="secondary">
                            <ShieldCheck className="size-3" />
                            {t('verified')}
                          </Badge>
                        ) : (
                          <Badge variant="accent">{t('unverified')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                        >
                          <ExternalLink className="size-4" />
                          {t('view')}
                        </a>
                        {!doc.verifiedAt && (
                          <Button
                            size="sm"
                            disabled={verify.isPending}
                            onClick={() => verify.mutate({ docId: doc.id })}
                          >
                            {t('verify')}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardContent className="p-6">
              {d.ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noRatings')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {d.ratings.map((r) => (
                    <li key={r.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-sm font-medium">
                          <Star className="size-3.5 text-accent" />
                          {r.score}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(r.createdAt, locale)}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
