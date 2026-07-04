'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAdminDrivers, useAssignDriver, apiErrorCode } from '@/lib/api-client/hooks/admin';

interface AssignDriverDialogProps {
  bookingId: string;
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export function AssignDriverDialog({ bookingId, open, onClose, onAssigned }: AssignDriverDialogProps) {
  const t = useTranslations('admin.bookings');
  const tc = useTranslations('common');
  const drivers = useAdminDrivers({ online: true, pageSize: 100 });
  const assign = useAssignDriver(bookingId);
  const [driverId, setDriverId] = useState('');

  const list = drivers.data?.items ?? [];

  async function submit() {
    if (!driverId) return;
    try {
      await assign.mutateAsync({ driverId });
      onAssigned?.();
      onClose();
    } catch {
      /* surfaced via assign.isError below */
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('assignTitle')}>
      <DialogHeader>
        <DialogTitle>{t('assignTitle')}</DialogTitle>
      </DialogHeader>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noOnlineDrivers')}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assign-driver">{t('assignDriver')}</Label>
          <Select
            id="assign-driver"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          >
            <option value="">—</option>
            {list.map((d) => (
              <option key={d.id} value={d.id}>
                {(d.name ?? d.email) + (d.vehicle ? ` · ${d.vehicle.make} ${d.vehicle.model}` : '')}
              </option>
            ))}
          </Select>
        </div>
      )}

      {assign.isError && (
        <p className="mt-3 text-sm text-destructive">
          {apiErrorCode(assign.error) === 'AUTHORIZATION_EXPIRED'
            ? t('assignErrorAuthExpired')
            : t('assignError')}
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {tc('cancel')}
        </Button>
        <Button onClick={submit} disabled={!driverId || assign.isPending}>
          {t('assignCta')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
