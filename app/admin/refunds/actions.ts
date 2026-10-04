"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

type RefundAction = "approve" | "decline" | "processed";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createPaymentRefundRequest(paymentId: string, reason: string) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(paymentId)) throw new Error("Invalid payment record.");
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 5 || normalizedReason.length > 1000) {
    throw new Error("Add a reason between 5 and 1000 characters.");
  }

  const admin = getSupabaseAdmin();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, booking_id, amount, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (paymentError || !payment) throw new Error("Payment record not found.");
  if (!(["paid", "success"] as string[]).includes(payment.status)) {
    throw new Error("Only completed guest payments can be sent for refund review.");
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select("id, guest_id, status")
    .eq("id", payment.booking_id)
    .maybeSingle();
  if (bookingError || !booking) throw new Error("The payment’s booking could not be found.");
  if (booking.status === "completed") {
    throw new Error("Refunds are only eligible before the stay is completed.");
  }

  const { error: insertError } = await admin.from("payment_refund_requests").insert({
    payment_id: payment.id,
    booking_id: booking.id,
    guest_id: booking.guest_id,
    requested_by: actor.id,
    amount_paid: payment.amount,
    reason: normalizedReason,
  });
  if (insertError) {
    if (insertError.code === "23505") throw new Error("A refund request already exists for this payment.");
    if (insertError.message.includes("STAY_ALREADY_COMPLETED")) {
      throw new Error("Refunds are only eligible before the stay is completed.");
    }
    console.error("Unable to create payment refund request:", insertError);
    throw new Error("Unable to send this payment for refund review.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "payment.refund.requested",
    entityType: "booking",
    entityId: booking.id,
    summary: "Requested refund review for a guest payment.",
    after: { payment_id: payment.id, amount_paid: payment.amount, reason: normalizedReason },
  });
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/refunds");
  revalidatePath("/account/bookings");
  revalidatePath("/host/bookings");
}

export async function decidePaymentRefundRequest(input: {
  requestId: string;
  action: RefundAction;
  response?: string;
  actualAmount?: number;
  transactionReference?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(input.requestId)) throw new Error("Invalid refund request.");
  if (!["approve", "decline", "processed"].includes(input.action)) throw new Error("Invalid refund decision.");
  const response = String(input.response ?? "").trim();
  const transactionReference = String(input.transactionReference ?? "").trim();
  if (response.length > 1000 || transactionReference.length > 200) {
    throw new Error("Refund notes or reference exceed the allowed length.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_decide_payment_refund_request", {
    p_request_id: input.requestId,
    p_action: input.action,
    p_admin_response: response || null,
    p_actual_refund_amount: input.actualAmount ?? null,
    p_transaction_reference: transactionReference || null,
  });
  if (error) {
    if (error.message.includes("STAY_ALREADY_COMPLETED")) {
      throw new Error("Refunds are only eligible before the stay is completed.");
    }
    if (error.message.includes("REFUND_NOT_AWAITING_REVIEW")) throw new Error("This refund is no longer awaiting review.");
    if (error.message.includes("REFUND_NOT_APPROVED_FOR_PROCESSING")) throw new Error("Approve this refund before recording it as sent.");
    if (error.message.includes("REFUND_DECLINE_REASON_REQUIRED")) throw new Error("Add a reason before declining the refund.");
    if (error.message.includes("INVALID_ACTUAL_REFUND_AMOUNT")) throw new Error("Enter an amount greater than zero and no more than the payment amount.");
    if (error.message.includes("REFUND_REFERENCE_REQUIRED")) throw new Error("Enter the bank, M-Pesa, or provider transaction reference.");
    if (error.message.includes("REFUND_REQUEST_NOT_FOUND")) throw new Error("Refund request not found.");
    if (error.message.includes("ADMIN_REQUIRED")) throw new Error("You are not authorized to decide refunds.");
    console.error("Payment refund decision failed:", error);
    throw new Error("Unable to update this payment refund request.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.booking_id) throw new Error("Refund was updated, but its booking could not be refreshed.");
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: `payment.refund.${input.action}`,
    entityType: "booking",
    entityId: result.booking_id,
    summary: input.action === "approve"
      ? "Approved guest payment refund for manual processing."
      : input.action === "decline"
        ? "Declined guest payment refund request."
        : "Recorded guest payment refund as processed.",
    after: {
      refund_request_id: input.requestId,
      refund_status: result.refund_status,
      actual_refund_amount: input.actualAmount ?? null,
      transaction_reference: transactionReference || null,
      payment_marked_refunded: result.payment_marked_refunded,
      admin_response: response || null,
    },
  });
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/bookings/${result.booking_id}`);
  revalidatePath("/account/bookings");
  revalidatePath("/host/bookings");
}

async function decideRefund(input: {
  requestId: string;
  action: RefundAction;
  response?: string;
  actualAmount?: number;
  transactionReference?: string;
}) {
  const actor = await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw new Error("Invalid refund request.");
  }
  const response = String(input.response ?? "").trim();
  const transactionReference = String(input.transactionReference ?? "").trim();
  if (response.length > 1000 || transactionReference.length > 200) {
    throw new Error("Refund notes or reference exceed the allowed length.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_decide_cancellation_refund", {
    p_request_id: input.requestId,
    p_action: input.action,
    p_admin_response: response || null,
    p_actual_refund_amount: input.actualAmount ?? null,
    p_transaction_reference: transactionReference || null,
  });
  if (error) {
    if (error.message.includes("STAY_ALREADY_COMPLETED")) {
      throw new Error("Refunds are only eligible before the stay is completed.");
    }
    if (error.message.includes("REFUND_NOT_AWAITING_REVIEW")) throw new Error("This refund is no longer awaiting review.");
    if (error.message.includes("REFUND_NOT_APPROVED_FOR_PROCESSING")) throw new Error("Approve this refund before recording it as sent.");
    if (error.message.includes("REFUND_DECLINE_REASON_REQUIRED")) throw new Error("Add a reason before declining the refund.");
    if (error.message.includes("INVALID_ACTUAL_REFUND_AMOUNT")) throw new Error("Enter an amount greater than zero and no more than the approved refund amount.");
    if (error.message.includes("REFUND_REFERENCE_REQUIRED")) throw new Error("Enter the bank, M-Pesa, or provider transaction reference.");
    if (error.message.includes("REFUND_REQUEST_NOT_FOUND")) throw new Error("Refund request not found.");
    if (error.message.includes("CANCELLATION_NOT_APPROVED")) throw new Error("Approve the cancellation before reviewing its refund.");
    if (error.message.includes("ADMIN_REQUIRED")) throw new Error("You are not authorized to decide refunds.");
    console.error("Admin refund decision failed:", error);
    throw new Error("Unable to update this refund. Please try again.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.booking_id) throw new Error("Refund was updated, but its booking could not be refreshed.");

  const actionLabel = input.action === "approve"
    ? "Approved refund for manual processing."
    : input.action === "decline"
      ? "Declined guest refund request."
      : "Recorded guest refund as processed.";
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: `booking.refund.${input.action}`,
    entityType: "booking",
    entityId: result.booking_id,
    summary: actionLabel,
    after: {
      refund_request_id: input.requestId,
      refund_status: result.refund_status,
      actual_refund_amount: result.actual_refund,
      transaction_reference: transactionReference || null,
      payment_marked_refunded: result.payment_marked_refunded,
      admin_response: response || null,
    },
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${result.booking_id}`);
  revalidatePath("/admin/payouts");
  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${result.booking_id}`);
  revalidatePath("/host/bookings");
}

export async function approveCancellationRefund(requestId: string, note = "") {
  await decideRefund({ requestId, action: "approve", response: note });
}

export async function declineCancellationRefund(requestId: string, reason: string) {
  await decideRefund({ requestId, action: "decline", response: reason });
}

export async function recordCancellationRefundProcessed(
  requestId: string,
  actualAmount: number,
  transactionReference: string,
  note = "",
) {
  await decideRefund({
    requestId,
    action: "processed",
    actualAmount,
    transactionReference,
    response: note,
  });
}
