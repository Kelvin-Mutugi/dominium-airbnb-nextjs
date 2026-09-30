import {
  calculateListingAdditionalCharges,
  normalizeListingAdditionalCharges,
} from "@/app/lib/listing-charges";

export interface BookingPriceInput {
  nightlyRate: number | string;
  platformFeePerNight?: number | string | null;
  additionalCharges?: unknown;
  nights: number;
}

export interface BookingPrice {
  nights: number;
  nightlyRate: number;
  subtotal: number;
  serviceFee: number;
  additionalFees: number;
  additionalChargeLines: ReturnType<typeof calculateListingAdditionalCharges>["lines"];
  total: number;
  hostPayout: number;
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function calculateBookingPrice(input: BookingPriceInput): BookingPrice {
  const nights = Number.isFinite(input.nights)
    ? Math.max(0, Math.trunc(input.nights))
    : 0;
  const nightlyRate = amount(input.nightlyRate);
  const subtotal = money(nightlyRate * nights);
  const serviceFee = money(amount(input.platformFeePerNight) * nights);
  const charges = calculateListingAdditionalCharges(
    normalizeListingAdditionalCharges(input.additionalCharges),
    nights,
  );
  const additionalFees = money(charges.total);

  return {
    nights,
    nightlyRate,
    subtotal,
    serviceFee,
    additionalFees,
    additionalChargeLines: charges.lines,
    total: money(subtotal + serviceFee + additionalFees),
    hostPayout: money(subtotal + additionalFees),
  };
}