'use client';

import { create } from 'zustand';
import type { Currency, VehicleType, GuestDetailsInput } from '@/lib/types';
import { DEFAULT_CURRENCY } from '@/lib/types';

export type BookingStep = 'quote' | 'details' | 'payment';

export interface DraftPoint {
  lat: number;
  lng: number;
  address: string;
}

interface BookingDraftState {
  step: BookingStep;
  pickup: DraftPoint | null;
  dropoff: DraftPoint | null;
  /** Intermediate stop, display-only (the combo's Blue Lagoon). */
  via?: DraftPoint;
  pickupAirportCode?: string;
  /** Price this trip as the pre-agreed combo (forwarded to the quote request). */
  combo: boolean;
  vehicleTypeRequested: VehicleType;
  passengerCount: number;
  scheduledTime: string; // ISO string — react-friendly
  displayCurrency: Currency;
  flightNumber?: string;
  guest?: GuestDetailsInput;

  setStep(step: BookingStep): void;
  setRoute(
    pickup: DraftPoint,
    dropoff: DraftPoint,
    opts?: { pickupAirportCode?: string; via?: DraftPoint; combo?: boolean },
  ): void;
  setVehicleType(v: VehicleType): void;
  setPassengerCount(n: number): void;
  setScheduledTime(iso: string): void;
  setCurrency(c: Currency): void;
  setFlightNumber(f?: string): void;
  setGuest(g: GuestDetailsInput): void;
  reset(): void;
}

const initial = {
  step: 'quote' as BookingStep,
  pickup: null,
  dropoff: null,
  via: undefined,
  pickupAirportCode: undefined,
  combo: false,
  vehicleTypeRequested: 'SEDAN' as VehicleType,
  passengerCount: 1,
  scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  displayCurrency: DEFAULT_CURRENCY,
  flightNumber: undefined,
  guest: undefined,
};

/**
 * In-progress booking draft. Lives only in memory — we do NOT persist it
 * because abandoned drafts on a shared device shouldn't survive a page
 * refresh. The Booking row itself becomes the source of truth once the
 * payment step posts to /api/bookings.
 */
export const useBookingDraft = create<BookingDraftState>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setRoute: (pickup, dropoff, opts) =>
    set({
      pickup,
      dropoff,
      via: opts?.via,
      pickupAirportCode: opts?.pickupAirportCode,
      combo: opts?.combo ?? false,
    }),
  setVehicleType: (vehicleTypeRequested) => set({ vehicleTypeRequested }),
  setPassengerCount: (passengerCount) => set({ passengerCount }),
  setScheduledTime: (scheduledTime) => set({ scheduledTime }),
  setCurrency: (displayCurrency) => set({ displayCurrency }),
  setFlightNumber: (flightNumber) => set({ flightNumber }),
  setGuest: (guest) => set({ guest }),
  reset: () => set({ ...initial, scheduledTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() }),
}));
