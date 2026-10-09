"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/lib/admin-auth";
import { recordAdminAuditEvent } from "@/app/lib/admin-audit";
import {
  DarajaApiError,
  initiateDarajaB2CPayment,
  initiateDarajaB2CReversal,
} from "@/app/lib/payments/daraja";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refreshPayoutViews() {
  revalidatePath("/admin/payouts");
  revalidatePath("/admin/payouts/requests");
  revalidatePath("/host/payouts");
}

export async function claimHostPayoutRequest(requestId: string) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(requestId)) throw new Error("Invalid payout request.");
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("admin_claim_host_payout_request", {
    p_request_id: requestId,
    p_admin_id: actor.id,
  });
  if (error) {
    if (error.message.includes("PAYOUT_REQUEST_NOT_PENDING"))
      throw new Error(
        "Another admin has claimed this request or it has already been processed.",
      );
    console.error("Host payout request claim failed:", error);
    throw new Error("Unable to claim this payout request.");
  }
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.processing_started",
    entityType: "payout",
    entityId: requestId,
    summary: "Claimed a host withdrawal request for processing.",
  });
  refreshPayoutViews();
}

export async function initiateSafaricomHostPayout(input: {
  requestId: string;
  estimatedFee: number;
  idempotencyKey: string;
  detailsVerified: boolean;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(input.requestId))
    throw new Error("Invalid payout request.");
  if (
    !Number.isFinite(input.estimatedFee) ||
    input.estimatedFee < 0 ||
    !Number.isInteger(input.estimatedFee)
  ) {
    throw new Error("Enter the whole-KES B2C fee estimate.");
  }
  if (input.idempotencyKey.length < 32 || input.idempotencyKey.length > 128) {
    throw new Error("Refresh the payout request and try again.");
  }
  const note = String(input.note ?? "").trim();
  if (note.length > 1000 || input.detailsVerified !== true) {
    throw new Error(
      "Verify the destination and fee estimate, and keep the note under 1000 characters.",
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_prepare_daraja_host_payout", {
    p_request_id: input.requestId,
    p_admin_id: actor.id,
    p_estimated_fee: input.estimatedFee,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    if (error.message.includes("PAYOUT_REQUEST_NOT_PENDING"))
      throw new Error("This payout request is no longer pending.");
    if (error.code === "23505")
      throw new Error("A B2C request is already active for this payout.");
    if (error.message.includes("MPESA_DESTINATION_REQUIRED"))
      throw new Error("This host has no M-Pesa payout destination.");
    if (error.message.includes("INVALID_MPESA_DESTINATION"))
      throw new Error("The saved host M-Pesa number is invalid.");
    if (error.message.includes("INVALID_B2C_NET_AMOUNT"))
      throw new Error("The estimated fee leaves no valid whole-KES amount to send.");
    console.error("Unable to prepare Safaricom host payout:", error);
    throw new Error("Unable to prepare this Safaricom payout.");
  }

  const prepared = Array.isArray(data) ? data[0] : data;
  if (!prepared?.attempt_id) throw new Error("Unable to prepare this payout.");
  if (prepared.already_submitted) {
    refreshPayoutViews();
    return { processing: true, amount: Number(prepared.transfer_amount) };
  }

  let submission: Awaited<ReturnType<typeof initiateDarajaB2CPayment>> | null = null;
  try {
    submission = await initiateDarajaB2CPayment({
      amountKes: Number(prepared.transfer_amount),
      phone: prepared.phone_number,
      requestId: input.requestId,
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
      (initiationError instanceof DarajaApiError &&
        initiationError.requestMayHaveSucceeded) ||
      Boolean(submission);
    console.error("Safaricom B2C payout initiation failed:", {
      requestId: input.requestId,
      attemptId: prepared.attempt_id,
      conversationId: submission?.conversationId,
      originatorConversationId: submission?.originatorConversationId,
      error: initiationError,
    });
    if (uncertain) {
      if (submission) {
        await admin
          .from("daraja_b2c_attempts")
          .update({
            status: "reconciliation_required",
            conversation_id: submission.conversationId,
            originator_conversation_id: submission.originatorConversationId,
            response_payload: submission.rawResponse,
            result_description: "Safaricom accepted the request but local recording failed; reconcile before retry.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", prepared.attempt_id);
      } else {
        await admin.rpc("mark_daraja_b2c_reconciliation_required", {
          p_attempt_id: prepared.attempt_id,
          p_description: initiationError instanceof Error
            ? initiationError.message
            : "B2C request outcome is uncertain; reconcile before retry.",
          p_raw_response: {},
        });
      }
      refreshPayoutViews();
      return { processing: true, amount: Number(prepared.transfer_amount) };
    }

    await admin
      .from("daraja_b2c_attempts")
      .update({
        status: "failed",
        result_description:
          initiationError instanceof Error
            ? initiationError.message.slice(0, 500)
            : "Safaricom rejected the B2C request.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prepared.attempt_id)
      .eq("status", "initializing");
    throw new Error("Safaricom rejected the payout request. No transfer was recorded.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.safaricom_submitted",
    entityType: "payout",
    entityId: input.requestId,
    summary: `Submitted Safaricom B2C host payout of KES ${Number(prepared.transfer_amount).toFixed(0)}.`,
    after: {
      host_id: prepared.host_id,
      request_amount: Number(prepared.request_amount),
      net_amount: Number(prepared.transfer_amount),
      estimated_fee: input.estimatedFee,
      conversation_id: submission.conversationId,
      destination_and_fee_verified: input.detailsVerified,
      admin_note: note || null,
    },
  });
  refreshPayoutViews();
  return { processing: true, amount: Number(prepared.transfer_amount) };
}

export async function reconcileSafaricomHostPayoutFee(input: {
  attemptId: string;
  actualFee: number;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(input.attemptId)) throw new Error("Invalid B2C attempt.");
  if (!Number.isFinite(input.actualFee) || input.actualFee < 0) {
    throw new Error("Enter a valid actual Safaricom fee.");
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("reconcile_daraja_b2c_fee", {
    p_attempt_id: input.attemptId,
    p_actual_fee: input.actualFee,
    p_admin_id: actor.id,
    p_admin_note: String(input.note ?? "").trim() || null,
  });
  if (error) {
    if (error.message.includes("B2C_ATTEMPT_NOT_SUCCEEDED"))
      throw new Error("Only a successful B2C payout can have its actual fee reconciled.");
    console.error("Safaricom B2C fee reconciliation failed:", error);
    throw new Error("Unable to reconcile this Safaricom payout fee.");
  }
  const result = Array.isArray(data) ? data[0] : data;
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.safaricom_fee_reconciled",
    entityType: "payout",
    entityId: input.attemptId,
    summary: `Reconciled Safaricom B2C fee at KES ${input.actualFee.toFixed(2)}.`,
    after: {
      host_id: result?.host_id,
      actual_fee: input.actualFee,
      fee_difference: Number(result?.fee_difference ?? 0),
      host_fee_balance: Number(result?.host_fee_balance ?? 0),
    },
  });
  refreshPayoutViews();
}

export async function initiateSafaricomHostPayoutReversal(input: {
  requestId: string;
  reason: string;
  idempotencyKey: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(input.requestId)) throw new Error("Invalid payout request.");
  const reason = input.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    throw new Error("Enter a reversal reason between 5 and 500 characters.");
  }
  if (input.idempotencyKey.length < 32 || input.idempotencyKey.length > 128) {
    throw new Error("Refresh this payout request and try again.");
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_prepare_daraja_b2c_reversal", {
    p_request_id: input.requestId,
    p_admin_id: actor.id,
    p_reason: reason,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    if (error.message.includes("PAYOUT_NOT_PAID")) throw new Error("Only a paid host payout can be reversed.");
    if (error.message.includes("SUCCESSFUL_B2C_TRANSACTION_NOT_FOUND")) throw new Error("The original Safaricom B2C transaction could not be verified.");
    if (error.message.includes("PAYOUT_FEE_NOT_RECONCILED")) throw new Error("Reconcile the original transfer fee before initiating a reversal.");
    console.error("Unable to prepare Safaricom payout reversal:", error);
    throw new Error("Unable to prepare this Safaricom reversal.");
  }
  const prepared = Array.isArray(data) ? data[0] : data;
  if (!prepared?.reversal_id) throw new Error("Unable to prepare the reversal.");
  if (prepared.already_active) {
    refreshPayoutViews();
    return { processing: true, amount: Number(prepared.amount) };
  }

  let submission: Awaited<ReturnType<typeof initiateDarajaB2CReversal>> | null = null;
  try {
    submission = await initiateDarajaB2CReversal({
      amountKes: Number(prepared.amount),
      originalTransactionId: prepared.original_transaction_id,
      requestId: input.requestId,
      reason,
    });
    const { error: recordError } = await admin.rpc("record_daraja_b2c_reversal_submission", {
      p_reversal_id: prepared.reversal_id,
      p_conversation_id: submission.conversationId,
      p_originator_conversation_id: submission.originatorConversationId,
      p_raw_response: submission.rawResponse,
    });
    if (recordError) throw recordError;
  } catch (reversalError) {
    const uncertain =
      (reversalError instanceof DarajaApiError && reversalError.requestMayHaveSucceeded) ||
      Boolean(submission);
    console.error("Safaricom B2C reversal initiation failed:", {
      requestId: input.requestId,
      reversalId: prepared.reversal_id,
      conversationId: submission?.conversationId,
      originatorConversationId: submission?.originatorConversationId,
      error: reversalError,
    });
    if (uncertain) {
      if (submission) {
        await admin.from("daraja_b2c_reversals").update({
          status: "reconciliation_required",
          conversation_id: submission.conversationId,
          originator_conversation_id: submission.originatorConversationId,
          response_payload: submission.rawResponse,
          result_description: "Safaricom accepted the reversal but local recording failed; reconcile before retry.",
          updated_at: new Date().toISOString(),
        }).eq("id", prepared.reversal_id);
      } else {
        await admin.rpc("mark_daraja_b2c_reversal_reconciliation_required", {
          p_reversal_id: prepared.reversal_id,
          p_description: reversalError instanceof Error ? reversalError.message : "Reversal state is uncertain; reconcile before retry.",
          p_raw_response: {},
        });
      }
      refreshPayoutViews();
      return { processing: true, amount: Number(prepared.amount) };
    }
    await admin.from("daraja_b2c_reversals").update({
      status: "failed",
      result_description: reversalError instanceof Error ? reversalError.message.slice(0, 500) : "Safaricom rejected the reversal.",
      updated_at: new Date().toISOString(),
    }).eq("id", prepared.reversal_id).eq("status", "initializing");
    throw new Error("Safaricom rejected the reversal request. The payout remains paid.");
  }

  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.safaricom_reversal_submitted",
    entityType: "payout",
    entityId: input.requestId,
    summary: `Submitted Safaricom reversal for host payout ${input.requestId}.`,
    after: {
      reversal_id: prepared.reversal_id,
      original_transaction_id: prepared.original_transaction_id,
      amount: Number(prepared.amount),
      conversation_id: submission.conversationId,
      reason,
    },
  });
  refreshPayoutViews();
  return { processing: true, amount: Number(prepared.amount) };
}

export async function reconcileSafaricomPayoutReversalFee(input: {
  reversalId: string;
  actualFee: number;
  note?: string;
}) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(input.reversalId)) throw new Error("Invalid Safaricom reversal.");
  if (!Number.isFinite(input.actualFee) || input.actualFee < 0) throw new Error("Enter a valid actual reversal fee.");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("reconcile_daraja_b2c_reversal_fee", {
    p_reversal_id: input.reversalId,
    p_actual_fee: input.actualFee,
    p_admin_id: actor.id,
    p_admin_note: String(input.note ?? "").trim() || null,
  });
  if (error) {
    if (error.message.includes("B2C_REVERSAL_NOT_CONFIRMED")) throw new Error("Only a confirmed reversal can have its fee reconciled.");
    console.error("Safaricom reversal fee reconciliation failed:", error);
    throw new Error("Unable to reconcile the reversal fee.");
  }
  const result = Array.isArray(data) ? data[0] : data;
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.safaricom_reversal_fee_reconciled",
    entityType: "payout",
    entityId: input.reversalId,
    summary: `Reconciled Safaricom reversal fee of KES ${input.actualFee.toFixed(2)}.`,
    after: { host_id: result?.host_id, actual_fee: input.actualFee, host_fee_balance: Number(result?.host_fee_balance ?? 0) },
  });
  refreshPayoutViews();
}

export async function cancelHostPayoutRequest(
  requestId: string,
  reason: string,
  transferNotSentConfirmed: boolean,
) {
  const actor = await requireAdmin();
  if (!UUID_RE.test(requestId)) throw new Error("Invalid payout request.");
  const note = reason.trim();
  if (note.length < 5 || note.length > 1000)
    throw new Error("Add a cancellation reason between 5 and 1000 characters.");
  if (transferNotSentConfirmed !== true)
    throw new Error(
      "Confirm that no transfer is pending or successful before cancelling.",
    );

  const admin = getSupabaseAdmin();
  const { data: latestAttempt, error: attemptError } = await admin
    .from("daraja_b2c_attempts")
    .select("status")
    .eq("payout_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptError) throw new Error("Unable to confirm Safaricom transfer state.");
  if (
    latestAttempt &&
    !["failed"].includes(latestAttempt.status)
  ) {
    throw new Error(
      "This request has a submitted or uncertain Safaricom transfer. Reconcile its status before cancelling.",
    );
  }
  const { data, error } = await admin.rpc("admin_cancel_host_payout_request", {
    p_request_id: requestId,
    p_admin_id: actor.id,
    p_admin_note: note,
    p_transfer_not_sent_confirmed: transferNotSentConfirmed,
  });
  if (error) {
    if (error.message.includes("PAYOUT_REQUEST_NOT_PENDING"))
      throw new Error("Only a pending request can be cancelled.");
    if (error.message.includes("PAYOUT_TRANSFER_STATE_NOT_CONFIRMED"))
      throw new Error(
        "Confirm the Safaricom transfer was not sent before cancelling.",
      );
    console.error("Host payout cancellation failed:", error);
    throw new Error("Unable to cancel this payout request.");
  }
  const hostId = typeof data === "string" ? data : "";
  await recordAdminAuditEvent({
    actorId: actor.id,
    action: "host_payout.cancelled",
    entityType: "payout",
    entityId: requestId,
    summary: "Cancelled a host payout request before transfer.",
    after: { host_id: hostId, reason: note },
  });
  refreshPayoutViews();
}
