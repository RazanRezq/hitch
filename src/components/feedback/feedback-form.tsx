'use client';

import { useMemo } from 'react';
import { useForm, useWatch, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader2, Phone, Send, ShieldCheck } from 'lucide-react';
import {
  createFeedbackSchema,
  FEEDBACK_DESCRIPTION_MAX,
  type FeedbackSubmitInput,
  type FeedbackSubmitValues,
  type Locale,
} from '@/lib/types';
import { useSubmitFeedback } from '@/lib/api-client/hooks/useSubmitFeedback';
import { cn } from '@/lib/ui';
import { EvidenceUploader } from './evidence-uploader';

// Form shape is the schema's input type so the resolver lines up exactly.
type FormValues = FeedbackSubmitInput;

const DEFAULT_VALUES: FormValues = {
  name: '',
  phone: '',
  email: '',
  bookingReference: '',
  carNumber: '',
  driverName: '',
  incidentLocation: '',
  pickupLocation: '',
  dropoffLocation: '',
  incidentDateTime: '',
  description: '',
  requestRefund: false,
  notifyAuthorities: false,
  attachments: [],
  consent: false,
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
  // Reuse the centralized phone number from the header namespace (single source).
  const phone = useTranslations('landing.header')('phone');
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
        consentRequired: t('validation.consentRequired'),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
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

  // Success — an aurora "resolved" moment echoing the report band and the
  // CareBand the passenger came from. Uses the client copy shared with the
  // auto-reply email.
  if (mutation.isSuccess) {
    const body = t('autoReply.body');
    const [heading, ...rest] = body.split('\n').filter(Boolean);
    const reference = mutation.data?.reference;
    return (
      <main className="ed-incident-done">
        <div className="ed-incident-done-inner">
          <div className="ed-incident-aurora" aria-hidden="true" />
          <div className="ed-incident-done-ring">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>
          <div aria-live="polite" className="flex flex-col gap-3">
            <h1 className="ed-incident-done-title">{heading}</h1>
            {rest.map((line, i) => (
              <p key={i} className="ed-incident-done-body">
                {line}
              </p>
            ))}
          </div>
          {reference && (
            <div className="ed-incident-done-ref">
              <span className="ed-incident-done-ref-label">{t('referenceLabel')}</span>
              <span className="text-ltr ed-incident-done-ref-value">{reference}</span>
            </div>
          )}
          <Link href={`/${locale}`} className="ed-incident-done-btn">
            {t('backHome')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="ed-incident">
      {/* Reassurance band — the one creative/decorative moment on this page */}
      <section className="ed-incident-hero">
        <div className="ed-incident-aurora" aria-hidden="true" />
        <div className="ed-incident-hero-inner">
          <span className="t-mono ed-incident-eyebrow">
            <ShieldCheck size={14} aria-hidden="true" />
            {t('eyebrow')}
          </span>
          <h1 className="ed-incident-title">{t('title')}</h1>
          <p className="ed-incident-sub">{t('subtitle')}</p>
          <div className="ed-incident-meta">
            <span className="ed-incident-meta-item">
              <ShieldCheck size={14} aria-hidden="true" />
              {t('reassure')}
            </span>
            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="ed-incident-meta-item ed-incident-meta-link"
              aria-label={`${t('help')} ${phone}`}
            >
              <Phone size={14} aria-hidden="true" />
              <span className="text-ltr t-mono">{phone}</span>
            </a>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} noValidate className="ed-incident-card">
        {/* Honeypot — visually hidden, off-screen, not announced to AT */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
          {...register('website')}
        />

        {/* Safety first: real emergencies belong with 112, not a web form. */}
        <p role="note" className="ed-incident-emergency">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{t('emergency')}</span>
        </p>

        <fieldset className="ed-incident-group">
          <legend className="ed-incident-legend">{t('groups.contact')}</legend>
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
        </fieldset>

        <fieldset className="ed-incident-group">
          <legend className="ed-incident-legend">{t('groups.ride')}</legend>
          <TextField
            name="bookingReference"
            label={t('fields.bookingReference')}
            placeholder={t('placeholders.bookingReference')}
            register={register}
            error={errors.bookingReference}
          />
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
        </fieldset>

        <fieldset className="ed-incident-group">
          <legend className="ed-incident-legend">{t('groups.what')}</legend>
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

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">{t('evidence.label')}</span>
            <EvidenceUploader
              onChange={(keys) =>
                setValue('attachments', keys, { shouldValidate: false, shouldDirty: true })
              }
            />
          </div>
        </fieldset>

        <fieldset className="ed-incident-group">
          <legend className="ed-incident-legend">{t('groups.requests')}</legend>
          <CheckboxField
            name="requestRefund"
            label={t('fields.requestRefund')}
            register={register}
          />
          <CheckboxField
            name="notifyAuthorities"
            label={t('fields.notifyAuthorities')}
            register={register}
          />
        </fieldset>

        {/* GDPR: explicit, required consent before the report can be sent. */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="feedback-consent"
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <input
              id="feedback-consent"
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 rounded accent-primary"
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? 'feedback-consent-error' : undefined}
              {...register('consent')}
            />
            <span className="text-sm text-foreground">
              {t('consent')}
              <span className="text-destructive"> *</span>
            </span>
          </label>
          {errors.consent?.message && (
            <p id="feedback-consent-error" role="alert" className="text-sm text-destructive">
              {errors.consent.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('error.generic')}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
