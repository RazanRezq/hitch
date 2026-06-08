'use client';

import { useMemo } from 'react';
import { useForm, useWatch, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react';
import {
  createFeedbackSchema,
  FEEDBACK_DESCRIPTION_MAX,
  type FeedbackSubmitInput,
  type FeedbackSubmitValues,
  type Locale,
} from '@/lib/types';
import { useSubmitFeedback } from '@/lib/api-client/hooks/useSubmitFeedback';
import { cn } from '@/lib/ui';

// Form shape is the schema's input type so the resolver lines up exactly.
type FormValues = FeedbackSubmitInput;

const DEFAULT_VALUES: FormValues = {
  name: '',
  phone: '',
  email: '',
  carNumber: '',
  driverName: '',
  incidentLocation: '',
  pickupLocation: '',
  dropoffLocation: '',
  incidentDateTime: '',
  description: '',
  requestRefund: false,
  notifyAuthorities: false,
  website: '',
};

const inputClass =
  'w-full rounded-2xl border border-input bg-card px-4 py-3 text-start text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-[invalid=true]:border-destructive';

function TextField({
  name,
  label,
  register,
  error,
  type = 'text',
  required = false,
  autoComplete,
  placeholder,
}: {
  name: keyof FormValues;
  label: string;
  register: UseFormRegister<FormValues>;
  error?: { message?: string };
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = `feedback-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
        {...register(name)}
      />
      {error?.message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}

function CheckboxField({
  name,
  label,
  register,
}: {
  name: keyof FormValues;
  label: string;
  register: UseFormRegister<FormValues>;
}) {
  const id = `feedback-${name}`;
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded accent-primary"
        {...register(name)}
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export function FeedbackForm() {
  const t = useTranslations('feedback');
  const locale = useLocale() as Locale;
  const mutation = useSubmitFeedback();

  const schema = useMemo(
    () =>
      createFeedbackSchema({
        emailRequired: t('validation.emailRequired'),
        emailInvalid: t('validation.emailInvalid'),
        descriptionRequired: t('validation.descriptionRequired'),
        descriptionMax: t('validation.descriptionMax', { max: FEEDBACK_DESCRIPTION_MAX }),
        incidentDateRequired: t('validation.incidentDateRequired'),
        locationRequired: t('validation.locationRequired'),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues, unknown, FeedbackSubmitValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  });

  const descriptionLength = useWatch({ control, name: 'description' })?.length ?? 0;

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ ...values, locale });
  });

  // Success state — uses the client-provided copy, shared with the auto-reply email.
  if (mutation.isSuccess) {
    const body = t('autoReply.body');
    const [heading, ...rest] = body.split('\n').filter(Boolean);
    const reference = mutation.data?.reference;
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-5 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <div aria-live="polite" className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold text-foreground">{heading}</h1>
          {rest.map((line, i) => (
            <p key={i} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
        {reference && (
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-6 py-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('referenceLabel')}
            </span>
            <span className="text-ltr font-mono text-lg font-semibold text-foreground">
              {reference}
            </span>
          </div>
        )}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('backHome')}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 md:py-12">
      <header className="mb-6 flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-destructive">
          <AlertTriangle size={14} aria-hidden="true" />
          {t('eyebrow')}
        </span>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {/* Honeypot — visually hidden, off-screen, not announced to AT */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
          {...register('website')}
        />

        <TextField
          name="email"
          label={t('fields.email')}
          type="email"
          required
          autoComplete="email"
          placeholder={t('placeholders.email')}
          register={register}
          error={errors.email}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label={t('fields.name')}
            autoComplete="name"
            register={register}
            error={errors.name}
          />
          <TextField
            name="phone"
            label={t('fields.phone')}
            type="tel"
            autoComplete="tel"
            placeholder={t('placeholders.phone')}
            register={register}
            error={errors.phone}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="carNumber"
            label={t('fields.carNumber')}
            register={register}
            error={errors.carNumber}
          />
          <TextField
            name="driverName"
            label={t('fields.driverName')}
            register={register}
            error={errors.driverName}
          />
        </div>

        <TextField
          name="incidentDateTime"
          label={t('fields.incidentDateTime')}
          type="datetime-local"
          required
          register={register}
          error={errors.incidentDateTime}
        />

        <TextField
          name="incidentLocation"
          label={t('fields.incidentLocation')}
          required
          register={register}
          error={errors.incidentLocation}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="pickupLocation"
            label={t('fields.pickupLocation')}
            register={register}
            error={errors.pickupLocation}
          />
          <TextField
            name="dropoffLocation"
            label={t('fields.dropoffLocation')}
            register={register}
            error={errors.dropoffLocation}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback-description" className="text-sm font-medium text-foreground">
            {t('fields.description')}
            <span className="text-destructive"> *</span>
          </label>
          <textarea
            id="feedback-description"
            rows={6}
            maxLength={FEEDBACK_DESCRIPTION_MAX}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={
              errors.description ? 'feedback-description-error' : 'feedback-description-count'
            }
            placeholder={t('placeholders.description')}
            className={cn(inputClass, 'resize-y')}
            {...register('description')}
          />
          <div className="flex items-center justify-between gap-2">
            {errors.description?.message ? (
              <p id="feedback-description-error" role="alert" className="text-sm text-destructive">
                {errors.description.message}
              </p>
            ) : (
              <span aria-hidden="true" />
            )}
            <span
              id="feedback-description-count"
              className="text-ltr shrink-0 font-mono text-xs text-muted-foreground"
            >
              {descriptionLength}/{FEEDBACK_DESCRIPTION_MAX}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <CheckboxField name="requestRefund" label={t('fields.requestRefund')} register={register} />
          <CheckboxField
            name="notifyAuthorities"
            label={t('fields.notifyAuthorities')}
            register={register}
          />
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('error.generic')}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          {mutation.isPending ? t('submitting') : t('submit')}
        </button>
      </form>
    </main>
  );
}
