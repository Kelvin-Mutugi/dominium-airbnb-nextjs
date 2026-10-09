"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, X } from "lucide-react";
import {
  cancelHostPayoutRequest,
  claimHostPayoutRequest,
  initiateSafaricomHostPayout,
  initiateSafaricomHostPayoutReversal,
  reconcileSafaricomHostPayoutFee,
  reconcileSafaricomPayoutReversalFee,
} from "@/app/admin/payouts/actions";

export function HostPayoutRequestActions({
  requestId,
  amount,
  destinationMethod,
  destinationDetails,
  status,
  processingBy,
  adminId,
  hostFeeBalance,
  lastAttempt,
  lastReversal,
}: {
  requestId: string;
  amount: number;
  destinationMethod: string;
  destinationDetails: Record<string, string>;
  status: string;
  processingBy: string | null;
  adminId: string;
  hostFeeBalance: number;
  lastAttempt: {
    id: string;
    status: string;
    amount: number | string;
    estimated_fee: number | string;
    actual_fee: number | string | null;
    transaction_id: string | null;
  } | null;
  lastReversal: {
    id: string;
    status: string;
    amount: number | string;
    actual_fee: number | string | null;
    original_transaction_id: string;
    reason: string;
  } | null;
}) {
  const router = useRouter();
  const [estimatedFee, setEstimatedFee] = useState("");
  const [actualFee, setActualFee] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [reversalFee, setReversalFee] = useState("");
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [transferNotSentConfirmed, setTransferNotSentConfirmed] =
    useState(false);
  const [showDestination, setShowDestination] = useState(false);
  const [detailsVerified, setDetailsVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const netAmount = Math.round(
    amount - hostFeeBalance - Number(estimatedFee || 0),
  );

  async function claimRequest() {
    setBusy(true);
    setError(null);
    try {
      await claimHostPayoutRequest(requestId);
      router.refresh();
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Unable to claim request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendB2C() {
    setError(null);
    if (
      estimatedFee === "" ||
      !Number.isInteger(Number(estimatedFee)) ||
      Number(estimatedFee) < 0 ||
      netAmount <= 0 ||
      !detailsVerified
    ) {
      setError(
        "Enter the whole-KES fee estimate, verify the destination, and check that the resulting amount is positive.",
      );
      return;
    }
    if (
      !window.confirm(
        `Send KES ${netAmount.toLocaleString("en-KE")} to the verified host M-Pesa number? Safaricom will process this B2C transfer asynchronously.`,
      )
    )
      return;
    setBusy(true);
    try {
      await initiateSafaricomHostPayout({
        requestId,
        estimatedFee: Number(estimatedFee),
        idempotencyKey: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
        detailsVerified,
        note,
      });
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to start Safaricom payout.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reconcileFee() {
    setError(null);
    if (!lastAttempt || actualFee === "" || Number(actualFee) < 0) {
      setError("Enter the actual Safaricom fee from your authoritative fee record.");
      return;
    }
    setBusy(true);
    try {
      await reconcileSafaricomHostPayoutFee({
        attemptId: lastAttempt.id,
        actualFee: Number(actualFee),
        note,
      });
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to reconcile Safaricom fee.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reverseB2C() {
    setError(null);
    if (reversalReason.trim().length < 5) {
      setError("Add a reversal reason between 5 and 500 characters.");
      return;
    }
    if (!window.confirm(`Request Safaricom reversal of KES ${Number(lastAttempt?.amount ?? 0).toLocaleString("en-KE")} for transaction ${lastAttempt?.transaction_id}? The payout ledger changes only after Safaricom confirms the reversal.`)) return;
    setBusy(true);
    try {
      await initiateSafaricomHostPayoutReversal({
        requestId,
        reason: reversalReason,
        idempotencyKey: `${crypto.randomUUID()}-${crypto.randomUUID()}`,
      });
      router.refresh();
    } catch (reversalError) {
      setError(reversalError instanceof Error ? reversalError.message : "Unable to initiate Safaricom reversal.");
    } finally {
      setBusy(false);
    }
  }

  async function reconcileReversalFee() {
    if (!lastReversal || reversalFee === "") return;
    setError(null);
    setBusy(true);
    try {
      await reconcileSafaricomPayoutReversalFee({
        reversalId: lastReversal.id,
        actualFee: Number(reversalFee),
        note,
      });
      router.refresh();
    } catch (feeError) {
      setError(feeError instanceof Error ? feeError.message : "Unable to reconcile reversal fee.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setError(null);
    if (cancelReason.trim().length < 5 || !transferNotSentConfirmed) {
      setError(
        "Add a reason and confirm that no transfer is pending or successful.",
      );
      return;
    }
    setBusy(true);
    try {
      await cancelHostPayoutRequest(
        requestId,
        cancelReason,
        transferNotSentConfirmed,
      );
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to cancel request.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "requested") {
    return (
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <p className="text-sm text-gray-600">
          Claim this request before sending a transfer. Only the assigned admin
          can finish or cancel it.
        </p>
        <button
          type="button"
          onClick={() => void claimRequest()}
          disabled={busy}
          className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Claiming…" : "Claim for processing"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (status === "processing" && processingBy !== adminId) {
    return (
      <p className="border-t border-gray-200 pt-3 text-sm text-amber-800">
        This request is being processed by another admin.
      </p>
    );
  }

  const isAwaitingFeeReconciliation =
    status === "paid" && lastAttempt?.status === "succeeded" && lastAttempt.actual_fee == null;
  const canInitiateReversal =
    status === "paid" &&
    lastAttempt?.status === "succeeded" &&
    lastAttempt.actual_fee != null &&
    (!lastReversal || lastReversal.status === "failed");
  const reversalIsUncertain = lastReversal?.status === "reconciliation_required";
  const reversalIsSubmitted = lastReversal?.status === "submitted" || lastReversal?.status === "initializing";
  const isAwaitingReversalFee =
    status === "reversed" && lastReversal?.status === "reversed" && lastReversal.actual_fee == null;
  const canInitiate =
    status === "processing" &&
    (!lastAttempt || lastAttempt.status === "failed");
  if (
    status !== "processing" &&
    !isAwaitingFeeReconciliation &&
    !canInitiateReversal &&
    !reversalIsUncertain &&
    !reversalIsSubmitted &&
    !isAwaitingReversalFee
  ) return null;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDestination((current) => !current)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
        >
          {showDestination
            ? "Hide payout destination"
            : "Show payout destination"}
        </button>
        <span className="text-xs text-gray-500">
          {destinationMethod === "mpesa" ? "M-Pesa" : "Bank transfer"}
        </span>
      </div>
      {showDestination && (
        <dl className="grid gap-2 rounded-md bg-gray-50 p-3 text-xs sm:grid-cols-2">
          {Object.entries(destinationDetails).map(([key, value]) => (
            <div key={key}>
              <dt className="text-gray-500">{key.replaceAll("_", " ")}</dt>
              <dd className="break-all font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs leading-5 text-amber-900">
        Safaricom sends this payout directly to the saved M-Pesa number. The
        request remains reserved until Safaricom returns a result. Estimate the
        fee from the authoritative tariff source; actual fee variance adjusts
        the host&apos;s signed balance for future payouts.
      </p>
      {canInitiate && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-600">
            Estimated B2C fee (whole KES)
            <input
              type="number"
              min="0"
              step="1"
              value={estimatedFee}
              onChange={(event) => setEstimatedFee(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900"
            />
          </label>
          <div className="text-xs font-medium text-gray-600">
            Estimated amount to host
            <p className="mt-1 min-h-10 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
              KES {Math.max(netAmount, 0).toLocaleString("en-KE")}
            </p>
          </div>
        </div>
      )}
      {lastAttempt && (
        <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
          <p className="font-semibold capitalize">Safaricom status: {lastAttempt.status.replaceAll("_", " ")}</p>
          <p className="mt-1">B2C amount: KES {Number(lastAttempt.amount).toLocaleString("en-KE")}</p>
          {lastAttempt.transaction_id && <p className="mt-1">Safaricom transaction: {lastAttempt.transaction_id}</p>}
          {lastAttempt.status === "reconciliation_required" && (
            <p className="mt-1 font-medium text-amber-900">Do not retry or cancel until the transfer state is confirmed with Safaricom.</p>
          )}
          {lastAttempt.status === "submitted" && (
            <p className="mt-1">Waiting for the Safaricom result callback. Keep this request reserved.</p>
          )}
        </div>
      )}
      {isAwaitingFeeReconciliation && lastAttempt && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-gray-600">
            Actual B2C fee (KES)
            <input
              type="number"
              min="0"
              step="0.01"
              value={actualFee}
              onChange={(event) => setActualFee(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900"
            />
          </label>
          <button
            type="button"
            onClick={() => void reconcileFee()}
            disabled={busy || actualFee === ""}
            className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Reconcile actual fee"}
          </button>
        </div>
      )}
      {canInitiateReversal && lastAttempt && (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-950">Reverse a successful payout</p>
          <p className="text-xs leading-5 text-amber-900">Only initiate this when a reversal is authorized and the original Safaricom transaction should be returned. The host payout remains paid until Safaricom confirms.</p>
          <label className="block text-xs font-medium text-gray-700">
            Reversal reason
            <input value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} maxLength={500} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900" />
          </label>
          <button type="button" onClick={() => void reverseB2C()} disabled={busy || reversalReason.trim().length < 5} className="min-h-10 rounded-md border border-amber-800 px-3 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50">
            {busy ? "Submitting…" : "Request Safaricom reversal"}
          </button>
        </div>
      )}
      {lastReversal && (reversalIsSubmitted || reversalIsUncertain) && (
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">Safaricom reversal: {lastReversal.status.replaceAll("_", " ")}</p>
          <p className="mt-1">Original transaction {lastReversal.original_transaction_id} · KES {Number(lastReversal.amount).toLocaleString("en-KE")}</p>
          {reversalIsSubmitted && <p className="mt-1">Waiting for Safaricom confirmation. The payout remains paid until the callback succeeds.</p>}
          {reversalIsUncertain && <p className="mt-1 font-semibold">Do not retry. Reconcile the reversal result with Safaricom first.</p>}
        </div>
      )}
      {isAwaitingReversalFee && lastReversal && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-gray-600">
            Actual reversal fee (KES)
            <input type="number" min="0" step="0.01" value={reversalFee} onChange={(event) => setReversalFee(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900" />
          </label>
          <button type="button" onClick={() => void reconcileReversalFee()} disabled={busy || reversalFee === ""} className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Reconcile reversal fee"}
          </button>
        </div>
      )}
      <label className="block text-xs font-medium text-gray-600">
        Admin note
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-gray-700">
        <input
          type="checkbox"
          checked={detailsVerified}
          onChange={(event) => setDetailsVerified(event.target.checked)}
          className="mt-1 accent-[#1769AA]"
        />
        I verified the host destination and fee estimate against the approved
        Safaricom B2C tariff.
      </label>
      <div className="flex flex-wrap gap-2">
        {canInitiate && (
          <button
            type="button"
            onClick={() => void sendB2C()}
            disabled={busy || estimatedFee === "" || !detailsVerified || netAmount <= 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Banknote size={15} aria-hidden="true" />
            {busy ? "Sending…" : "Send B2C payout"}
          </button>
        )}
        {status === "processing" && (!lastAttempt || lastAttempt.status === "failed") && (
          <button
            type="button"
            onClick={() => void cancelRequest()}
            disabled={
              busy || cancelReason.trim().length < 5 || !transferNotSentConfirmed
            }
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <X size={15} aria-hidden="true" />
            Cancel request
          </button>
        )}
      </div>
      <label className="block text-xs font-medium text-gray-600">
        Cancellation reason
        <input
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          maxLength={1000}
          className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900"
        />
      </label>
      <label className="flex items-start gap-2 text-xs leading-5 text-gray-700">
        <input
          type="checkbox"
          checked={transferNotSentConfirmed}
          onChange={(event) =>
            setTransferNotSentConfirmed(event.target.checked)
          }
          className="mt-1 accent-[#1769AA]"
        />
        I confirmed no Safaricom transfer is pending or successful for this request.
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
