'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBookingDraft } from '@/stores/booking-draft';
import { cn } from '@/lib/ui';

function buildSchema(messages: {
  name: string;
  email: string;
  phone: string;
}) {
  return z.object({
    name: z.string().min(1, messages.name).max(120),
    email: z.string().email(messages.email).max(254),
    phone: z
      .string()
      .refine((v) => isValidPhoneNumber(v, 'IS') || isValidPhoneNumber(v), messages.phone),
    flightNumber: z.string().optional(),
  });
}
type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function PassengerDetailsStep() {
  const t = useTranslations('book.details');
  const draft = useBookingDraft();

  const schema = buildSchema({
    name: t('errors.name'),
    email: t('errors.email'),
    phone: t('errors.phone'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: draft.guest?.name ?? '',
      email: draft.guest?.email ?? '',
      phone: draft.guest?.phone ?? '+354 ',
      flightNumber: draft.flightNumber ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    draft.setGuest({ name: values.name, email: values.email, phone: values.phone });
    if (values.flightNumber && values.flightNumber.trim().length > 0) {
      draft.setFlightNumber(values.flightNumber.trim());
    } else {
      draft.setFlightNumber(undefined);
    }
    draft.setStep('payment');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
      </header>

      <FormField label={t('nameLabel')} error={errors.name?.message}>
        <input
          type="text"
          autoComplete="name"
          className={inputClass(!!errors.name)}
          placeholder={t('namePlaceholder')}
          {...register('name')}
        />
      </FormField>

      <FormField label={t('emailLabel')} error={errors.email?.message}>
        <input
          type="email"
          autoComplete="email"
          className={cn(inputClass(!!errors.email), 'text-ltr')}
          placeholder={t('emailPlaceholder')}
          {...register('email')}
        />
      </FormField>

      <FormField
        label={t('phoneLabel')}
        hint={t('phoneHint')}
        error={errors.phone?.message}
      >
        <input
          type="tel"
          autoComplete="tel"
          className={cn(inputClass(!!errors.phone), 'text-ltr')}
          placeholder={t('phonePlaceholder')}
          {...register('phone')}
        />
      </FormField>

      <FormField
        label={t('flightLabel')}
        hint={t('flightHint')}
        error={errors.flightNumber?.message}
      >
        <input
          type="text"
          className={cn(inputClass(!!errors.flightNumber), 'text-ltr font-mono')}
          placeholder={t('flightPlaceholder')}
          {...register('flightNumber')}
        />
      </FormField>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => draft.setStep('quote')}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {t('continueCta')}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-foreground text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-muted-foreground text-xs">{hint}</span>}
      {error && (
        <span className="text-destructive text-xs" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    'w-full rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors',
    'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
    hasError && 'border-destructive focus:border-destructive focus:ring-destructive/20',
  );
}
