import type { BookingStatus, VehicleType, Currency, UserRole } from '@/lib/types';

/** Mirror of the server-side ListEnvelope (src/server/lib/list.ts). */
export interface ListEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminBookingListItem {
  id: string;
  status: BookingStatus;
  scheduledTime: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAirportCode: string | null;
  flightNumber: string | null;
  passengerCount: number;
  vehicleTypeRequested: VehicleType;
  basePriceISK: number;
  displayCurrency: Currency;
  displayPrice: number;
  passenger: { id: string; name: string | null; email: string } | null;
  driver: { id: string; name: string | null } | null;
}

export interface BookingEventItem {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  actor: { id: string; name: string | null; role: UserRole } | null;
}

export interface PaymentItem {
  id: string;
  status: string;
  amount: number;
  currency: Currency;
  amountISK: number;
  capturedAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

export interface AdminBookingDetail {
  id: string;
  status: BookingStatus;
  scheduledTime: string;
  createdAt: string;
  updatedAt: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  pickupAirportCode: string | null;
  flightNumber: string | null;
  vehicleTypeRequested: VehicleType;
  passengerCount: number;
  estimatedDistanceKm: number | null;
  basePriceISK: number;
  displayCurrency: Currency;
  displayPrice: number;
  exchangeRate: number;
  cancellationReason: string | null;
  passenger: { id: string; name: string | null; email: string; phone: string | null } | null;
  driver: { id: string; name: string | null; phone: string | null } | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    color: string;
    licensePlate: string;
    vehicleType: VehicleType;
  } | null;
  payments: PaymentItem[];
  events: BookingEventItem[];
}

export interface DriverLocationDto {
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: string;
}

export interface AdminDriverListItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isOnline: boolean;
  location: DriverLocationDto | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
    vehicleType: VehicleType;
  } | null;
  rating: { avg: number | null; count: number };
  activeTrips: number;
}

export interface DriverDocumentDto {
  id: string;
  type: string;
  expiresAt: string | null;
  verifiedAt: string | null;
  verifiedById: string | null;
  createdAt: string;
  signedUrl: string;
}

export interface AdminDriverDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isOnline: boolean;
  location: DriverLocationDto | null;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
    vehicleType: VehicleType;
    capacity: number;
    isActive: boolean;
    photos: string[];
  }>;
  documents: DriverDocumentDto[];
  ratings: Array<{
    id: string;
    score: number;
    comment: string | null;
    createdAt: string;
    rater: { id: string; name: string | null } | null;
  }>;
  rating: { avg: number | null; count: number };
  recentBookings: Array<{
    id: string;
    status: BookingStatus;
    scheduledTime: string;
    pickupAddress: string;
    dropoffAddress: string;
    basePriceISK: number;
    displayCurrency: Currency;
    displayPrice: number;
  }>;
}

export interface AdminVehicleListItem {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vehicleType: VehicleType;
  capacity: number;
  isActive: boolean;
  driver: { id: string; name: string | null };
}

export interface AdminStats {
  bookingsToday: number;
  activeTrips: number;
  onlineDrivers: number;
  completedToday: number;
  revenueISKToday: number;
  revenueISK7d: number;
  completionRate7d: number | null;
}
