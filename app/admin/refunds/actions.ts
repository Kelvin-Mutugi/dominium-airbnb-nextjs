"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { createClient } from "@/app/lib/supabase/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";
import {
  DarajaApiError,
  initiateDarajaB2CPayment,
} from "@/app/lib/payments/daraja";

type RefundAction = "approve" | "decline";
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
}) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(input.requestId)) throw new Error("Invalid refund request.");
  if (!["approve", "decline"].includes(input.action)) throw new Error("Invalid refund decision.");
  const response = String(input.response ?? "").trim();
  if (response.length > 1000) {
    throw new Error("Refund note exceeds the allowed length.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_decide_payment_refund_request", {
    p_request_id: input.requestId,
    p_action: input.action,
    p_admin_response: response || null,
    p_actual_refund_amount: null,
    p_transaction_reference: null,
  });
  if (error) {
    if (error.message.includes("STAY_ALREADY_COMPLETED")) {
      throw new Error("Refunds are only eligible before the stay is completed.");
    }
    if (error.message.includes("REFUND_NOT_AWAITING_REVIEW")) throw new Error("This refund is no longer awaiting review.");
    if (error.message.includes("REFUND_DECLINE_REASON_REQUIRED")) throw new Error("Add a reason before declining the refund.");
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
      ? "Approved guest payment refund for Safaricom B2C processing."
      : "Declined guest payment refund request.",
    after: {
      refund_request_id: input.requestId,
      refund_status: result.refund_status,
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
}) {
  const actor = await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) {
    throw new Error("Invalid refund request.");
  }
  const response = String(input.response ?? "").trim();
  if (response.length > 1000) {
    throw new Error("Refund note exceeds the allowed length.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_decide_cancellation_refund", {
    p_request_id: input.requestId,
    p_action: input.action,
    p_admin_response: response || null,
    p_actual_refund_amount: null,
    p_transaction_reference: null,
  });
  if (error) {
    if (error.message.includes("STAY_ALREADY_COMPLETED")) {
      throw new Error("Refunds are only eligible before the stay is completed.");
    }
    if (error.message.includes("REFUND_NOT_AWAITING_REVIEW")) throw new Error("This refund is no longer awaiting review.");
    if (error.message.includes("REFUND_DECLINE_REASON_REQUIRED")) throw new Error("Add a reason before declining the refund.");
    if (error.message.includes("REFUND_REQUEST_NOT_FOUND")) throw new Error("Refund request not found.");
    if (error.message.includes("CANCELLATION_NOT_APPROVED")) throw new Error("Approve the cancellation before reviewing its refund.");
    if (error.message.includes("ADMIN_REQUIRED")) throw new Error("You are not authorized to decide refunds.");
    console.error("Admin refund decision failed:", error);
    throw new Error("Unable to update this refund. Please try again.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.booking_id) throw new Error("Refund was updated, but its booking could not be refreshed.");

  const actionLabel = input.action === "approve"
    ? "Approved refund for Safaricom B2C processing."
    : "Declined guest refund request.";
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: `booking.refund.${input.action}`,
    entityType: "booking",
    entityId: result.booking_id,
    summary: actionLabel,
    after: {
      refund_request_id: input.requestId,
      refund_status: result.refund_status,
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

export async function initiateSafaricomRefund(input: {
  requestId: string;
  refundKind: "guest_payment_refund" | "cancellation_refund";
  amount: number;
  idempotencyKey: string;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(input.requestId)) throw new Error("Invalid refund request.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a refund amount above zero.");
  if (input.idempotencyKey.length < 32 || input.idempotencyKey.length > 128) {
    throw new Error("Refresh this refund request and try again.");
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_prepare_daraja_refund", {
    p_refund_kind: input.refundKind,
    p_request_id: input.requestId,
    p_admin_id: actor.id,
    p_amount: input.amount,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    if (error.message.includes("REFUND_NOT_APPROVED_FOR_PROCESSING")) throw new Error("Approve this refund before sending it.");
    if (error.message.includes("STAY_ALREADY_COMPLETED")) throw new Error("Refunds are unavailable after the stay is completed.");
    if (error.message.includes("INVALID_GUEST_MPESA_PHONE")) throw new Error("The guest booking has no valid Kenyan M-Pesa number.");
    if (error.message.includes("REFUND_AMOUNT_BELOW_ONE_KES")) throw new Error("The refund must be at least KES 1 because Safaricom sends whole-KES amounts.");
    console.error("Unable to prepare Safaricom refund:", error);
    throw new Error("Unable to prepare this Safaricom refund.");
  }
  const prepared = Array.isArray(data) ? data[0] : data;
  if (!prepared?.attempt_id) throw new Error("Unable to prepare this refund.");
  if (prepared.already_active) return { processing: true, amount: Number(prepared.transfer_amount) };

  let submission: Awaited<ReturnType<typeof initiateDarajaB2CPayment>> | null = null;
  try {
    submission = await initiateDarajaB2CPayment({
      amountKes: Number(prepared.transfer_amount),
      phone: prepared.phone_number,
      requestId: input.requestId,
      purpose: "guest_refund",
    });
    const { error: recordError } = await admin.rpc("record_daraja_b2c_submission", {
      p_attempt_id: prepared.attempt_id,
      p_conversation_id: submission.conversationId,
      p_originator_conversation_id: submission.originatorConversationId,
      p_raw_response: submission.rawResponse,
    });
    if (recordError) throw recordError;
  } catch (initiationError) {
    const uncertain =
      (initiationError instanceof DarajaApiError && initiationError.requestMayHaveSucceeded) ||
      Boolean(submission);
    console.error("Safaricom refund initiation failed:", {
      requestId: input.requestId,
      attemptId: prepared.attempt_id,
      conversationId: submission?.conversationId,
      originatorConversationId: submission?.originatorConversationId,
      error: initiationError,
    });
    if (uncertain) {
      if (submission) {
        await admin.from("daraja_b2c_attempts").update({
          status: "reconciliation_required",
          conversation_id: submission.conversationId,
          originator_conversation_id: submission.originatorConversationId,
          response_payload: submission.rawResponse,
          result_description: "Safaricom accepted the refund request but local recording failed; reconcile before retry.",
          updated_at: new Date().toISOString(),
        }).eq("id", prepared.attempt_id);
      } else {
        await admin.rpc("mark_daraja_b2c_reconciliation_required", {
          p_attempt_id: prepared.attempt_id,
          p_description: initiationError instanceof Error ? initiationError.message : "Refund outcome is uncertain; reconcile before retry.",
          p_raw_response: {},
        });
      }
      return { processing: true, amount: Number(prepared.transfer_amount) };
    }
    await admin.from("daraja_b2c_attempts").update({
      status: "failed",
      result_description: initiationError instanceof Error ? initiationError.message.slice(0, 500) : "Safaricom rejected the refund.",
      updated_at: new Date().toISOString(),
    }).eq("id", prepared.attempt_id).eq("status", "initializing");
    throw new Error("Safaricom rejected the refund request. No refund was recorded as sent.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "guest_refund.safaricom_submitted",
    entityType: "booking",
    entityId: prepared.booking_id,
    summary: `Submitted Safaricom B2C refund of KES ${Number(prepared.transfer_amount).toFixed(0)}.`,
    after: {
      refund_request_id: input.requestId,
      refund_kind: input.refundKind,
      amount: Number(prepared.transfer_amount),
      conversation_id: submission.conversationId,
      note: String(input.note ?? "").trim() || null,
    },
  });
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/bookings/${prepared.booking_id}`);
  revalidatePath("/account/bookings");
  return { processing: true, amount: Number(prepared.transfer_amount) };
}

export async function reconcileSafaricomB2CFee(input: {
  attemptId: string;
  actualFee: number;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(input.attemptId)) throw new Error("Invalid B2C attempt.");
  if (!Number.isFinite(input.actualFee) || input.actualFee < 0) throw new Error("Enter a valid actual Safaricom fee.");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("reconcile_daraja_b2c_fee", {
    p_attempt_id: input.attemptId,
    p_actual_fee: input.actualFee,
    p_admin_id: actor.id,
    p_admin_note: String(input.note ?? "").trim() || null,
  });
  if (error) {
    if (error.message.includes("B2C_ATTEMPT_NOT_SUCCEEDED")) throw new Error("Only a successful B2C transfer can be fee-reconciled.");
    console.error("Safaricom fee reconciliation failed:", error);
    throw new Error("Unable to reconcile the Safaricom fee.");
  }
  const result = Array.isArray(data) ? data[0] : data;
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "safaricom.b2c_fee_reconciled",
    entityType: "booking",
    entityId: input.attemptId,
    summary: `Recorded Safaricom B2C fee of KES ${input.actualFee.toFixed(2)}.`,
    after: { host_id: result?.host_id, actual_fee: input.actualFee, host_fee_balance: Number(result?.host_fee_balance ?? 0) },
  });
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payouts/requests");
  revalidatePath("/host/payouts");
}

export async function reconcileSafaricomCollectionFee(input: {
  attemptId: string;
  actualFee: number;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_PATTERN.test(input.attemptId)) throw new Error("Invalid STK payment attempt.");
  if (!Number.isFinite(input.actualFee) || input.actualFee < 0) throw new Error("Enter a valid actual collection fee.");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("reconcile_daraja_collection_fee", {
    p_attempt_id: input.attemptId,
    p_actual_fee: input.actualFee,
    p_admin_id: actor.id,
    p_admin_note: String(input.note ?? "").trim() || null,
  });
  if (error) {
    if (error.message.includes("DARAJA_PAYMENT_NOT_SUCCESSFUL")) throw new Error("Only a successful STK payment can be reconciled.");
    console.error("Safaricom collection fee reconciliation failed:", error);
    throw new Error("Unable to reconcile this collection fee.");
  }
  const result = Array.isArray(data) ? data[0] : data;
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "safaricom.stk_fee_reconciled",
    entityType: "booking",
    entityId: result?.booking_id ?? input.attemptId,
    summary: `Recorded Safaricom STK fee of KES ${input.actualFee.toFixed(2)}.`,
    after: { host_id: result?.host_id, actual_fee: input.actualFee, host_fee_balance: Number(result?.host_fee_balance ?? 0) },
  });
  revalidatePath("/admin/payouts/fees");
  revalidatePath("/host/payouts");
  revalidatePath("/admin/bookings");
}
