import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DarajaApiError,
  getDarajaConfig,
  initiateDarajaStkPush,
  normalizeDarajaPhone,
} from "@/app/lib/payments/daraja";
import { hasSameRequestOrigin } from "@/app/lib/http/request-origin";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import { createClient } from "@/app/lib/supabase/server";

interface StkRequestBody {
  bookingId?: unknown;
  idempotencyKey?: unknown;
  confirmationToken?: unknown;
}

export async function POST(request: Request) {
  if (!hasSameRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: StkRequestBody;
  try {
    body = (await request.json()) as StkRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  const { bookingId, idempotencyKey, confirmationToken } = body;
  if (
    typeof bookingId !== "string" ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 32 ||
    idempotencyKey.length > 128 ||
    (confirmationToken != null && typeof confirmationToken !== "string")
  ) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }

  try {
    getDarajaConfig();
  } catch (error) {
    console.error("Daraja STK configuration is incomplete:", error);
    return NextResponse.json(
      { error: "M-Pesa payments are temporarily unavailable." },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error: expiryError } = await admin.rpc("expire_pending_booking_holds");
  if (expiryError) {
    console.error("Pending booking hold cleanup failed:", expiryError);
    return NextResponse.json(
      { error: "Booking availability is temporarily unavailable." },
      { status: 503 },
    );
  }

  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, guest_id, guest_email, guest_phone, guest_confirmation_token_hash, booking_reference, status, total_amount, hold_expires_at",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.guest_id) {
    if (!user || user.id !== booking.guest_id) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
  } else {
    const token = typeof confirmationToken === "string" ? confirmationToken : "";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    if (
      !booking.guest_confirmation_token_hash ||
      tokenHash !== booking.guest_confirmation_token_hash
    ) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
  }

  if (
    booking.status !== "pending" ||
    !booking.hold_expires_at ||
    booking.hold_expires_at <= new Date().toISOString()
  ) {
    return NextResponse.json(
      { error: "The date hold has expired. Please reserve the dates again." },
      { status: 409 },
    );
  }

  const amount = Number(booking.total_amount);
  let phoneNumber: string;
  try {
    phoneNumber = normalizeDarajaPhone(booking.guest_phone ?? "");
  } catch {
    return NextResponse.json(
      { error: "Enter a valid Kenyan M-Pesa phone number in your booking details." },
      { status: 422 },
    );
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "This booking amount cannot be sent as an M-Pesa payment." },
      { status: 409 },
    );
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, amount, status")
    .eq("booking_id", booking.id)
    .eq("status", "pending")
    .maybeSingle();
  if (paymentError || !payment || amount !== Number(payment.amount)) {
    return NextResponse.json(
      { error: "Booking total does not match its pending payment." },
      { status: 409 },
    );
  }

  const { data: sameRequest, error: sameRequestError } = await admin
    .from("daraja_payment_attempts")
    .select("booking_id, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (sameRequestError) {
    return NextResponse.json({ error: "Unable to load payment state." }, { status: 503 });
  }
  if (sameRequest) {
    if (sameRequest.booking_id !== booking.id) {
      return NextResponse.json({ error: "Payment attempt not found." }, { status: 404 });
    }
    if (["initializing", "pending", "reconciliation_required", "succeeded", "late_success"].includes(sameRequest.status)) {
      return NextResponse.json({ accepted: true, processing: true }, { status: 202 });
    }
    return NextResponse.json(
      { error: "This payment attempt has ended. Start a new attempt." },
      { status: 409 },
    );
  }

  const { data: activeAttempt, error: activeError } = await admin
    .from("daraja_payment_attempts")
    .select("status")
    .eq("booking_id", booking.id)
    .in("status", ["initializing", "pending", "reconciliation_required"])
    .maybeSingle();
  if (activeError) {
    return NextResponse.json({ error: "Unable to load payment state." }, { status: 503 });
  }
  if (activeAttempt) {
    return NextResponse.json({ accepted: true, processing: true }, { status: 202 });
  }

  const { data: attempt, error: attemptError } = await admin
    .from("daraja_payment_attempts")
    .insert({
      booking_id: booking.id,
      payment_id: payment.id,
      idempotency_key: idempotencyKey,
      phone_number: phoneNumber,
      amount,
      currency: "KES",
      status: "initializing",
    })
    .select("id")
    .single();
  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: "A payment attempt is already active. Check your booking status." },
      { status: 409 },
    );
  }

  let submittedRequestIds: {
    merchantRequestId: string;
    checkoutRequestId: string;
  } | null = null;
  try {
    const result = await initiateDarajaStkPush({
      amountKes: amount,
      phone: phoneNumber,
      bookingReference: booking.booking_reference,
    });
    submittedRequestIds = {
      merchantRequestId: result.merchantRequestId,
      checkoutRequestId: result.checkoutRequestId,
    };
    const { error: updateError } = await admin
      .from("daraja_payment_attempts")
      .update({
        status: "pending",
        merchant_request_id: result.merchantRequestId,
        checkout_request_id: result.checkoutRequestId,
        response_payload: result.rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .eq("status", "initializing");
    if (updateError) throw new DarajaApiError("Payment request needs reconciliation.", true);

    const { error: paymentUpdateError } = await admin
      .from("payments")
      .update({
        provider: "safaricom",
        provider_reference: result.checkoutRequestId,
        payment_channel: "stk_push",
        method: "mpesa",
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (paymentUpdateError) {
      console.error("Could not update pending Daraja payment record:", paymentUpdateError);
      await admin
        .from("daraja_payment_attempts")
        .update({ status: "reconciliation_required", updated_at: new Date().toISOString() })
        .eq("id", attempt.id);
      return NextResponse.json({ accepted: true, processing: true }, { status: 202 });
    }

    return NextResponse.json({ accepted: true });
  } catch (error) {
    const uncertain =
      error instanceof DarajaApiError && error.requestMayHaveSucceeded;
    if (uncertain) {
      console.error("Daraja STK request needs reconciliation:", {
        bookingId: booking.id,
        attemptId: attempt.id,
        ...submittedRequestIds,
      });
    }
    await admin
      .from("daraja_payment_attempts")
      .update({
        status: uncertain ? "reconciliation_required" : "failed",
        result_description:
          error instanceof Error ? error.message.slice(0, 500) : "STK request failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .eq("status", "initializing");
    if (uncertain) {
      return NextResponse.json({ accepted: true, processing: true }, { status: 202 });
    }
    console.error("Daraja STK initialization failed:", error);
    return NextResponse.json(
      { error: "We couldn't send the M-Pesa prompt. Try again." },
      { status: 502 },
    );
  }
}