import type { Currency } from '@/lib/types';

/**
 * Pluggable exchange-rate source. The exchange-rate worker calls a provider
 * once a day and persists the result to the ExchangeRate table; `getLatestRate`
 * (./index.ts) then reads the most recent row. Keeping the network/parsing
 * detail behind this interface means the key or provider can be swapped via env
 * without touching the worker or pricing.
 *
 * Rates are expressed as ISK→target (multiply an ISK amount by the rate to get
 * the target-currency amount) — the same convention as ExchangeRate.rate.
 */
export interface RatesProvider {
  fetchRates(targets: Currency[]): Promise<Partial<Record<Currency, number>>>;
}

export class RatesProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatesProviderError';
  }
}

const DEFAULT_BASE_URL = 'https://api.exchangerate.host/live';

export interface ExchangerateHostOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface ExchangerateHostResponse {
  success?: boolean;
  error?: { info?: string };
  quotes?: Record<string, number>;
}

/**
 * Default provider: exchangerate.host. Reads the access key from
 * EXCHANGE_RATE_API_KEY and the (overridable) endpoint from
 * EXCHANGE_RATE_API_URL. Returns ISK→{EUR,USD,...} from the `quotes` map, whose
 * keys are `ISKEUR`, `ISKUSD`, etc.
 */
export function exchangerateHostProvider(
  options: ExchangerateHostOptions = {},
): RatesProvider {
  const apiKey = options.apiKey ?? process.env.EXCHANGE_RATE_API_KEY;
  const baseUrl =
    options.baseUrl ?? process.env.EXCHANGE_RATE_API_URL ?? DEFAULT_BASE_URL;
  const doFetch = options.fetchImpl ?? fetch;

  return {
    async fetchRates(targets) {
      if (!apiKey) throw new RatesProviderError('EXCHANGE_RATE_API_KEY is not set');
      if (targets.length === 0) return {};

      const url = new URL(baseUrl);
      url.searchParams.set('access_key', apiKey);
      url.searchParams.set('source', 'ISK');
      url.searchParams.set('currencies', targets.join(','));

      const res = await doFetch(url.toString());
      if (!res.ok) throw new RatesProviderError(`HTTP ${res.status}`);

      const data = (await res.json()) as ExchangerateHostResponse;
      if (data.success === false) {
        throw new RatesProviderError(data.error?.info ?? 'provider returned success=false');
      }

      const quotes = data.quotes ?? {};
      const out: Partial<Record<Currency, number>> = {};
      for (const target of targets) {
        const value = quotes[`ISK${target}`];
        if (typeof value === 'number' && value > 0) out[target] = value;
      }
      return out;
    },
  };
}

/** The provider the worker uses. Swap here (or via env) to change source. */
export function getRatesProvider(): RatesProvider {
  return exchangerateHostProvider();
}
