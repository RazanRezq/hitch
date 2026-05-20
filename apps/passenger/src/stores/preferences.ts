'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CURRENCIES, DEFAULT_CURRENCY, type Currency } from '@hitch/i18n';

interface PreferencesState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

/**
 * Client UI state only (CLAUDE.md: currency preference → Zustand). Persisted
 * to localStorage so a returning guest keeps their display currency. Language
 * is NOT stored here — it lives in the URL via next-intl locale routing.
 */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'hitch-preferences',
      partialize: (state) => ({ currency: state.currency }),
      merge: (persisted, current) => {
        const next = { ...current, ...(persisted as Partial<PreferencesState>) };
        // Guard against a stale/garbage persisted value.
        if (!CURRENCIES.includes(next.currency)) next.currency = DEFAULT_CURRENCY;
        return next;
      },
    },
  ),
);
