'use client';

import { useTranslations } from 'next-intl';
import type { BookingStatus } from '@/lib/types';
import { Badge, type BadgeProps } from '@/components/ui/badge';

// Status → token-based badge variant. Only theme tokens (no hardcoded colours):
// neutral=muted, needs-dispatch=accent, active=primary(default), done=secondary, bad=destructive.
const VARIANT: Record<BookingStatus, BadgeProps['variant']> = {
  DRAFT: 'muted',
  PENDING_PAYMENT: 'muted',
  CONFIRMED: 'accent',
  SEARCHING: 'accent',
  ACCEPTED: 'default',
  DRIVER_ARRIVING: 'default',
  DRIVER_ARRIVED: 'default',
  IN_TRANSIT: 'default',
  COMPLETED: 'secondary',
  CANCELLED_BY_PASSENGER: 'destructive',
  CANCELLED_BY_DRIVER: 'destructive',
  CANCELLED_BY_SYSTEM: 'destructive',
  NO_SHOW: 'destructive',
  DISPUTED: 'destructive',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations('admin.status');
  return <Badge variant={VARIANT[status]}>{t(status)}</Badge>;
}
