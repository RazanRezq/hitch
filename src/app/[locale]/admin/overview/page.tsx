'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  CalendarClock,
  Car,
  CheckCircle2,
  Coins,
  Percent,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import type { Locale } from '@/lib/types';
import { cn } from '@/lib/ui';
import { useAdminStats, useAdminBookings } from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDateTime } from '@/lib/i18n-shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/StatusBadge';

function Kpi({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <p className="text-xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const t = useTranslations('admin.overview');
  const locale = useLocale() as Locale;
  const stats = useAdminStats();
  const recent = useAdminBookings({ pageSize: 6 });

  const s = stats.data;
  const loading = stats.isLoading;
  const completion =
    s?.completionRate7d == null ? '—' : `${Math.round(s.completionRate7d * 100)}%`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Link href="./dispatch" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          {t('openDispatch')}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label={t('bookingsToday')} value={s?.bookingsToday ?? 0} icon={CalendarClock} loading={loading} />
        <Kpi
          label={t('revenueToday')}
          value={formatCurrencyMinor(s?.revenueISKToday ?? 0, 'ISK', locale)}
          icon={Coins}
          loading={loading}
        />
        <Kpi
          label={t('revenue7d')}
          value={formatCurrencyMinor(s?.revenueISK7d ?? 0, 'ISK', locale)}
          icon={Coins}
          loading={loading}
        />
        <Kpi label={t('activeTrips')} value={s?.activeTrips ?? 0} icon={Activity} loading={loading} />
        <Kpi label={t('onlineDrivers')} value={s?.onlineDrivers ?? 0} icon={Car} loading={loading} />
        <Kpi label={t('completedToday')} value={s?.completedToday ?? 0} icon={CheckCircle2} loading={loading} />
        <Kpi label={t('completionRate')} value={completion} icon={Percent} loading={loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !recent.data || recent.data.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noActivity')}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {recent.data.items.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`./bookings/${b.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusBadge status={b.status} />
                      <span className="truncate text-sm">
                        {b.pickupAddress} → {b.dropoffAddress}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(b.scheduledTime, locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
