"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decidePaymentRefundRequest } from "@/app/admin/refunds/actions";

export function PaymentRefundDecisionActions({
  requestId,
  status,
  amountPaid,
}: {
  requestId: string;
  status: string;
  amountPaid: number;
}) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [actualAmount, setActualAmount] = useState(String(amountPaid));
  const [transactionReference, setTransactionReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: "approve" | "decline" | "processed") {
    setError(null);
    setBusy(true);
    try {
      await decidePaymentRefundRequest({
        requestId,
        action,
        response,
        actualAmount: action === "processed" ? Number(actualAmount) : undefined,
        transactionReference: action === "processed" ? transactionReference : undefined,
      });
      router.refresh();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Unable to update this refund request.");
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

  if (status === "awaiting_manual_processing") {
    return (
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <p className="text-sm font-semibold text-[#284c68]">Approved; record the refund after it is sent.</p>
        <label htmlFor={`payment-refund-amount-${requestId}`} className="block text-xs font-medium text-gray-600">
          Actual amount refunded (KES)
          <input id={`payment-refund-amount-${requestId}`} type="number" min="0.01" max={amountPaid} step="0.01" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40" />
        </label>
        <label htmlFor={`payment-refund-reference-${requestId}`} className="block text-xs font-medium text-gray-600">
          Transfer/provider reference
          <input id={`payment-refund-reference-${requestId}`} value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} maxLength={200} className="mt-1 block min-h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40" />
        </label>
        <label htmlFor={`payment-refund-processing-note-${requestId}`} className="block text-xs font-medium text-gray-600">
          Processing note <span className="font-normal">(optional)</span>
          <textarea id={`payment-refund-processing-note-${requestId}`} value={response} onChange={(event) => setResponse(event.target.value)} maxLength={1000} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40" />
        </label>
        <button type="button" disabled={busy || !Number(actualAmount) || !transactionReference.trim()} onClick={() => void run("processed")} className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Record refund sent"}
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}