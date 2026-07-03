'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import {
  manualReceiptFormSchema,
  RECEIPT_SOURCES,
  type Locale,
  type ManualReceiptFormInput,
  type ManualReceiptFormValues,
} from '@/lib/types';
import { useIssueReceipt } from '@/lib/api-client/hooks/admin';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface IssueReceiptDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Issue a MANUAL receipt (in-car / cash ride typed in by the operator) — the
 * "I type the data and it issues a receipt" tool. Booking receipts are issued
 * from the booking detail page instead, where the trip id is already in hand.
 * On success, navigates to the printable receipt.
 */
export function IssueReceiptDialog({ open, onClose }: IssueReceiptDialogProps) {
  const t = useTranslations('admin.receipts');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const issue = useIssueReceipt();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualReceiptFormInput, unknown, ManualReceiptFormValues>({
    resolver: zodResolver(manualReceiptFormSchema),
    defaultValues: {
      issuedFor: '',
      pickupAddress: '',
      dropoffAddress: '',
      driverName: '',
      vehiclePlate: '',
      cabNumber: '',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // The resolver transforms issuedFor to a Date; the wire shape is a string.
      // Send it as an offset-bearing ISO instant — the server respects the
      // offset, so no double timezone conversion on re-parse.
      const receipt = await issue.mutateAsync({
        source: RECEIPT_SOURCES.MANUAL,
        ...values,
        issuedFor: values.issuedFor.toISOString(),
      });
      reset();
      onClose();
      router.push(`/${locale}/admin/receipts/${receipt.id}`);
    } catch {
      /* surfaced via issue.isError */
    }
  });

  const numberField = (v: string) => (v === '' ? undefined : Number(v));

  return (
    <Dialog open={open} onClose={onClose} title={t('manualTitle')}>
      <DialogHeader>
        <DialogTitle>{t('manualTitle')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-datetime">{t('dateTime')}</Label>
          <Input id="r-datetime" type="datetime-local" {...register('issuedFor')} />
          {errors.issuedFor && (
            <p className="text-xs text-destructive">{errors.issuedFor.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-pickup">{t('pickup')}</Label>
          <Input id="r-pickup" {...register('pickupAddress')} />
          {errors.pickupAddress && (
            <p className="text-xs text-destructive">{errors.pickupAddress.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-dropoff">{t('destination')}</Label>
          <Input id="r-dropoff" {...register('dropoffAddress')} />
          {errors.dropoffAddress && (
            <p className="text-xs text-destructive">{errors.dropoffAddress.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-driver">{t('driver')}</Label>
            <Input id="r-driver" {...register('driverName')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-plate">{t('plate')}</Label>
            <Input id="r-plate" className="text-ltr" {...register('vehiclePlate')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-cab">{t('cabNumber')}</Label>
            <Input id="r-cab" className="text-ltr" {...register('cabNumber')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-fare">{t('fareIsk')}</Label>
            <Input
              id="r-fare"
              type="number"
              inputMode="numeric"
              min={1}
              {...register('fareAmountISK', { setValueAs: numberField })}
            />
            {errors.fareAmountISK && (
              <p className="text-xs text-destructive">{errors.fareAmountISK.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-tip">{t('tipIsk')}</Label>
          <Input
            id="r-tip"
            type="number"
            inputMode="numeric"
            min={0}
            {...register('tipAmountISK', { setValueAs: numberField })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-notes">{t('notes')}</Label>
          <Textarea id="r-notes" rows={2} {...register('notes')} />
        </div>

        {issue.isError && <p className="text-sm text-destructive">{t('issueError')}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting || issue.isPending}>
            {t('issueCta')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
