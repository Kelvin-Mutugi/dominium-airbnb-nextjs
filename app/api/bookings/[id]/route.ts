import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { cookies } from "next/headers";
import { createClient } from "@/app/lib/supabase/server";
import { verifyPaystackTransaction } from "@/app/lib/payments/paystack";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tokenMatches(token: string, expectedHash: string | null): boolean {
  if (!expectedHash) return false;
  const actual = createHash("sha256").update(token).digest();
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHash, "hex");
  } catch {
    return false;
  }
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  const url = new URL(request.url);

  const admin = getSupabaseAdmin();
  const [{ data: booking, error: bookingError }, session, cookieStore] = await Promise.all([
    admin
      .from("bookings")
      .select("id, booking_reference, guest_id, guest_confirmation_token_hash, guest_name, guest_email, guest_phone, status, check_in, check_out, guests_count, children_count, pets_count, total_amount, commission_amount, host_payout_amount, host_base_amount, additional_charges_amount, listing_id, listing:listings(title)")
      .eq("id", id)
      .maybeSingle(),
    createClient(),
    cookies(),
  ]);
  if (bookingError || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const { data: { user } } = await session.auth.getUser();
  const guestToken = cookieStore.get(`booking-confirmation-${id}`)?.value ?? "";
  const authorized = booking.guest_id
    ? user?.id === booking.guest_id
    : tokenMatches(guestToken, booking.guest_confirmation_token_hash);
  if (!authorized) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  let { data: attempt } = await admin
    .from("paystack_payment_attempts")
    .select("reference, status")
    .eq("booking_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let bookingStatus = booking.status;

  const requestedReference = url.searchParams.get("reference");
  if (
    requestedReference &&
    requestedReference === attempt?.reference &&
    attempt.status === "pending" &&
    url.searchParams.get("verify") === "1"
  ) {
    try {
      const transaction = await verifyPaystackTransaction(requestedReference);
      if (transaction.reference === requestedReference && transaction.status === "success") {
        const amountMinor = Number(transaction.amount);
        let metadata = transaction.metadata as Record<string, unknown> | string | undefined;
        if (typeof metadata === "string") {
          try {
            metadata = JSON.parse(metadata) as Record<string, unknown>;
          } catch {
            metadata = undefined;
          }
        }

        if (
          transaction.currency === "KES" &&
          Number.isInteger(amountMinor) &&
          String(metadata?.booking_id ?? "") === id
        ) {
          const { data: settlement, error: settlementError } = await admin.rpc(
            "settle_paystack_attempt",
            {
              p_reference: requestedReference,
              p_amount_minor: amountMinor,
              p_currency: String(transaction.currency),
              p_transaction_id: Number.isFinite(Number(transaction.id))
                ? Number(transaction.id)
                : null,
              p_channel: String(transaction.channel ?? ""),
              p_paid_at:
                typeof transaction.paid_at === "string"
                  ? transaction.paid_at
                  : null,
              p_raw_response: transaction,
            },
          );
          if (settlementError) throw settlementError;

          const result = Array.isArray(settlement) ? settlement[0] : settlement;
          if (result?.booking_confirmed) {
            bookingStatus = "confirmed";
            attempt = { ...attempt, status: "paid" };
          }
        }
      } else if (
        transaction.reference === requestedReference &&
        ["failed", "abandoned"].includes(String(transaction.status))
      ) {
        await admin
          .from("paystack_payment_attempts")
          .update({ status: transaction.status, updated_at: new Date().toISOString(), raw_response: transaction })
          .eq("reference", requestedReference)
          .eq("status", "pending");
        attempt = { ...attempt, status: String(transaction.status) };
      }
    } catch (verificationError) {
      console.error("Could not verify returned Paystack attempt:", verificationError);
    }
  }

  const [{ data: payment, error: paymentError }, { data: guide, error: guideError }] = await Promise.all([
    admin
      .from("payments")
      .select("amount, currency, status, paid_at, provider_reference, payment_channel, method")
      .eq("booking_id", id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    bookingStatus === "confirmed" || bookingStatus === "completed"
      ? admin
          .from("listing_arrival_guides")
          .select("arrival_contact")
          .eq("listing_id", booking.listing_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (paymentError || guideError) {
    return NextResponse.json({ error: "Unable to load booking confirmation." }, { status: 503 });
  }

  const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
  return NextResponse.json({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    listingId: booking.listing_id,
    status: bookingStatus,
    paymentConfirmed: Boolean(payment),
    listingTitle: listing?.title ?? "Your stay",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    guests: booking.guests_count,
    children: booking.children_count,
    pets: booking.pets_count,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    totalAmount: Number(booking.total_amount),
    serviceFee: Number(booking.commission_amount),
    hostPayout: Number(booking.host_payout_amount),
    hostBaseAmount: Number(booking.host_base_amount ?? booking.host_payout_amount),
    additionalFees: Number(booking.additional_charges_amount ?? 0),
    paymentAttemptStatus: attempt?.status ?? null,
      paymentAttemptReference: attempt?.reference ?? null,
    emailConfirmationEnabled: Boolean(process.env.RESEND_API_KEY && process.env.BOOKING_CONFIRMATION_FROM),
    payment: payment
      ? {
          amountPaid: Number(payment.amount),
          currency: payment.currency ?? "KES",
          paidAt: payment.paid_at,
          method: payment.payment_channel ?? payment.method,
          reference: payment.provider_reference,
        }
      : null,
    hostContact: bookingStatus === "confirmed" || bookingStatus === "completed"
      ? guide?.arrival_contact ?? null
      : null,
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}