"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveCancellationRefund,
  declineCancellationRefund,
  initiateSafaricomRefund,
  reconcileSafaricomB2CFee,
} from "@/app/admin/refunds/actions";

export function RefundDecisionActions({
  requestId,
  status,
  estimatedAmount,
  maxRefundAmount,
  lastAttempt,
}: {
  requestId: string;
  status: string;
  estimatedAmount: number;
  maxRefundAmount: number;
  lastAttempt: {
    id: string;
    status: string;
    amount: number | string;
    actual_fee: number | string | null;
    transaction_id: string | null;
  } | null;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [actualAmount, setActualAmount] = useState(String(Math.floor(estimatedAmount)));
  const [actualFee, setActualFee] = useState("");
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update this refund.");
    } finally {
      setBusy(false);
    }
  }

  async function sendRefund() {
    setError(null);
    setBusy(true);
    try {
      const result = await initiateSafaricomRefund({
        requestId,
        refundKind: "cancellation_refund",
        amount: Number(actualAmount),
        idempotencyKey: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
        note,
      });
      setProcessingMessage(`Safaricom B2C refund of KES ${result.amount.toLocaleString("en-KE")} is processing. It will be recorded only after the result callback.`);
      router.refresh();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to initiate refund.");
    } finally {
      setBusy(false);
    }
  }

  async function reconcileFee() {
    if (!lastAttempt || actualFee === "") return;
    setError(null);
    setBusy(true);
    try {
      await reconcileSafaricomB2CFee({ attemptId: lastAttempt.id, actualFee: Number(actualFee), note });
      router.refresh();
    } catch (feeError) {
      setError(feeError instanceof Error ? feeError.message : "Unable to reconcile fee.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "awaiting_admin_review") {
    return (
      <div className="min-w-0 space-y-3 border-t border-gray-200 pt-3 md:w-80 md:shrink-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <label className="block text-xs font-medium text-gray-600" htmlFor={`refund-decision-note-${requestId}`}>
          Decision note <span className="font-normal">(required to decline)</span>
          <textarea
            id={`refund-decision-note-${requestId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={1000}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => void run(() => declineCancellationRefund(requestId, reason))}
            className="min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Decline refund
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Approve a refund up to KES ${estimatedAmount.toLocaleString("en-KE")} for manual processing? No money is transferred by this approval.`)) return;
              void run(() => approveCancellationRefund(requestId, reason));
            }}
            className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Approve refund"}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  if (
    status === "awaiting_manual_processing" ||
    (status === "processed" && lastAttempt?.status === "succeeded" && lastAttempt.actual_fee == null)
  ) {
    return (
      <div className="min-w-0 space-y-3 border-t border-gray-200 pt-3 md:w-80 md:shrink-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <p className="text-sm font-semibold text-[#284c68]">{status === "processed" ? "Refund confirmed; reconcile the actual B2C fee." : "Approved; send the refund to the guest's booking phone via Safaricom B2C."}</p>
        {lastAttempt && <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">B2C status: <span className="font-semibold">{lastAttempt.status.replaceAll("_", " ")}</span>{lastAttempt.transaction_id ? ` · Transaction ${lastAttempt.transaction_id}` : ""}</p>}
        {(!lastAttempt || lastAttempt.status === "failed") && <>
          <label className="block text-xs font-medium text-gray-600" htmlFor={`refund-actual-${requestId}`}>
            Refund amount (whole KES, maximum {Math.floor(maxRefundAmount).toLocaleString("en-KE")})
            <input
              id={`refund-actual-${requestId}`}
              type="number"
              min="1"
              max={Math.floor(maxRefundAmount)}
              step="1"
              value={actualAmount}
              onChange={(event) => setActualAmount(event.target.value)}
              className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23A85]/40"
            />
          </label>
          <button
            type="button"
            disabled={busy || !Number.isInteger(Number(actualAmount)) || Number(actualAmount) <= 0 || Number(actualAmount) > maxRefundAmount}
            onClick={() => {
              if (window.confirm(`Send KES ${Number(actualAmount).toLocaleString("en-KE")} to the guest using Safaricom B2C?`)) void sendRefund();
            }}
            className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send refund via M-Pesa"}
          </button>
        </>}
        {lastAttempt?.status === "reconciliation_required" && <p className="text-xs font-medium text-amber-900">Do not retry; reconcile the transfer with Safaricom first.</p>}
        {lastAttempt?.status === "submitted" && <p className="text-xs text-gray-600">Waiting for the Safaricom result callback. The refund is not yet marked processed.</p>}
        {lastAttempt?.status === "succeeded" && lastAttempt.actual_fee == null && <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-gray-600">Actual B2C fee (KES)
            <input type="number" min="0" step="0.01" value={actualFee} onChange={(event) => setActualFee(event.target.value)} className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900" />
          </label>
          <button type="button" disabled={busy || actualFee === ""} onClick={() => void reconcileFee()} className="min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">{busy ? "Saving…" : "Reconcile host fee"}</button>
        </div>}
        {lastAttempt?.status === "succeeded" && lastAttempt.actual_fee != null && <p className="text-sm text-emerald-800">Safaricom confirmed the refund; the actual fee has been reconciled to the host balance.</p>}
        <label className="block text-xs font-medium text-gray-600" htmlFor={`refund-note-${requestId}`}>
          Processing note <span className="font-normal">(optional)</span>
          <textarea
            id={`refund-note-${requestId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          />
        </label>
        {processingMessage && <p role="status" className="text-sm text-emerald-800">{processingMessage}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}
