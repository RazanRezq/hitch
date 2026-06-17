'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/lib/types';
import { BOOKING_STATUSES } from '@/lib/types';
import { cn } from '@/lib/ui';
import {
  useAdminBookings,
  useDispatchFeed,
  useDriverLocations,
} from '@/lib/api-client/hooks/admin';
import { useAdminDispatch } from '@/stores/admin-dispatch';
import { formatDateTime } from '@/lib/i18n-shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DispatchMap } from '@/components/admin/DispatchMap';
import { AssignDriverDialog } from '@/components/admin/AssignDriverDialog';

export default function DispatchPage() {
  const t = useTranslations('admin.dispatch');
  const locale = useLocale() as Locale;

  const wsStatus = useDriverLocations();
  useDispatchFeed();
  const queue = useAdminBookings({ status: BOOKING_STATUSES.SEARCHING, pageSize: 50 });
  const driverCount = useAdminDispatch((s) => Object.keys(s.locations).length);
  const [assignBooking, setAssignBooking] = useState<string | null>(null);

  const items = queue.data?.items ?? [];
  const statusKey = wsStatus === 'live' ? 'live' : wsStatus === 'connecting' ? 'connecting' : 'offline';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span
              className={cn(
                'size-2 rounded-full',
                wsStatus === 'live'
                  ? 'bg-secondary'
                  : wsStatus === 'connecting'
                    ? 'bg-accent'
                    : 'bg-destructive',
              )}
            />
            {t(statusKey)}
          </span>
          <span>
            · {driverCount} {t('onlineDrivers')}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="h-[60vh] lg:h-[calc(100vh-10rem)]">
          <DispatchMap />
        </div>

        <Card className="flex flex-col overflow-hidden p-0 lg:h-[calc(100vh-10rem)]">
          <div className="border-b p-4">
            <h2 className="text-sm font-medium">{t('queue')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {queue.isLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t('queueEmpty')}</p>
            ) : (
              <ul className="divide-y">
                {items.map((b) => (
                  <li key={b.id} className="p-4">
                    <p className="truncate text-sm font-medium">
                      {b.pickupAddress} → {b.dropoffAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(b.scheduledTime, locale)}
                    </p>
                    <Button size="sm" className="mt-2" onClick={() => setAssignBooking(b.id)}>
                      {t('assign')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {assignBooking && (
        <AssignDriverDialog
          bookingId={assignBooking}
          open={!!assignBooking}
          onClose={() => setAssignBooking(null)}
          onAssigned={() => queue.refetch()}
        />
      )}
    </div>
  );
}
