"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { reconcileSafaricomCollectionFee } from "@/app/admin/refunds/actions";

export function CollectionFeeReconciliation({
  attemptId,
  bookingId,
  amount,
  bookingReference,
  guestName,
  receipt,
}: {
  attemptId: string;
  bookingId: string;
  amount: number;
  bookingReference: string;
  guestName: string;
  receipt: string | null;
}) {
  const router = useRouter();
  const [actualFee, setActualFee] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reconcile() {
    if (actualFee === "" || !Number.isFinite(Number(actualFee)) || Number(actualFee) < 0) {
      setError("Enter the actual non-negative Safaricom fee.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reconcileSafaricomCollectionFee({
        attemptId,
        actualFee: Number(actualFee),
        note,
      });
      router.refresh();
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Unable to reconcile this fee.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="grid gap-4 border-b border-gray-200 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <h2 className="font-semibold text-[#1B1A2E]">
          <Link href={`/admin/bookings/${bookingId}`} className="underline underline-offset-2">{bookingReference}</Link>
        </h2>
        <p className="mt-1 text-sm text-gray-600">{guestName} · Guest paid KES {amount.toLocaleString("en-KE")}</p>
        <p className="mt-1 text-xs text-gray-500">M-Pesa receipt: {receipt ?? "not recorded"} · Attempt {attemptId}</p>
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Actual STK fee (KES)
          <input type="number" min="0" step="0.01" value={actualFee} onChange={(event) => setActualFee(event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900" />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Reconciliation note
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900" />
        </label>
        <button type="button" onClick={() => void reconcile()} disabled={busy || actualFee === ""} className="min-h-10 rounded-md bg-[#1B1A2E] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Reconcile collection fee"}
        </button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
      <p className="text-xs leading-5 text-gray-500 lg:col-span-2">
        Use the actual fee from Safaricom&apos;s authoritative transaction statement. The amount is added to the host&apos;s signed fee balance and blocks withdrawal until reconciliation.
      </p>
    </article>
  );
}