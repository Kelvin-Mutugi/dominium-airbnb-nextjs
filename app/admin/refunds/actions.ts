"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import { createClient } from "@/app/lib/supabase/server";

type RefundAction = "approve" | "decline" | "processed";

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
