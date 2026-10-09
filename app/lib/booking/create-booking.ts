import "server-only";

import { calculateBookingPrice } from "@/app/lib/booking/pricing";
import { getStayNights, isISODate } from "@/app/lib/booking/availability";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

type BookingPaymentMethod = "mpesa";

export interface CreateBookingInput {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  children: number;
  pets: number;
  fullName: string;
  email: string;
  phone: string;
  country?: string;
  specialRequests?: string;
  selectedExtras?: string[];
  agreedToTerms: boolean;
  paymentMethod: BookingPaymentMethod;
  idempotencyKey: string;
  guestId: string;
  accountEmail: string;
}

export class BookingRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d][\d\s()-]{6,19}$/;

interface ListingForBooking {
  id: string;
  host_id: string;
  title: string;
  price_per_night: number | string;
  platform_fee_per_night: number | string | null;
  additional_charges: unknown;
  max_guests: number;
  min_nights: number | null;
  status: string;
}

interface CreatedBookingRow {
  id: string;
  status: string;
  total_amount: number | string;
  commission_amount: number | string;
  host_payout_amount: number | string;
  booking_reference: string;
  hold_expires_at: string;
}

export async function createBooking(input: CreateBookingInput) {
  if (!input.guestId || !input.accountEmail) {
    throw new BookingRequestError(
      "Sign in or create an account before booking.",
      401,
      "AUTH_REQUIRED",
    );
  }
  if (!UUID_RE.test(input.listingId))
    throw new BookingRequestError("Listing not found.", 404);
  if (!isISODate(input.checkIn) || !isISODate(input.checkOut)) {
    throw new BookingRequestError(
      "Choose valid check-in and check-out dates.",
      422,
      "INVALID_DATES",
    );
  }
  if (
    input.checkIn < new Date().toISOString().slice(0, 10) ||
    getStayNights(input.checkIn, input.checkOut) < 1
  ) {
    throw new BookingRequestError(
      "Choose valid future dates.",
      422,
      "INVALID_DATES",
    );
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new BookingRequestError(
      "Choose at least one guest.",
      422,
      "INVALID_GUESTS",
    );
  }
  if (
    !Number.isInteger(input.children) ||
    input.children < 0 ||
    input.children >= input.guests
  ) {
    throw new BookingRequestError(
      "Kids must be fewer than the total number of guests.",
      422,
      "INVALID_GUEST_COUNTS",
    );
  }
  if (!Number.isInteger(input.pets) || input.pets < 0 || input.pets > 10) {
    throw new BookingRequestError(
      "Choose between zero and ten pets.",
      422,
      "INVALID_GUEST_COUNTS",
    );
  }
  if (!input.agreedToTerms)
    throw new BookingRequestError(
      "Accept the booking terms to continue.",
      422,
      "TERMS_REQUIRED",
    );
  if (
    !EMAIL_RE.test(input.email) ||
    !PHONE_RE.test(input.phone) ||
    input.fullName.trim().length < 2
  ) {
    throw new BookingRequestError(
      "Check your name, phone, and email.",
      422,
      "INVALID_GUEST_DETAILS",
    );
  }
  if (input.idempotencyKey.length < 32 || input.idempotencyKey.length > 128) {
    throw new BookingRequestError(
      "Refresh checkout and try again.",
      400,
      "INVALID_IDEMPOTENCY_KEY",
    );
  }
  const email = input.accountEmail;
  if (!email || !EMAIL_RE.test(email)) {
    throw new BookingRequestError(
      "A valid email address is required.",
      422,
      "INVALID_GUEST_DETAILS",
    );
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select(
      "id, host_id, title, price_per_night, platform_fee_per_night, additional_charges, max_guests, min_nights, status",
    )
    .eq("id", input.listingId)
    .eq("status", "published")
    .maybeSingle();

  if (listingError)
    throw new BookingRequestError("Unable to load this listing.", 503);
  if (!listing)
    throw new BookingRequestError(
      "This listing is no longer available.",
      404,
      "LISTING_UNAVAILABLE",
    );

  const row = listing as ListingForBooking;
  if (input.guests > row.max_guests) {
    throw new BookingRequestError(
      `This listing accommodates up to ${row.max_guests} guests.`,
      422,
      "TOO_MANY_GUESTS",
    );
  }
  const nights = getStayNights(input.checkIn, input.checkOut);
  if (nights < Math.max(1, row.min_nights ?? 1)) {
    throw new BookingRequestError(
      `This listing requires a minimum stay of ${row.min_nights ?? 1} nights.`,
      422,
      "MINIMUM_STAY_NOT_MET",
    );
  }

  const selectedExtras = Array.isArray(input.selectedExtras)
    ? input.selectedExtras.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  const price = calculateBookingPrice({
    nightlyRate: row.price_per_night,
    platformFeePerNight: row.platform_fee_per_night,
    additionalCharges: row.additional_charges,
    nights,
    selectedExtras,
  });
  if (price.total <= 0)
    throw new BookingRequestError("This booking has an invalid total.", 422);

  const { data, error } = await admin.rpc("create_booking_hold_with_rounding", {
    p_listing_id: input.listingId,
    p_guest_id: input.guestId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests: input.guests,
    p_children: input.children,
    p_pets: input.pets,
    p_guest_name: input.fullName.trim(),
    p_guest_email: email,
    p_guest_phone: input.phone.trim(),
    p_guest_country: input.country?.trim() || null,
    p_special_requests: input.specialRequests?.trim() || null,
    p_payment_method: input.paymentMethod,
    p_idempotency_key: input.idempotencyKey,
    p_confirmation_token_hash: null,
    p_subtotal: price.hostSubtotal,
    p_service_fee: price.serviceFee,
    p_additional_fees: price.additionalFees,
    p_total: price.total,
    p_rounding_adjustment: price.roundingAdjustment,
    p_pricing_snapshot: {
      currency: "KES",
      nights: price.nights,
      line_items: [
        {
          type: "nightly_rate",
          name: "Nightly rate",
          unit_amount: price.nightlyRate,
          quantity: price.nights,
          total: price.subtotal,
        },
        ...price.additionalChargeLines.map((charge) => ({
          type: "host_charge",
          name: charge.name,
          frequency: charge.frequency,
          required: charge.required !== false,
          unit_amount: charge.amount,
          total: charge.total,
        })),
        ...(price.roundingAdjustment === 0
          ? []
          : [{
              type: "rounding_adjustment",
              name: "Whole-shilling adjustment",
              total: price.roundingAdjustment,
            }]),
      ],
      totals: {
        guest_nightly_subtotal: price.subtotal,
        host_subtotal: price.hostSubtotal,
        platform_markup: price.serviceFee,
        host_charges: price.additionalFees,
        rounding_adjustment: price.roundingAdjustment,
        guest_total: price.total,
        host_gross: price.hostPayout,
      },
    },
  });

  if (error) {
    const code = error.message || error.code || "BOOKING_FAILED";
    const status =
      code === "DATES_UNAVAILABLE"
        ? 409
        : code === "MINIMUM_STAY_NOT_MET"
          ? 422
          : 500;
    throw new BookingRequestError(
      code === "DATES_UNAVAILABLE"
        ? "Those dates were just booked. Choose different dates."
        : "We couldn't create this booking.",
      status,
      code,
    );
  }

  const booking = (
    Array.isArray(data) ? data[0] : data
  ) as CreatedBookingRow | null;
  if (!booking)
    throw new BookingRequestError("We couldn't create this booking.", 500);
  if (booking.status !== "pending") {
    throw new BookingRequestError(
      "This checkout is no longer active. Please reserve the dates again.",
      409,
      "HOLD_EXPIRED",
    );
  }
  if (
    !booking.hold_expires_at ||
    booking.hold_expires_at <= new Date().toISOString()
  ) {
    throw new BookingRequestError(
      "This checkout has expired. Please reserve the dates again.",
      409,
      "HOLD_EXPIRED",
    );
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    status: booking.status,
    totalAmount: Number(booking.total_amount),
    holdExpiresAt: booking.hold_expires_at,
    isGuestBooking: false,
  };
}
