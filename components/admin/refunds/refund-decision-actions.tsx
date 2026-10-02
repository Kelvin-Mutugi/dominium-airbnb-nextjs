"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveCancellationRefund,
  declineCancellationRefund,
  recordCancellationRefundProcessed,
} from "@/app/admin/refunds/actions";

export function RefundDecisionActions({
  requestId,
  status,
  estimatedAmount,
  maxRefundAmount,
}: {
  requestId: string;
  status: string;
  estimatedAmount: number;
  maxRefundAmount: number;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [actualAmount, setActualAmount] = useState(String(estimatedAmount));
  const [transactionReference, setTransactionReference] = useState("");
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

  if (status === "awaiting_manual_processing") {
    return (
      <div className="min-w-0 space-y-3 border-t border-gray-200 pt-3 md:w-80 md:shrink-0 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <p className="text-sm font-semibold text-[#284c68]">Approved; record the refund after it is actually sent.</p>
        <label className="block text-xs font-medium text-gray-600" htmlFor={`refund-actual-${requestId}`}>
          Actual amount refunded (KES)
          <input
            id={`refund-actual-${requestId}`}
            type="number"
            min="0.01"
            max={maxRefundAmount}
            step="0.01"
            value={actualAmount}
            onChange={(event) => setActualAmount(event.target.value)}
            className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          />
        </label>
        <label className="block text-xs font-medium text-gray-600" htmlFor={`refund-reference-${requestId}`}>
          Transfer/provider reference
          <input
            id={`refund-reference-${requestId}`}
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
            maxLength={200}
            className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
          />
        </label>
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
        <button
          type="button"
          disabled={busy || !Number(actualAmount) || !transactionReference.trim()}
          onClick={() => void run(() => recordCancellationRefundProcessed(requestId, Number(actualAmount), transactionReference, note))}
          className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Record refund sent"}
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}
