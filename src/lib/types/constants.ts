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

/**
 * Largest group the fare tiers cover (top of the 9-16 minibus tier). A request
 * for more than this has no single tier/vehicle that fits, so the pricing engine
 * returns the manual-quote signal rather than a price — and the quote API lets it
 * through (no schema cap) instead of rejecting it with a 400. Shared by the
 * request schema (lib/types/schemas) and the engine (server pricing) so the
 * boundary stays in one place.
 */
export const MAX_AUTO_PRICED_PASSENGERS = 16;

export const LOCALES = ['is', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'is';
// RTL plumbing is retained (logical properties, DirectionProvider) even though
// no RTL locale currently ships — keep this in sync if one is added back.
export const RTL_LOCALES = [] as const;
export type RtlLocale = (typeof RTL_LOCALES)[number];

export function isRtl(locale: Locale): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

// Every Hitch ride happens in Iceland, which is UTC+0 year-round (no DST).
// Naive wall-clock inputs (e.g. an incident's datetime-local) are anchored to
// this zone so the stored UTC instant reflects the real Iceland local time,
// regardless of the submitter's browser timezone.
export const APP_TIMEZONE = 'Atlantic/Reykjavik' as const;

export const CURRENCIES = ['ISK', 'EUR', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = 'ISK';

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  ISK: 0,
  EUR: 2,
  USD: 2,
};

/**
 * Sightseeing tour catalog IDs (see hitch-docs/Tours.pdf). Single source of
 * truth shared by the pricing config (price table keys) and the API schema
 * (request enum). Airport / Blue-Lagoon tour-sheet entries are intentionally
 * absent — those transfers are priced by FIXED_FARES, not as tours.
 */
export const TOUR_IDS = [
  'golden-circle',
  'south-coast',
  'silver-circle',
  'snaefellsnes',
  'reykjanes',
  'reykjavik-sightseeing-2h',
  'city-center',
  'hvammsvik-one-way',
  'hvammsvik-return-4h',
] as const;
export type TourId = (typeof TOUR_IDS)[number];

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

/**
 * Realtime channel names — shared FE (subscribe) / BE (publish) so the two
 * never drift. Mirrors the channel table in CLAUDE.md "REALTIME ARCHITECTURE".
 */
export const WS_CHANNELS = {
  booking: (bookingId: string) => `booking:${bookingId}`,
  driverJobs: (driverId: string) => `driver:${driverId}:jobs`,
  dispatchGlobal: 'dispatch:global',
  driverLocations: 'driver-locations',
  userNotifications: (userId: string) => `user:${userId}:notifications`,
} as const;
