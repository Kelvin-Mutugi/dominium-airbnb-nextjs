export interface DateRange {
  start: string;
  end: string;
}

export function activeBookingFilter(now = new Date().toISOString()): string {
  return `status.eq.confirmed,and(status.eq.pending,hold_expires_at.gt.${now})`;
}

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getStayNights(checkIn: string, checkOut: string): number {
  if (!isISODate(checkIn) || !isISODate(checkOut) || checkOut <= checkIn) return 0;
  return Math.round(
    (Date.parse(`${checkOut}T00:00:00.000Z`) - Date.parse(`${checkIn}T00:00:00.000Z`)) /
      86_400_000,
  );
}

export function rangesOverlap(
  first: DateRange,
  second: DateRange,
): boolean {
  return first.start < second.end && first.end > second.start;
}

export function isStayAvailable(
  checkIn: string,
  checkOut: string,
  unavailableRanges: DateRange[],
): boolean {
  if (getStayNights(checkIn, checkOut) < 1) return false;
  const requested = { start: checkIn, end: checkOut };
  return !unavailableRanges.some((range) => rangesOverlap(requested, range));
}