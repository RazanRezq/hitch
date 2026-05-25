'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/ui';
import type { BookingStep } from '@/stores/booking-draft';

const STEPS: BookingStep[] = ['quote', 'details', 'payment'];

export function StepProgress({ current }: { current: BookingStep }) {
  const t = useTranslations('book.steps');
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className="flex items-center gap-2 text-xs uppercase tracking-wider" role="list">
      {STEPS.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isDone && 'border-primary/30 bg-primary/10 text-primary',
                !isCurrent && !isDone && 'border-border text-muted-foreground',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                'hidden sm:inline',
                isCurrent ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {t(step)}
            </span>
            {i < STEPS.length - 1 && (
              <span className="bg-border ms-1 hidden h-px w-8 sm:inline-block" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
