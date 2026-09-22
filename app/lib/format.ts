// FILE LOCATION: lib/format.ts
// Put this file at lib/format.ts in your project root (or src/lib/format.ts if your project has a src/ folder).

const TZ = 'Africa/Nairobi';
const LOCALE = 'en-GB';

export type DateStyle = 'short' | 'noYear' | 'long' | 'monthYear';

const DATE_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
  noYear: { weekday: 'short', day: 'numeric', month: 'short' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  monthYear: { month: 'long', year: 'numeric' },
};

export function formatDate(value: string | Date | null | undefined, style: DateStyle = 'short') {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { ...DATE_STYLES[style], timeZone: TZ }).format(date);
}

export function dayOfMonth(value: string) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', timeZone: TZ }).format(new Date(value));
}

/** Today as YYYY-MM-DD in Nairobi time, to compare against `date` columns. */
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000));
}

export function daysUntil(dateISO: string) {
  return Math.round((Date.parse(dateISO) - Date.parse(todayISO())) / 86_400_000);
}

export function formatMoney(amount: number | string, currency = 'KES') {
  const n = Number(amount);
  try {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString('en-KE')}`;
  }
}

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function humanize(value: string | null | undefined) {
  if (!value) return '';
  const text = value.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Returns +254XXXXXXXXX for Kenyan numbers, E.164 for other international numbers, else null. */
export function normalizePhone(input: string) {
  const digits = input.replace(/[\s\-().]/g, '');
  if (/^\+254[17]\d{8}$/.test(digits)) return digits;
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  return null;
}

export function isPaidStatus(status: string) {
  return status === 'paid' || status === 'success';
}

export function coverImage(images?: { url: string; sort_order: number }[] | null) {
  if (!images?.length) return null;
  return [...images].sort((a, b) => a.sort_order - b.sort_order)[0].url;
}