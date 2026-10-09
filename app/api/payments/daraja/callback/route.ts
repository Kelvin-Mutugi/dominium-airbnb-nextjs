import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeGuestPriceSnapshot } from "@/app/lib/booking/pricing";
import {
  normalizeDarajaPhone,
  queryDarajaStkStatus,
} from "@/app/lib/payments/daraja";
import { sendBookingConfirmationEmail } from "@/app/lib/payments/booking-email";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

interface StkCallback {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: unknown }> };
}

function accepted() {
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}

function callbackValue(callback: StkCallback, name: string): unknown {
  return callback.CallbackMetadata?.Item?.find((item) => item.Name === name)
    ?.Value;
}

function parseDarajaPaidAt(value: unknown): string | null {
  const timestamp = String(value ?? "");
  const match = timestamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`,
  );
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function markEvent(
  admin: ReturnType<typeof getSupabaseAdmin>,
  fingerprint: string,
  processingStatus: string,
  attemptId?: string,
) {
  let query = admin
    .from("daraja_stk_callback_events")
    .update({ processing_status: processingStatus, processed_at: new Date().toISOString() })
    .eq("fingerprint", fingerprint);
  if (attemptId) query = query.eq("attempt_id", attemptId);
  const { error } = await query;
  if (error) throw error;
}

async function markForReconciliation(
  admin: ReturnType<typeof getSupabaseAdmin>,
  attemptId: string,
  fingerprint: string,
  callback: StkCallback,
  reason: string,
) {
  const { error } = await admin
    .from("daraja_payment_attempts")
    .update({
      status: "reconciliation_required",
      result_code: Number(callback.ResultCode),
      result_description: reason.slice(0, 500),
      callback_payload: callback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .in("status", ["initializing", "pending", "reconciliation_required"]);
  if (error) throw error;
  await markEvent(admin, fingerprint, "reconciliation_required", attemptId);
}

async function sendConfirmationEmail(bookingId: string) {
  const admin = getSupabaseAdmin();
  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, booking_reference, guest_email, check_in, check_out, total_amount, pricing_snapshot, status, listing_id, listing:listings(title)",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (
    !booking ||
    !["confirmed", "completed"].includes(booking.status) ||
    !booking.guest_email
  ) {
    return;
  }

  const { data: guide, error: guideError } = await admin
    .from("listing_arrival_guides")
    .select("arrival_contact")
    .eq("listing_id", booking.listing_id)
    .maybeSingle();
  if (guideError) throw guideError;
  const listing = Array.isArray(booking.listing)
    ? booking.listing[0]
    : booking.listing;
  await sendBookingConfirmationEmail({
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    recipient: booking.guest_email,
    listingTitle: listing?.title ?? "Your stay",
    checkIn: booking.check_in,
    checkOut: booking.check_out,
    totalPaid: Number(booking.total_amount),
    priceLines: normalizeGuestPriceSnapshot(booking.pricing_snapshot).line_items.map(
      (line) => ({ name: line.name, amount: Number(line.total) }),
    ),
    hostContact: guide?.arrival_contact ?? null,
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: {
    Body?: { stkCallback?: StkCallback };
  };
  try {
    payload = JSON.parse(rawBody) as { Body?: { stkCallback?: StkCallback } };
  } catch {
    return accepted();
  }

  const callback = payload.Body?.stkCallback;
  const checkoutRequestId = callback?.CheckoutRequestID;
  const fingerprint = createHash("sha256").update(rawBody).digest("hex");
  if (!callback || typeof checkoutRequestId !== "string" || !checkoutRequestId) {
    return accepted();
  }

  const admin = getSupabaseAdmin();
  const { data: attempt, error: attemptError } = await admin
    .from("daraja_payment_attempts")
    .select("id, booking_id, payment_id, phone_number, amount, status, merchant_request_id")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle();
  if (attemptError) {
    console.error("Daraja callback attempt lookup failed:", attemptError);
    return NextResponse.json({ error: "Callback processing failed." }, { status: 500 });
  }

  const { error: eventError } = await admin
    .from("daraja_stk_callback_events")
    .insert({
      attempt_id: attempt?.id ?? null,
      checkout_request_id: checkoutRequestId,
      fingerprint,
      processing_status: attempt ? "received" : "unmatched",
      payload,
    });
  if (eventError && eventError.code !== "23505") {
    console.error("Daraja callback event could not be recorded:", eventError);
    return NextResponse.json({ error: "Callback processing failed." }, { status: 500 });
  }
  if (!attempt) return accepted();

  try {
    if (["succeeded", "late_success"].includes(attempt.status)) {
      await markEvent(admin, fingerprint, "processed", attempt.id);
      return accepted();
    }

    if (callback.MerchantRequestID !== attempt.merchant_request_id) {
      await markForReconciliation(
        admin,
        attempt.id,
        fingerprint,
        callback,
        "Callback merchant request ID did not match the initialized STK request.",
      );
      return accepted();
    }

    const resultCode = Number(callback.ResultCode);
    if (!Number.isInteger(resultCode)) {
      await markForReconciliation(
        admin,
        attempt.id,
        fingerprint,
        callback,
        "Callback did not contain a valid result code.",
      );
      return accepted();
    }
    if (resultCode !== 0) {
      const { error } = await admin
        .from("daraja_payment_attempts")
        .update({
          status: "failed",
          result_code: resultCode,
          result_description: String(callback.ResultDesc ?? "Payment was not completed").slice(0, 500),
          callback_payload: callback,
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id)
        .in("status", ["initializing", "pending", "reconciliation_required"]);
      if (error) throw error;
      await markEvent(admin, fingerprint, "processed", attempt.id);
      return accepted();
    }

    const amount = Number(callbackValue(callback, "Amount"));
    const receiptNumber = String(callbackValue(callback, "MpesaReceiptNumber") ?? "");
    let callbackPhone: string;
    try {
      callbackPhone = normalizeDarajaPhone(
        String(callbackValue(callback, "PhoneNumber") ?? ""),
      );
    } catch {
      await markForReconciliation(
        admin,
        attempt.id,
        fingerprint,
        callback,
        "Callback did not contain a valid Kenyan phone number.",
      );
      return accepted();
    }
    if (
      !Number.isSafeInteger(amount) ||
      amount !== Number(attempt.amount) ||
      callbackPhone !== attempt.phone_number ||
      !/^[A-Za-z0-9]{8,20}$/.test(receiptNumber)
    ) {
      await markForReconciliation(
        admin,
        attempt.id,
        fingerprint,
        callback,
        "Callback amount, phone, or M-Pesa receipt did not match the payment attempt.",
      );
      return accepted();
    }

    const verifiedStatus = await queryDarajaStkStatus(checkoutRequestId);
    if (
      String(verifiedStatus.ResultCode) !== "0" ||
      (verifiedStatus.CheckoutRequestID &&
        verifiedStatus.CheckoutRequestID !== checkoutRequestId)
    ) {
      await markForReconciliation(
        admin,
        attempt.id,
        fingerprint,
        callback,
        "STK status query did not confirm the successful callback.",
      );
      return accepted();
    }

    const rawResponse = { callback: payload, statusQuery: verifiedStatus };
    const { data: settlement, error: settlementError } = await admin.rpc(
      "settle_daraja_stk_attempt",
      {
        p_checkout_request_id: checkoutRequestId,
        p_amount_minor: amount * 100,
        p_phone_number: callbackPhone,
        p_receipt_number: receiptNumber,
        p_paid_at: parseDarajaPaidAt(callbackValue(callback, "TransactionDate")),
        p_raw_response: rawResponse,
      },
    );
    if (settlementError) throw settlementError;
    const result = Array.isArray(settlement) ? settlement[0] : settlement;
    await markEvent(admin, fingerprint, "processed", attempt.id);

    if (result?.booking_confirmed && !result.already_settled) {
      try {
        await sendConfirmationEmail(result.booking_id);
      } catch (emailError) {
        console.error("Daraja booking confirmation email failed:", emailError);
      }
    } else if (!result?.booking_confirmed) {
      console.error("Successful Daraja charge needs booking reconciliation:", {
        checkoutRequestId,
        bookingId: result?.booking_id,
      });
    }
    return accepted();
  } catch (error) {
    const failureReason = `Callback processing failed: ${
      error instanceof Error ? error.message : "Unknown processing error."
    }`.slice(0, 500);
    const { error: attemptUpdateError } = await admin
      .from("daraja_payment_attempts")
      .update({
        status: "reconciliation_required",
        result_description: failureReason,
        callback_payload: callback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .in("status", ["initializing", "pending", "reconciliation_required"]);
    if (attemptUpdateError) {
      console.error("Daraja callback reconciliation status update failed:", attemptUpdateError);
    }
    try {
      await markEvent(admin, fingerprint, "reconciliation_required", attempt.id);
    } catch (eventUpdateError) {
      console.error("Daraja callback event reconciliation update failed:", eventUpdateError);
    }
    console.error("Daraja STK callback settlement failed:", error);
    return NextResponse.json({ error: "Callback processing failed." }, { status: 500 });
  }
}