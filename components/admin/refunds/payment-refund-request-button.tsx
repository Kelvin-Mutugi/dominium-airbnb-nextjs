"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createPaymentRefundRequest } from "@/app/admin/refunds/actions";

export function PaymentRefundRequestButton({
  paymentId,
  requestStatus,
}: {
  paymentId: string;
  requestStatus?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || reason.trim().length < 5) return;
    setError(null);
    startTransition(async () => {
      try {
        await createPaymentRefundRequest(paymentId, reason);
        setReason("");
        setIsOpen(false);
        router.refresh();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to request refund review.");
      }
    });
  }

  if (requestStatus) {
    const statusLabel: Record<string, string> = {
      awaiting_admin_review: "Refund review requested",
      awaiting_manual_processing: "Refund approved for processing",
      declined: "Refund request declined",
      processed: "Refund processed",
    };
    return <span className="text-xs font-medium text-gray-600">{statusLabel[requestStatus] ?? "Refund request recorded"}</span>;
  }

  return (
    <div className="min-w-36">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="min-h-9 rounded-md border border-[#D9D5CF] bg-white px-3 py-1.5 text-xs font-semibold text-[#9C2454] transition-colors hover:bg-[#FDF0F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85]"
        >
          Request refund
        </button>
      ) : (
        <form onSubmit={submit} className="min-w-56 space-y-2">
          <label htmlFor={`refund-reason-${paymentId}`} className="block text-xs font-medium text-gray-700">
            Reason for review
            <textarea
              id={`refund-reason-${paymentId}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              minLength={5}
              rows={2}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs text-gray-900 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20"
              placeholder="Why should this payment be reviewed?"
            />
          </label>
          {error && <p role="alert" className="max-w-56 text-xs text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setIsOpen(false); setError(null); }} className="min-h-8 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={pending || reason.trim().length < 5} className="min-h-8 rounded-md bg-[#1B1A2E] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
              {pending ? "Sending…" : "Send for review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}