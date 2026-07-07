'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Currency, Locale } from '@/lib/types';
import { formatCurrencyMinor } from '@/lib/i18n-shared';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRefundBooking } from '@/lib/api-client/hooks/admin';

interface RefundDialogProps {
  bookingId: string;
  /** Captured amount in the payment's display-currency minor units. */
  amountMinor: number;
  currency: Currency;
  open: boolean;
  onClose: () => void;
}

/**
 * Full-refund confirmation for a captured payment. The endpoint supports
 * partial refunds (`amountMinor`); the UI keeps to full refunds until the
 * client's refund policy lands.
 */
export function RefundDialog({ bookingId, amountMinor, currency, open, onClose }: RefundDialogProps) {
  const t = useTranslations('admin.bookings');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const refund = useRefundBooking(bookingId);
  const [reason, setReason] = useState('');

  async function submit() {
    try {
      await refund.mutateAsync({ reason: reason.trim() || undefined });
      onClose();
    } catch {
      /* surfaced via refund.isError below */
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('refundTitle')}>
      <DialogHeader>
        <DialogTitle>{t('refundTitle')}</DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">
        {t('refundBody', { amount: formatCurrencyMinor(amountMinor, currency, locale) })}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="refund-reason">{t('refundReasonLabel')}</Label>
        <Input
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
        />
      </div>

      {refund.isError && <p className="text-sm text-destructive">{t('refundError')}</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={refund.isPending}>
          {tc('cancel')}
        </Button>
        <Button variant="destructive" onClick={submit} disabled={refund.isPending}>
          {t('refundConfirm')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
