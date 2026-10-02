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

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE, {
    ...DATE_STYLES.long,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(date);
}

export function dayOfMonth(value: string) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', timeZone: TZ }).format(new Date(value));
}

/** Today as YYYY-MM-DD in Nairobi time, to compare against `date` columns. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

function checkoutMinutes(value: string | null | undefined) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

export function formatCheckoutTime(value: string | null | undefined) {
  const totalMinutes = checkoutMinutes(value) ?? 11 * 60;
  const hours24 = Math.floor(totalMinutes / 60);
  const hours12 = hours24 % 12 || 12;
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours12}:${minutes} ${hours24 >= 12 ? 'PM' : 'AM'}`;
}

export function isCheckoutTimeReached(
  checkOutDate: string,
  checkOutTime: string | null | undefined,
  now = new Date(),
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOutDate)) return false;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = `${values.year}-${values.month}-${values.day}`;
  if (localDate !== checkOutDate) return localDate > checkOutDate;

  const localMinutes = Number(values.hour) * 60 + Number(values.minute);
  return localMinutes >= (checkoutMinutes(checkOutTime) ?? 11 * 60);
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