import { formatReceiptNumber, type Receipt } from '@/lib/types';

/**
 * Wire shapes for a receipt, shared by the admin list/detail routes and the
 * public receipt endpoint so all three never drift. `number` is rendered to its
 * R00001 display form; `issuedById` is intentionally omitted (internal only).
 */
export function serializeReceiptListItem(r: Receipt) {
  return {
    id: r.id,
    number: formatReceiptNumber(r.number),
    source: r.source,
    bookingId: r.bookingId,
    issuedFor: r.issuedFor,
    pickupAddress: r.pickupAddress,
    dropoffAddress: r.dropoffAddress,
    driverName: r.driverName,
    totalAmount: r.totalAmount,
    currency: r.currency,
    amountISK: r.amountISK,
    createdAt: r.createdAt,
  };
}

/** Full snapshot for the printable receipt view (admin + public). */
export function serializeReceiptDetail(r: Receipt) {
  return {
    ...serializeReceiptListItem(r),
    vehiclePlate: r.vehiclePlate,
    cabNumber: r.cabNumber,
    fareAmount: r.fareAmount,
    tipAmount: r.tipAmount,
    notes: r.notes,
  };
}
