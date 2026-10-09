"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { requestHostPayout } from "@/app/lib/host/actions";

export function RequestPayoutButton({
  amount,
  disabled,
  onRequested,
}: {
  amount: number;
  disabled?: boolean;
  onRequested: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const request = await requestHostPayout();
        setMessage(
          `Payout request for KES ${request.amount.toLocaleString("en-KE")} sent to the admin team.`,
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
    <div className="space-y-2">
      <button
        type="button"
        onClick={submit}
        disabled={disabled || pending || amount <= 0}
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
