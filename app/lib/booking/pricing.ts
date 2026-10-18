import {
  calculateListingAdditionalCharges,
  normalizeListingAdditionalCharges,
} from "@/app/lib/listing-charges";

export interface BookingPriceInput {
  nightlyRate: number | string;
  platformFeePerNight?: number | string | null;
  additionalCharges?: unknown;
  nights: number;
  selectedExtras?: Iterable<string>;
}

export interface BookingPrice {
  nights: number;
  nightlyRate: number;
  hostSubtotal: number;
  subtotal: number;
  serviceFee: number;
  additionalFees: number;
  roundingAdjustment: number;
  additionalChargeLines: ReturnType<
    typeof calculateListingAdditionalCharges
  >["lines"];
  total: number;
  hostPayout: number;
  financialSnapshot?: BookingFinancialSnapshot;
}

export interface GuestPriceSnapshot {
  line_items: Array<Record<string, unknown> & { name: string; total: number }>;
  totals: Record<string, unknown> & { guest_nightly_subtotal?: number };
}

export interface BookingFinancialSnapshot {
  guest_total: number;
  host_earnings: number;
  platform_markup: number;
  discount_total: number;
  payment_processing_fee: number;
  tax_total: number;
  amount_refunded: number;
  host_amount_payable: number;
  actual_host_paid: number;
}

export function createBookingFinancialSnapshot({
  guestTotal,
  hostEarnings,
  platformMarkup,
  discountTotal = 0,
  paymentProcessingFee = 0,
  taxTotal = 0,
  amountRefunded = 0,
  hostAmountPayable = 0,
  actualHostPaid = 0,
}: {
  guestTotal: number | string;
  hostEarnings: number | string;
  platformMarkup: number | string;
  discountTotal?: number | string;
  paymentProcessingFee?: number | string;
  taxTotal?: number | string;
  amountRefunded?: number | string;
  hostAmountPayable?: number | string;
  actualHostPaid?: number | string;
}): BookingFinancialSnapshot {
  return {
    guest_total: money(Number(guestTotal ?? 0)),
    host_earnings: money(Number(hostEarnings ?? 0)),
    platform_markup: money(Number(platformMarkup ?? 0)),
    discount_total: money(Number(discountTotal ?? 0)),
    payment_processing_fee: money(Number(paymentProcessingFee ?? 0)),
    tax_total: money(Number(taxTotal ?? 0)),
    amount_refunded: money(Number(amountRefunded ?? 0)),
    host_amount_payable: money(Number(hostAmountPayable ?? 0)),
    actual_host_paid: money(Number(actualHostPaid ?? 0)),
  };
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function amount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function normalizeGuestPriceSnapshot(
  value: unknown,
): GuestPriceSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { line_items: [], totals: {} };
  }

  const snapshot = value as Record<string, unknown>;
  const rawTotals =
    snapshot.totals &&
    typeof snapshot.totals === "object" &&
    !Array.isArray(snapshot.totals)
      ? (snapshot.totals as Record<string, unknown>)
      : {};
  const rawLines = Array.isArray(snapshot.line_items)
    ? snapshot.line_items.filter(
        (line): line is Record<string, unknown> =>
          Boolean(line) && typeof line === "object" && !Array.isArray(line),
      )
    : [];
  const markupLineTotal = rawLines
    .filter((line) => line.type === "platform_markup")
    .reduce(
      (sum, line) => sum + amount(line.total as number | string | undefined),
      0,
    );
  const markupTotal =
    amount(rawTotals.platform_markup as number | string | undefined) ||
    markupLineTotal;
  const nightlyLines = rawLines.filter((line) => line.type === "nightly_rate");
  const hostLines = rawLines.filter(
    (line) => line.type !== "platform_markup" && line.type !== "nightly_rate",
  );
  const nights = Math.max(0, Math.trunc(Number(snapshot.nights ?? 0)));
  const oldNightlyTotal = nightlyLines.reduce(
    (sum, line) => sum + amount(line.total as number | string | undefined),
    0,
  );
  const guestNightlySubtotal =
    rawTotals.guest_nightly_subtotal == null
      ? money(oldNightlyTotal + markupTotal)
      : amount(rawTotals.guest_nightly_subtotal as number | string);

  const normalizedNightLine = nightlyLines.length
    ? [
        {
          ...nightlyLines[0],
          type: "nightly_rate",
          name: "Nightly rate",
          unit_amount: nights > 0 ? money(guestNightlySubtotal / nights) : 0,
          quantity: nights,
          total: guestNightlySubtotal,
        },
      ]
    : [];

  const line_items = [
    ...normalizedNightLine,
    ...hostLines.map((line) => ({
      ...line,
      name: typeof line.name === "string" ? line.name : "Host charge",
      total:
        line.type === "rounding_adjustment"
          ? Number(line.total ?? 0)
          : amount(line.total as number | string | undefined),
    })),
  ];

  const guestTotals = { ...rawTotals };
  delete guestTotals.platform_markup;
  delete guestTotals.host_subtotal;
  delete guestTotals.host_gross;
  delete guestTotals.subtotal;

  return {
    line_items,
    totals: { ...guestTotals, guest_nightly_subtotal: guestNightlySubtotal },
  };
}

export function calculateBookingPrice(input: BookingPriceInput): BookingPrice {
  const nights = Number.isFinite(input.nights)
    ? Math.max(0, Math.trunc(input.nights))
    : 0;
  const hostNightlyRate = amount(input.nightlyRate);
  const platformMarkupPerNight = amount(input.platformFeePerNight);
  const nightlyRate = money(hostNightlyRate + platformMarkupPerNight);
  const hostSubtotal = money(hostNightlyRate * nights);
  const subtotal = money(nightlyRate * nights);
  const serviceFee = money(platformMarkupPerNight * nights);
  const charges = calculateListingAdditionalCharges(
    normalizeListingAdditionalCharges(input.additionalCharges),
    nights,
    input.selectedExtras,
  );
  const additionalFees = money(charges.total);
  const unroundedTotal = money(subtotal + additionalFees);
  const total = Math.round(unroundedTotal);
  const hostPayout = money(hostSubtotal + additionalFees);

  return {
    nights,
    nightlyRate,
    hostSubtotal,
    subtotal,
    serviceFee,
    additionalFees,
    roundingAdjustment: money(total - unroundedTotal),
    additionalChargeLines: charges.lines,
    total,
    hostPayout,
    financialSnapshot: createBookingFinancialSnapshot({
      guestTotal: total,
      hostEarnings: hostSubtotal,
      platformMarkup: serviceFee,
      paymentProcessingFee: 0,
      hostAmountPayable: hostPayout,
      actualHostPaid: 0,
    }),
  };
}
