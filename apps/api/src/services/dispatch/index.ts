/** Dispatch service — runs in BullMQ worker, never inline. See HITCH_MASTER_PLAN.md §10. */
export async function offerRide(_bookingId: string): Promise<void> {
  // Placeholder — implementation in dispatch.worker.ts
}
