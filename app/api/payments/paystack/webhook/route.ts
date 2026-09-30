import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/app/lib/payments/paystack";
import { sendBookingConfirmationEmail } from "@/app/lib/payments/booking-email";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface PaystackWebhookEvent {
  event?: string;
  data?: { reference?: string };
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expectedSignature = crypto.createHmac("sha512", secret).update(rawBody).digest();
  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(signature, "hex");
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (
    !signature ||
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ received: true });
  }

  try {
    const reference = event.data.reference;
    const transaction = await verifyPaystackTransaction(reference);
    if (transaction.reference !== reference || transaction.status !== "success") {
      return NextResponse.json({ received: true });
    }
    if (transaction.currency !== "KES" || !Number.isInteger(Number(transaction.amount))) {
      return NextResponse.json({ error: "Payment currency or amount is invalid." }, { status: 422 });
    }

    const admin = getSupabaseAdmin();
    const { data: attempt, error: attemptError } = await admin
      .from("paystack_payment_attempts")
      .select("booking_id")
      .eq("reference", reference)
      .maybeSingle();
    if (attemptError || !attempt) throw attemptError ?? new Error("Payment attempt not found");
    let metadata = transaction.metadata as Record<string, unknown> | string | undefined;
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        metadata = undefined;
      }
    }
    if (String(metadata?.booking_id ?? "") !== attempt.booking_id) {
      throw new Error("Paystack booking metadata does not match the payment attempt");
    }

    const { data, error } = await admin.rpc("settle_paystack_attempt", {
      p_reference: reference,
      p_amount_minor: Number(transaction.amount),
      p_currency: String(transaction.currency),
      p_transaction_id: Number.isFinite(Number(transaction.id)) ? Number(transaction.id) : null,
      p_channel: String(transaction.channel ?? ""),
      p_paid_at: typeof transaction.paid_at === "string" ? transaction.paid_at : null,
      p_raw_response: transaction,
    });
    if (error) throw error;

    const settlement = Array.isArray(data) ? data[0] : data;
    if (settlement && !settlement.booking_confirmed) {
      console.error("Successful Paystack charge needs booking reconciliation:", {
        reference,
        bookingId: settlement.booking_id,
      });
    }

    if (settlement?.booking_confirmed) {
      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .select("id, booking_reference, guest_email, check_in, check_out, total_amount, status, listing_id, listing:listings(title)")
        .eq("id", settlement.booking_id)
        .maybeSingle();
      if ((booking?.status === "confirmed" || booking?.status === "completed") && booking.guest_email) {
        const { data: guide, error: guideError } = await admin
          .from("listing_arrival_guides")
          .select("arrival_contact")
          .eq("listing_id", booking.listing_id)
          .maybeSingle();
        if (bookingError || guideError) throw bookingError ?? guideError;
        const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing;
        await sendBookingConfirmationEmail({
          bookingId: booking.id,
          bookingReference: booking.booking_reference,
          recipient: booking.guest_email,
          listingTitle: listing?.title ?? "Your stay",
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          totalPaid: Number(transaction.amount) / 100,
          hostContact: guide?.arrival_contact ?? null,
        });
      } else if (bookingError) {
        throw bookingError;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook settlement failed:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}