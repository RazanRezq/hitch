/**
 * ISK is the source of truth for all pricing (see CLAUDE.md "Currency &
 * Number Formatting"). Display currency is derived from the ISK amount via
 * the locked exchange rate.
 *
 * These static rates are for the marketing landing's showcase prices only —
 * live bookings lock a real rate from the `ExchangeRate` table at creation
 * time. Keep the union in sync with `CURRENCIES` in `@hitch/types`.
 */
export type DisplayCurrency = 'ISK' | 'EUR' | 'USD';

export const ISK_DISPLAY_RATES: Record<DisplayCurrency, number> = {
  ISK: 1,
  EUR: 0.0066,
  USD: 0.0071,
};

/** Convert an ISK amount to its display-currency value at the showcase rate. */
export function fromISK(amountISK: number, currency: DisplayCurrency): number {
  return amountISK * ISK_DISPLAY_RATES[currency];
}
