import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { initiatePayment } from "@/app/lib/payments/placeholder";

// The server-side client carries auth cookies into the authenticated RPC. Guest
// checkout uses the dedicated security-definer RPC added by the migration below;
// no service-role key is exposed to the browser.

interface CreateBookingBody {
  listingId?: string;
  checkIn?: string; // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  guests?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  children?: number;
  rooms?: number;
  specialRequests?: string;
  agreedToTerms?: boolean;
  paymentMethod?: "mpesa" | "card";
  idempotencyKey?: string;
}

interface CreatedBooking {
  id: string;
  status: string;
  total_amount: number;
  commission_amount: number;
  host_payout_amount: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Maps the RPC's error codes (raised via `raise exception '<CODE>'`) to an
// HTTP status and a message safe to show the guest.
const RPC_ERROR_MAP: Record<string, { status: number; message: string }> = {
  AUTH_REQUIRED: { status: 401, message: "Please sign in to complete your booking." },
  MISSING_IDEMPOTENCY_KEY: { status: 400, message: "Invalid request. Please refresh and try again." },
  INVALID_DATES: { status: 422, message: "Please select valid check-in and check-out dates." },
  INVALID_GUESTS: { status: 422, message: "Please select a valid number of guests." },
  INVALID_PAYMENT_METHOD: { status: 422, message: "Please select a payment method." },
  LISTING_UNAVAILABLE: { status: 404, message: "This listing is no longer available." },
  TOO_MANY_GUESTS: { status: 422, message: "That listing can't accommodate that many guests." },
  DATES_UNAVAILABLE: { status: 409, message: "Those dates were just booked by someone else. Please pick different dates." },
  INVALID_GUEST_DETAILS: { status: 422, message: "Please check your guest details and try again." },
  PGRST202: {
    status: 503,
    message: "Guest checkout is not enabled in the booking database yet. Please apply the guest checkout migration.",
  },
  "42883": {
    status: 503,
    message: "The booking database function is missing or has the wrong signature. Apply the latest booking migration.",
  },
  "42703": {
    status: 503,
    message: "The booking database schema is missing a required column. Apply the latest booking migration.",
  },
  "42P01": {
    status: 503,
    message: "The booking database table is unavailable. Check the Supabase schema.",
  },
  "42702": {
    status: 503,
    message: "The booking database function has an ambiguous column reference. Reapply the latest booking migration.",
  },
  "42804": {
    status: 503,
    message: "The booking database function returned an incompatible value type. Reapply the latest booking migration.",
  },
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  let body: CreateBookingBody;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const {
    listingId,
    checkIn,
    checkOut,
    guests,
    fullName,
    email,
    phone,
    children,
    rooms,
    specialRequests,
    agreedToTerms,
    paymentMethod,
    idempotencyKey,
  } = body;

  if (!listingId || typeof listingId !== "string") return badRequest("listingId is required.");
  if (!checkIn || !DATE_RE.test(checkIn)) return badRequest("checkIn must be YYYY-MM-DD.");
  if (!checkOut || !DATE_RE.test(checkOut)) return badRequest("checkOut must be YYYY-MM-DD.");
  if (!Number.isInteger(guests) || (guests as number) < 1) return badRequest("guests must be a positive integer.");
  if (!Number.isInteger(children) || (children as number) < 0) return badRequest("children must be zero or greater.");
  if (!Number.isInteger(rooms) || (rooms as number) < 1) return badRequest("rooms must be a positive integer.");
  if (paymentMethod !== "mpesa" && paymentMethod !== "card") return badRequest("paymentMethod must be 'mpesa' or 'card'.");
  if (!idempotencyKey || typeof idempotencyKey !== "string") return badRequest("idempotencyKey is required.");
  if (agreedToTerms !== true) return badRequest("You must agree to the booking terms and cancellation policy.");

  const emailIsValid = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneIsValid = typeof phone === "string" && /^[+\d][\d\s-]{6,}$/.test(phone.trim());
  const hasGuestDetails = Boolean(fullName?.trim() && emailIsValid && phoneIsValid);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !hasGuestDetails) {
    return NextResponse.json(
      { error: "Guest name, email, and phone are required to book without an account." },
      { status: 422 },
    );
  }

  const { data: bookingData, error } = await supabase
    .rpc(user ? "create_booking" : "create_guest_booking", user
      ? {
          p_listing_id: listingId,
          p_check_in: checkIn,
          p_check_out: checkOut,
          p_guests: guests,
          p_payment_method: paymentMethod,
          p_idempotency_key: idempotencyKey,
        }
      : {
          p_listing_id: listingId,
          p_check_in: checkIn,
          p_check_out: checkOut,
          p_guests: guests,
          p_children: children,
          p_rooms: rooms,
          p_guest_name: fullName!.trim(),
          p_guest_email: email!.trim().toLowerCase(),
          p_guest_phone: phone!.trim(),
          p_special_requests: specialRequests?.trim() || null,
          p_payment_method: paymentMethod,
          p_idempotency_key: idempotencyKey,
        })
    .single();
  const booking = bookingData as CreatedBooking | null;

  if (error) {
    console.error("Booking RPC failed", {
      rpc: user ? "create_booking" : "create_guest_booking",
      code: error.code,
      message: error.message,
      details: error.details,
    });
    // Postgres exceptions raised with `raise exception 'CODE'` arrive here
    // with CODE as the message (Postgrest surfaces it in `message`).
    const errorCode = error.code ?? error.message;
    const mapped = RPC_ERROR_MAP[errorCode] ?? RPC_ERROR_MAP[error.message] ?? {
      status: 500,
      message: "We couldn't complete your booking. Please try again.",
    };
    return NextResponse.json({ error: mapped.message, code: errorCode }, { status: mapped.status });
  }

  if (!booking) {
    return NextResponse.json(
      { error: "We couldn't complete your booking. Please try again." },
      { status: 500 },
    );
  }

  // Booking + pending payment row now exist, priced server-side. Kick off
  // the actual charge. If this fails, we deliberately do NOT delete the
  // booking — it stays 'pending' and the guest (or a retry / webhook) can
  // complete payment; support/ops can reconcile stuck pending payments.
  try {
    const { providerReference } = await initiatePayment({
      method: paymentMethod,
      amount: booking.total_amount,
      bookingId: booking.id,
    });

    await supabase
      .from("payments")
      .update({ provider_reference: providerReference })
      .eq("booking_id", booking.id);

    return NextResponse.json({
      bookingId: booking.id,
      status: booking.status,
      totalAmount: booking.total_amount,
      commissionAmount: booking.commission_amount,
      hostPayoutAmount: booking.host_payout_amount,
      providerReference,
    });
  } catch {
    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        totalAmount: booking.total_amount,
        warning:
          "Your booking was created but we couldn't start the payment. Please retry payment from your bookings page.",
      },
      { status: 202 },
    );
  }
}