import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

const DEFAULT_COUNTRY: CountryCode = 'IS';

export function formatPhoneNumber(input: string, country: CountryCode = DEFAULT_COUNTRY): string {
  const parsed = parsePhoneNumberFromString(input, country);
  if (!parsed) return input;
  return parsed.formatInternational();
}

export function isValidPhoneNumber(input: string, country: CountryCode = DEFAULT_COUNTRY): boolean {
  const parsed = parsePhoneNumberFromString(input, country);
  return parsed?.isValid() ?? false;
}

export function normalizePhoneNumber(
  input: string,
  country: CountryCode = DEFAULT_COUNTRY,
): string | null {
  const parsed = parsePhoneNumberFromString(input, country);
  if (!parsed?.isValid()) return null;
  return parsed.number; // E.164
}
