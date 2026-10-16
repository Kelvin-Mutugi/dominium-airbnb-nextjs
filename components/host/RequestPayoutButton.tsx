"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { requestHostPayout } from "@/app/lib/host/actions";

export function RequestPayoutButton({
  amount,
  initialPhone,
  onRequested,
}: {
  amount: number;
  initialPhone: string;
  onRequested: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requestAmount, setRequestAmount] = useState(String(amount));
  const [mpesaNumber, setMpesaNumber] = useState(initialPhone);

  const numericAmount = Number(requestAmount);
  const isValidAmount =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= amount &&
    Number(numericAmount.toFixed(2)) === numericAmount;
  const phoneDigits = mpesaNumber.replace(/\D/g, "");
  const isValidPhone =
    /^0[17]\d{8}$/.test(phoneDigits) || /^254[17]\d{8}$/.test(phoneDigits);

  function submit() {
    setError(null);
    setMessage(null);
    if (!isValidAmount) {
      setError(`Enter an amount from KES 0.01 up to KES ${amount.toLocaleString("en-KE")}.`);
      return;
    }
    if (!isValidPhone) {
      setError("Enter a valid Kenyan M-Pesa number.");
      return;
    }
    startTransition(async () => {
      try {
        const request = await requestHostPayout({
          amount: numericAmount,
          mpesaNumber: mpesaNumber.trim(),
        });
        setMessage(
          `Your request for KES ${request.amount.toLocaleString("en-KE")} has been sent.`,
        );
        onRequested();
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to request a payout.",
        );
      }
    });
  }

  return (
    <div className="w-full max-w-sm space-y-3">
      <label className="block text-xs font-medium text-gray-700">
        Amount to request (KES)
        <input
          type="number"
          min="0.01"
          max={amount}
          step="0.01"
          value={requestAmount}
          onChange={(event) => setRequestAmount(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900"
          required
        />
      </label>
      <label className="block text-xs font-medium text-gray-700">
        M-Pesa number for this payout
        <input
          type="tel"
          inputMode="tel"
          value={mpesaNumber}
          onChange={(event) => setMpesaNumber(event.target.value)}
          placeholder="0712 345 678"
          className="mt-1 min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900"
          required
        />
        <span className="mt-1 block font-normal text-gray-500">
          This number is used for this payout only.
        </span>
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || !isValidAmount || amount <= 0}
        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#1B1A2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#302e49] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowDownToLine size={16} aria-hidden="true" />
        {pending ? "Sending request…" : "Request payout"}
      </button>
      {message && (
        <p role="status" className="text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
