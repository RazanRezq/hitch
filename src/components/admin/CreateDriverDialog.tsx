'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { createDriverSchema, type CreateDriverInput } from '@/lib/types';
import { useCreateDriver } from '@/lib/api-client/hooks/admin';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateDriverDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateDriverDialog({ open, onClose }: CreateDriverDialogProps) {
  const t = useTranslations('admin.drivers');
  const tc = useTranslations('common');
  const create = useCreateDriver();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateDriverInput>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      reset();
      onClose();
    } catch {
      /* surfaced via create.isError */
    }
  });

  return (
    <Dialog open={open} onClose={onClose} title={t('createTitle')}>
      <DialogHeader>
        <DialogTitle>{t('createTitle')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="driver-name">{t('name')}</Label>
          <Input id="driver-name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="driver-email">{t('email')}</Label>
          <Input id="driver-email" type="email" className="text-ltr" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="driver-phone">{t('phone')}</Label>
          <Input
            id="driver-phone"
            className="text-ltr"
            {...register('phone', { setValueAs: (v) => (v === '' ? undefined : v) })}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        {create.isError && <p className="text-sm text-destructive">{t('createError')}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting || create.isPending}>
            {t('createCta')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
