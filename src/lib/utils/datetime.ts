/**
 * Format an ISO date string into the value an `<input type="datetime-local">`
 * expects (`YYYY-MM-DDTHH:mm`, in the user's local timezone). Used by both
 * the booking wizard's Quote step and the landing-page hero search widget.
 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
