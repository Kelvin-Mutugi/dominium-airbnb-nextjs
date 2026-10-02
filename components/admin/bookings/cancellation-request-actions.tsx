"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveCancellationRequest,
  declineCancellationRequest,
} from "@/app/admin/bookings/actions";

export function CancellationRequestActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [adminResponse, setAdminResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function approve() {
    if (!window.confirm(`Approve this cancellation? The booking will be cancelled. Any eligible refund will move to the separate Refunds queue for review; this action does not send money.`)) return;
    setError(null);
    setIsPending(true);
    try {
      await approveCancellationRequest(requestId);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to approve this cancellation.");
    } finally {
      setIsPending(false);
    }
  }

  async function decline() {
    if (!adminResponse.trim()) {
      setError("Add a reason before declining this cancellation request.");
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      await declineCancellationRequest(requestId, adminResponse);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to decline this cancellation.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-2 md:w-72 md:shrink-0">
      <label className="block text-xs font-medium text-gray-600" htmlFor={`decline-reason-${requestId}`}>
        Decline reason
        <textarea
          id={`decline-reason-${requestId}`}
          value={adminResponse}
          onChange={(event) => setAdminResponse(event.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/40"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => void decline()}
          className="min-h-10 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void approve()}
          className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Approve cancellation"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}