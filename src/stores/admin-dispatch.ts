'use client';

import { create } from 'zustand';

export interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  isOnline: boolean;
}

interface AdminDispatchState {
  locations: Record<string, DriverLocation>;
  upsertLocation: (loc: DriverLocation) => void;
  clearLocations: () => void;
  selectedBookingId: string | null;
  setSelectedBooking: (id: string | null) => void;
}

/**
 * Ephemeral dispatcher UI state fed by the realtime WS channels (driver
 * positions) + map selection. NOT persisted and NOT in TanStack Query — live
 * location is realtime-owned (CLAUDE.md: "Driver location: Realtime via WebSocket
 * — no TanStack Query").
 */
export const useAdminDispatch = create<AdminDispatchState>((set) => ({
  locations: {},
  upsertLocation: (loc) =>
    set((s) => ({ locations: { ...s.locations, [loc.driverId]: loc } })),
  clearLocations: () => set({ locations: {} }),
  selectedBookingId: null,
  setSelectedBooking: (selectedBookingId) => set({ selectedBookingId }),
}));
