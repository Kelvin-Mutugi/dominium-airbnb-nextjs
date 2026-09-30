import "server-only";

import { createHash } from "node:crypto";
import { calculateBookingPrice } from "@/app/lib/booking/pricing";
import { getStayNights, isISODate } from "@/app/lib/booking/availability";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import type { BookingPaymentMethod } from "@/app/lib/payments/paystack";

export interface CreateBookingInput {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  fullName: string;
  email: string;
  phone: string;
  country?: string;
  specialRequests?: string;
  agreedToTerms: boolean;
  paymentMethod: BookingPaymentMethod;
  idempotencyKey: string;
  confirmationToken: string;
  guestId: string | null;
  accountEmail: string | null;
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d][\d\s()-]{6,19}$/;
const SECRET_RE = /^[A-Za-z0-9_-]{43,100}$/;

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
  if (!UUID_RE.test(input.listingId)) throw new BookingRequestError("Listing not found.", 404);
  if (!isISODate(input.checkIn) || !isISODate(input.checkOut)) {
    throw new BookingRequestError("Choose valid check-in and check-out dates.", 422, "INVALID_DATES");
  }
  if (input.checkIn < new Date().toISOString().slice(0, 10) || getStayNights(input.checkIn, input.checkOut) < 1) {
    throw new BookingRequestError("Choose valid future dates.", 422, "INVALID_DATES");
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new BookingRequestError("Choose at least one guest.", 422, "INVALID_GUESTS");
  }
  if (!input.agreedToTerms) throw new BookingRequestError("Accept the booking terms to continue.", 422, "TERMS_REQUIRED");
  if (!EMAIL_RE.test(input.email) || !PHONE_RE.test(input.phone) || input.fullName.trim().length < 2) {
    throw new BookingRequestError("Check your name, phone, and email.", 422, "INVALID_GUEST_DETAILS");
  }
  if (input.idempotencyKey.length < 32 || input.idempotencyKey.length > 128) {
    throw new BookingRequestError("Refresh checkout and try again.", 400, "INVALID_IDEMPOTENCY_KEY");
  }
  if (!SECRET_RE.test(input.confirmationToken)) {
    throw new BookingRequestError("Refresh checkout and try again.", 400, "INVALID_CONFIRMATION_TOKEN");
  }

  const email = input.guestId ? input.accountEmail : input.email.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    throw new BookingRequestError("A valid email address is required.", 422, "INVALID_GUEST_DETAILS");
  }

  const admin = getSupabaseAdmin();
  const { data: listing, error: listingError } = await admin
    .from("listings")
    .select("id, host_id, title, price_per_night, platform_fee_per_night, additional_charges, max_guests, min_nights, status")
    .eq("id", input.listingId)
    .eq("status", "published")
    .maybeSingle();

  if (listingError) throw new BookingRequestError("Unable to load this listing.", 503);
  if (!listing) throw new BookingRequestError("This listing is no longer available.", 404, "LISTING_UNAVAILABLE");

  const row = listing as ListingForBooking;
  if (input.guests > row.max_guests) {
    throw new BookingRequestError(`This listing accommodates up to ${row.max_guests} guests.`, 422, "TOO_MANY_GUESTS");
  }
  const nights = getStayNights(input.checkIn, input.checkOut);
  if (nights < Math.max(1, row.min_nights ?? 1)) {
    throw new BookingRequestError(`This listing requires a minimum stay of ${row.min_nights ?? 1} nights.`, 422, "MINIMUM_STAY_NOT_MET");
  }

  const price = calculateBookingPrice({
    nightlyRate: row.price_per_night,
    platformFeePerNight: row.platform_fee_per_night,
    additionalCharges: row.additional_charges,
    nights,
  });
  if (price.total <= 0) throw new BookingRequestError("This booking has an invalid total.", 422);

  const confirmationTokenHash = createHash("sha256").update(input.confirmationToken).digest("hex");
  const { data, error } = await admin.rpc("create_booking_hold", {
    p_listing_id: input.listingId,
    p_guest_id: input.guestId,
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests: input.guests,
    p_guest_name: input.fullName.trim(),
    p_guest_email: email,
    p_guest_phone: input.phone.trim(),
    p_guest_country: input.country?.trim() || null,
    p_special_requests: input.specialRequests?.trim() || null,
    p_payment_method: input.paymentMethod,
    p_idempotency_key: input.idempotencyKey,
    p_confirmation_token_hash: input.guestId ? null : confirmationTokenHash,
    p_subtotal: price.subtotal,
    p_service_fee: price.serviceFee,
    p_additional_fees: price.additionalFees,
    p_total: price.total,
  });

  if (error) {
    const code = error.message || error.code || "BOOKING_FAILED";
    const status = code === "DATES_UNAVAILABLE" ? 409 : code === "MINIMUM_STAY_NOT_MET" ? 422 : 500;
    throw new BookingRequestError(
      code === "DATES_UNAVAILABLE" ? "Those dates were just booked. Choose different dates." : "We couldn't create this booking.",
      status,
      code,
    );
  }

  const booking = (Array.isArray(data) ? data[0] : data) as CreatedBookingRow | null;
  if (!booking) throw new BookingRequestError("We couldn't create this booking.", 500);
  if (booking.status !== "pending") {
    throw new BookingRequestError("This checkout is no longer active. Please reserve the dates again.", 409, "HOLD_EXPIRED");
  }
  if (!booking.hold_expires_at || booking.hold_expires_at <= new Date().toISOString()) {
    throw new BookingRequestError("This checkout has expired. Please reserve the dates again.", 409, "HOLD_EXPIRED");
  }

  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    status: booking.status,
    totalAmount: Number(booking.total_amount),
    holdExpiresAt: booking.hold_expires_at,
    isGuestBooking: !input.guestId,
  };
}