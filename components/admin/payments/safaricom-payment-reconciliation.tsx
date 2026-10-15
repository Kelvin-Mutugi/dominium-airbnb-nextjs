"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  reconcileSafaricomStkPayment,
  verifyDarajaStkPayment,
} from "@/app/admin/payouts/actions";
import { formatMoney } from "@/app/lib/format";

export function SafaricomPaymentReconciliation({
  paymentId,
  amount,
  phoneNumber,
  receiptFromSafaricom,
}: {
  paymentId: string;
  amount: number;
  phoneNumber: string;
  receiptFromSafaricom: string | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(
    receiptFromSafaricom ?? "",
  );
  const [transactionTime, setTransactionTime] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function verifyWithSafaricom() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await verifyDarajaStkPayment(paymentId);
        if (result.outcome === "settled") {
          setMessage(
            result.bookingConfirmed
              ? "Safaricom verified the payment. It has been settled and the booking confirmed."
              : "Safaricom verified the payment. It has been recorded as received, but the booking was not confirmed; review the refund workflow.",
          );
        } else {
          setMessage(result.description);
          if (result.outcome === "details_need_review") setIsOpen(true);
        }
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify this payment with Safaricom.",
        );
        router.refresh();
      }
    });
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reconcileSafaricomStkPayment({
          paymentId,
          receiptNumber,
          transactionTime,
          evidenceNote,
          verified,
        });
        setMessage(
          result.bookingConfirmed
            ? "Payment reconciled and booking confirmed."
            : "Payment recorded as received, but the booking was not confirmed. Review the late-payment refund/reconciliation workflow.",
        );
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to reconcile this payment.",
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={verifyWithSafaricom}
          className="rounded bg-[#1B1A2E] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Checking..." : "Verify with Safaricom"}
        </button>
        {!isOpen && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsOpen(true)}
            className="text-xs font-semibold text-[#CF2F74] hover:underline"
          >
            Manual verification
          </button>
        )}
      </div>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isPending) {
                setIsOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !isPending) setIsOpen(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`safaricom-reconciliation-title-${paymentId}`}
              className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto whitespace-normal rounded-xl border border-amber-200 bg-amber-50 p-5 text-left shadow-2xl sm:p-6"
            >
          <div className="mb-4 border-b border-amber-200 pb-3">
            <h2
              id={`safaricom-reconciliation-title-${paymentId}`}
              className="text-base font-semibold text-amber-950"
            >
              Manual Safaricom verification
            </h2>
            <p className="mt-1 text-xs leading-5 text-amber-900">
              Check the transaction in the Safaricom merchant portal or
              statement before posting. A guest receipt or screenshot alone
              isn&apos;t proof of payment.
            </p>
          </div>

          <dl className="mb-4 grid grid-cols-2 gap-3 rounded-md border border-amber-200/80 bg-white/70 p-3 text-xs">
            <div>
              <dt className="font-medium text-gray-500">Expected amount</dt>
              <dd className="mt-0.5 font-semibold text-gray-900">
                {formatMoney(amount)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Payer phone</dt>
              <dd className="mt-0.5 font-mono font-semibold text-gray-900">
                {phoneNumber}
              </dd>
            </div>
          </dl>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-700">
              M-PESA receipt number
              <input
                value={receiptNumber}
                onChange={(event) => setReceiptNumber(event.target.value)}
                maxLength={20}
                autoComplete="off"
                className="mt-1.5 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 font-mono text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Safaricom transaction date and time
              <span className="mt-0.5 block font-normal text-gray-500">
                Use East Africa Time (EAT).
              </span>
              <input
                type="datetime-local"
                value={transactionTime}
                onChange={(event) => setTransactionTime(event.target.value)}
                className="mt-1.5 block min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
            </label>
            <label className="block text-xs font-medium text-gray-700">
              Safaricom record checked
              <span className="mt-0.5 block font-normal text-gray-500">
                Note the statement date, portal reference, or other lookup detail.
              </span>
              <textarea
                value={evidenceNote}
                onChange={(event) => setEvidenceNote(event.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1.5 block w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20"
              />
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-md border border-amber-200 bg-white/70 p-3 text-xs leading-5 text-gray-700">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-amber-800"
            />
            <span>
              I independently matched the receipt, amount, and payer phone
              against Safaricom records.
            </span>
          </label>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-amber-200 pt-3">
            <button
              type="button"
              disabled={isPending}
              onClick={submit}
              className="min-h-10 rounded-md bg-amber-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Posting..." : "Post verified payment"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setIsOpen(false);
                setMessage("");
              }}
              className="min-h-10 rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
            </section>
          </div>,
          document.body,
        )}
      {message && (
        <p role="status" className="mt-2 max-w-[30rem] whitespace-normal text-xs font-medium leading-5 text-gray-800">
          {message}
        </p>
      )}
    </div>
  );
}
