'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { VEHICLE_TYPES, createVehicleSchema, type CreateVehicleInput } from '@/lib/types';
import {
  useAdminDrivers,
  useCreateVehicle,
  useUpdateVehicle,
  type AdminVehicleListItem,
} from '@/lib/api-client/hooks/admin';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const VEHICLE_TYPE_VALUES = Object.values(VEHICLE_TYPES);
const CURRENT_YEAR = new Date().getFullYear();

const EMPTY: CreateVehicleInput = {
  driverId: '',
  vehicleType: 'SEDAN',
  licensePlate: '',
  make: '',
  model: '',
  year: CURRENT_YEAR,
  capacity: 4,
  color: '',
  isActive: true,
};

interface VehicleDialogProps {
  open: boolean;
  onClose: () => void;
  /** null → create mode; a vehicle → edit mode. */
  vehicle?: AdminVehicleListItem | null;
}

export function VehicleDialog({ open, onClose, vehicle }: VehicleDialogProps) {
  const t = useTranslations('admin.fleet');
  const tc = useTranslations('common');
  const isEdit = !!vehicle;

  const drivers = useAdminDrivers({ pageSize: 100 });
  const create = useCreateVehicle();
  const update = useUpdateVehicle(vehicle?.id ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      vehicle
        ? {
            driverId: vehicle.driver.id,
            vehicleType: vehicle.vehicleType,
            licensePlate: vehicle.licensePlate,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            capacity: vehicle.capacity,
            color: vehicle.color,
            isActive: vehicle.isActive,
          }
        : EMPTY,
    );
  }, [open, vehicle, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (vehicle) await update.mutateAsync(values);
      else await create.mutateAsync(values);
      onClose();
    } catch {
      /* surfaced below */
    }
  });

  const apiError = (create.error ?? update.error)?.message;
  const driverList = drivers.data?.items ?? [];

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? t('editTitle') : t('createTitle')}>
      <DialogHeader>
        <DialogTitle>{isEdit ? t('editTitle') : t('createTitle')}</DialogTitle>
      </DialogHeader>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v-driver">{t('driver')}</Label>
          <Select id="v-driver" {...register('driverId')}>
            <option value="">{t('selectDriver')}</option>
            {driverList.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name ?? d.email}
              </option>
            ))}
          </Select>
          {errors.driverId && <p className="text-xs text-destructive">{errors.driverId.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-type">{t('type')}</Label>
            <Select id="v-type" {...register('vehicleType')}>
              {VEHICLE_TYPE_VALUES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-plate">{t('plate')}</Label>
            <Input id="v-plate" className="text-ltr" {...register('licensePlate')} />
            {errors.licensePlate && (
              <p className="text-xs text-destructive">{errors.licensePlate.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-make">{t('make')}</Label>
            <Input id="v-make" {...register('make')} />
            {errors.make && <p className="text-xs text-destructive">{errors.make.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-model">{t('model')}</Label>
            <Input id="v-model" {...register('model')} />
            {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-year">{t('year')}</Label>
            <Input id="v-year" type="number" {...register('year', { valueAsNumber: true })} />
            {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-capacity">{t('capacity')}</Label>
            <Input
              id="v-capacity"
              type="number"
              {...register('capacity', { valueAsNumber: true })}
            />
            {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-color">{t('color')}</Label>
            <Input id="v-color" {...register('color')} />
            {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 rounded border-input accent-primary" {...register('isActive')} />
          {t('activeLabel')}
        </label>

        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting || create.isPending || update.isPending}>
            {isEdit ? t('saveCta') : t('createCta')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
