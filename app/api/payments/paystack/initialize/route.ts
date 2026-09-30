import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BookingPaymentMethod, initializePaystackTransaction, verifyPaystackTransaction } from "@/app/lib/payments/paystack";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

interface InitializeBody {
  bookingId?: unknown;
  paymentMethod?: unknown;
  idempotencyKey?: unknown;
  confirmationToken?: unknown;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: InitializeBody;
  try {
    body = (await request.json()) as InitializeBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, paymentMethod, idempotencyKey, confirmationToken } = body;
  if (
    typeof bookingId !== "string" ||
    (paymentMethod !== "mpesa" && paymentMethod !== "card") ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 32 ||
    (confirmationToken != null && typeof confirmationToken !== "string")
  ) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return NextResponse.json({ error: "Payment callback URL is not configured." }, { status: 500 });

  const admin = getSupabaseAdmin();
  const { error: expiryError } = await admin.rpc("expire_pending_booking_holds");
  if (expiryError) {
    console.error("Pending hold cleanup failed:", expiryError);
    return NextResponse.json({ error: "Booking availability is temporarily unavailable." }, { status: 503 });
  }

  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, guest_id, guest_email, guest_confirmation_token_hash, status, total_amount, hold_expires_at")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.guest_id) {
    if (!user || user.id !== booking.guest_id) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  } else {
    const token = typeof confirmationToken === "string" ? confirmationToken : "";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    if (!booking.guest_confirmation_token_hash || tokenHash !== booking.guest_confirmation_token_hash) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
  }

  if (booking.status !== "pending" || !booking.hold_expires_at || booking.hold_expires_at <= new Date().toISOString()) {
    return NextResponse.json({ error: "The date hold has expired. Please reserve the dates again." }, { status: 409 });
  }
  if (!booking.guest_email) return NextResponse.json({ error: "Booking email is missing." }, { status: 422 });

  const amount = Number(booking.total_amount);
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, amount, status")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .maybeSingle();
  if (paymentError || !payment) return NextResponse.json({ error: "Pending payment record not found." }, { status: 404 });
  if (!Number.isFinite(amount) || amount <= 0 || amount !== Number(payment.amount)) {
    return NextResponse.json({ error: "Booking total does not match its payment record." }, { status: 409 });
  }

  const { data: sameRequest } = await admin
    .from("paystack_payment_attempts")
    .select("booking_id, reference, status, access_code, authorization_url")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (sameRequest) {
    if (sameRequest.booking_id !== booking.id) {
      return NextResponse.json({ error: "Payment attempt not found." }, { status: 404 });
    }
    if (sameRequest.status === "pending" && sameRequest.access_code && sameRequest.authorization_url) {
      return NextResponse.json({
        accessCode: sameRequest.access_code,
        authorizationUrl: sameRequest.authorization_url,
        reference: sameRequest.reference,
      });
    }
    if (["initializing", "pending"].includes(sameRequest.status)) {
      return NextResponse.json({ processing: true, reference: sameRequest.reference }, { status: 202 });
    }
    return NextResponse.json({ error: "This payment attempt has ended. Start a new attempt." }, { status: 409 });
  }

  const { data: activeAttempt, error: activeError } = await admin
    .from("paystack_payment_attempts")
    .select("id, reference, status, method, access_code, authorization_url")
    .eq("booking_id", booking.id)
    .in("status", ["initializing", "pending"])
    .maybeSingle();
  if (activeError) return NextResponse.json({ error: "Unable to load payment state." }, { status: 503 });
  if (activeAttempt?.status === "initializing") {
    return NextResponse.json({ processing: true, reference: activeAttempt.reference }, { status: 202 });
  }
  if (activeAttempt?.status === "pending") {
    const prior = await verifyPaystackTransaction(activeAttempt.reference);
    if (prior.reference !== activeAttempt.reference) {
      return NextResponse.json({ error: "Payment reference mismatch." }, { status: 502 });
    }
    if (prior.status === "success") {
      return NextResponse.json({ processing: true, reference: activeAttempt.reference }, { status: 202 });
    }
    if (["pending", "ongoing", "processing"].includes(String(prior.status))) {
      if (activeAttempt.method !== paymentMethod) {
        return NextResponse.json({ error: "Finish or close the current payment before changing method." }, { status: 409 });
      }
      if (activeAttempt.access_code && activeAttempt.authorization_url) {
        return NextResponse.json({
          accessCode: activeAttempt.access_code,
          authorizationUrl: activeAttempt.authorization_url,
          reference: activeAttempt.reference,
        });
      }
      return NextResponse.json({ processing: true, reference: activeAttempt.reference }, { status: 202 });
    }
    if (!["failed", "abandoned"].includes(String(prior.status))) {
      return NextResponse.json({ error: "Payment is still being processed." }, { status: 409 });
    }
    await admin.from("paystack_payment_attempts").update({ status: prior.status }).eq("id", activeAttempt.id);
  }

  const reference = `Dominium-${randomUUID()}`;
  const { data: attempt, error: attemptError } = await admin
    .from("paystack_payment_attempts")
    .insert({
      booking_id: booking.id,
      payment_id: payment.id,
      idempotency_key: idempotencyKey,
      reference,
      method: paymentMethod,
      amount,
      currency: "KES",
      status: "initializing",
    })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    return NextResponse.json({ error: "A payment attempt is already active. Try again shortly." }, { status: 409 });
  }

  try {
    const transaction = await initializePaystackTransaction({
      email: booking.guest_email,
      amountKes: amount,
      reference,
      bookingId: booking.id,
      paymentMethod: paymentMethod as BookingPaymentMethod,
      callbackUrl: `${siteUrl.replace(/\/$/, "")}/booking/${booking.id}/confirmation`,
    });
    const { error: updateError } = await admin
      .from("paystack_payment_attempts")
      .update({
        status: "pending",
        access_code: transaction.access_code,
        authorization_url: transaction.authorization_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .eq("status", "initializing");
    if (updateError) throw updateError;

    await admin
      .from("payments")
      .update({
        method: paymentMethod,
        provider: "paystack",
        provider_reference: reference,
        authorization_url: transaction.authorization_url,
      })
      .eq("id", payment.id);

    return NextResponse.json({
      accessCode: transaction.access_code,
      authorizationUrl: transaction.authorization_url,
      reference,
    });
  } catch (error) {
    await admin
      .from("paystack_payment_attempts")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", attempt.id);
    console.error("Paystack initialization failed:", error);
    return NextResponse.json({ error: "Unable to open secure payment. Try again." }, { status: 502 });
  }
}