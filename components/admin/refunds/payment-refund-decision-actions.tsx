"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  decidePaymentRefundRequest,
  initiateSafaricomRefund,
  reconcileSafaricomB2CFee,
} from "@/app/admin/refunds/actions";

export function PaymentRefundDecisionActions({
  requestId,
  status,
  amountPaid,
  lastAttempt,
}: {
  requestId: string;
  status: string;
  amountPaid: number;
  lastAttempt: {
    id: string;
    status: string;
    amount: number | string;
    actual_fee: number | string | null;
    transaction_id: string | null;
  } | null;
}) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [actualAmount, setActualAmount] = useState(String(Math.floor(amountPaid)));
  const [actualFee, setActualFee] = useState("");
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: "approve" | "decline") {
    setError(null);
    setBusy(true);
    try {
      await decidePaymentRefundRequest({
        requestId,
        action,
        response,
      });
      router.refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to update this refund request.");
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
        refundKind: "guest_payment_refund",
        amount: Number(actualAmount),
        idempotencyKey: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
        note: response,
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
      await reconcileSafaricomB2CFee({ attemptId: lastAttempt.id, actualFee: Number(actualFee), note: response });
      router.refresh();
    } catch (feeError) {
      setError(feeError instanceof Error ? feeError.message : "Unable to reconcile fee.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "awaiting_admin_review") {
    return (
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <label htmlFor={`payment-refund-response-${requestId}`} className="block text-xs font-medium text-gray-600">
          Decision note <span className="font-normal">(required to decline)</span>
          <textarea
            id={`payment-refund-response-${requestId}`}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            maxLength={1000}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || !response.trim()} onClick={() => void run("decline")} className="min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">
            Decline
          </button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(`Approve refund review for up to KES ${amountPaid.toLocaleString("en-KE")} for manual processing? This does not transfer money.`)) void run("approve");
          }} className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Approve for processing"}
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
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <p className="text-sm font-semibold text-[#284c68]">{status === "processed" ? "Refund confirmed; reconcile the actual B2C fee." : "Approved; send the refund to the guest's booking phone via Safaricom B2C."}</p>
        {lastAttempt && <p className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">B2C status: <span className="font-semibold">{lastAttempt.status.replaceAll("_", " ")}</span>{lastAttempt.transaction_id ? ` · Transaction ${lastAttempt.transaction_id}` : ""}</p>}
        {(!lastAttempt || lastAttempt.status === "failed") && <>
          <label htmlFor={`payment-refund-amount-${requestId}`} className="block text-xs font-medium text-gray-600">
            Refund amount (whole KES, maximum {Math.floor(amountPaid).toLocaleString("en-KE")})
            <input id={`payment-refund-amount-${requestId}`} type="number" min="1" max={Math.floor(amountPaid)} step="1" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40" />
          </label>
          <button type="button" disabled={busy || !Number.isInteger(Number(actualAmount)) || Number(actualAmount) <= 0 || Number(actualAmount) > amountPaid} onClick={() => {
            if (window.confirm(`Send KES ${Number(actualAmount).toLocaleString("en-KE")} to the guest using Safaricom B2C?`)) void sendRefund();
          }} className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
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
        <label htmlFor={`payment-refund-processing-note-${requestId}`} className="block text-xs font-medium text-gray-600">
          Processing note <span className="font-normal">(optional)</span>
          <textarea id={`payment-refund-processing-note-${requestId}`} value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1000} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40" />
        </label>
        {processingMessage && <p role="status" className="text-sm text-emerald-800">{processingMessage}</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}