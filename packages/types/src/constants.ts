/**
 * Centralized constants — mirror Prisma enums for FE use without importing
 * Prisma runtime. Keep in sync with prisma/schema.prisma.
 */

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  DISPATCHER: 'DISPATCHER',
  DRIVER: 'DRIVER',
  PASSENGER: 'PASSENGER',
} as const;
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const BOOKING_STATUSES = {
  DRAFT: 'DRAFT',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  SEARCHING: 'SEARCHING',
  ACCEPTED: 'ACCEPTED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED_BY_PASSENGER: 'CANCELLED_BY_PASSENGER',
  CANCELLED_BY_DRIVER: 'CANCELLED_BY_DRIVER',
  CANCELLED_BY_SYSTEM: 'CANCELLED_BY_SYSTEM',
  NO_SHOW: 'NO_SHOW',
  DISPUTED: 'DISPUTED',
} as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[keyof typeof BOOKING_STATUSES];

export const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.SEARCHING,
  BOOKING_STATUSES.ACCEPTED,
  BOOKING_STATUSES.DRIVER_ARRIVING,
  BOOKING_STATUSES.DRIVER_ARRIVED,
  BOOKING_STATUSES.IN_TRANSIT,
] as const;

export const TERMINAL_BOOKING_STATUSES = [
  BOOKING_STATUSES.COMPLETED,
  BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
  BOOKING_STATUSES.CANCELLED_BY_DRIVER,
  BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
  BOOKING_STATUSES.NO_SHOW,
  BOOKING_STATUSES.DISPUTED,
] as const;

export const VEHICLE_TYPES = {
  SEDAN: 'SEDAN',
  SUV: 'SUV',
  VAN: 'VAN',
} as const;
export type VehicleType = (typeof VEHICLE_TYPES)[keyof typeof VEHICLE_TYPES];

export const LOCALES = ['is', 'en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'is';
export const RTL_LOCALES = ['ar'] as const;
export type RtlLocale = (typeof RTL_LOCALES)[number];

export function isRtl(locale: Locale): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export const CURRENCIES = ['ISK', 'EUR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'ISK';

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  ISK: 0,
  EUR: 2,
  USD: 2,
};

export const PAYMENT_STATUSES = {
  REQUIRES_PAYMENT_METHOD: 'REQUIRES_PAYMENT_METHOD',
  REQUIRES_CONFIRMATION: 'REQUIRES_CONFIRMATION',
  REQUIRES_CAPTURE: 'REQUIRES_CAPTURE',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  CANCELED: 'CANCELED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
