"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";

  const [status, setStatus] = useState<
    "checking" | "success" | "pending" | "failed"
  >("checking");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setError("No payment reference was returned by Paystack.");
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await fetch("/api/payments/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (cancelled) return;

        setBookingId(result.bookingId ?? null);

        if (response.ok && result.success) {
          setStatus("success");
          return;
        }

        if (
          result.status === "pending" ||
          result.status === "ongoing" ||
          result.status === "processing"
        ) {
          setStatus("pending");
          return;
        }

        setStatus("failed");
        setError(result.error ?? "The payment was not completed.");
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setError(
            "We couldn't verify the payment. Please contact support with your payment reference.",
          );
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-16">
      <div className="mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {status === "checking" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#E23E85]">
              Payment
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
              Verifying your payment...
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we confirm the transaction with Paystack.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              ✓ Payment confirmed
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
              Booking confirmed
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Your payment was received and your reservation is confirmed.
            </p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Booking reference</dt>
                <dd className="font-medium">{bookingId ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Payment reference</dt>
                <dd className="break-all text-right font-medium">
                  {reference}
                </dd>
              </div>
            </dl>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-md bg-[#1B1A2E] px-4 py-3 text-sm font-semibold text-white"
            >
              Back to home
            </Link>
          </>
        )}

        {status === "pending" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Payment processing
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
              Your payment is still processing
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Your booking remains pending until Paystack confirms the payment.
              Keep this reference if you need support.
            </p>
            <p className="mt-5 break-all rounded-md bg-gray-50 p-3 text-sm font-medium">
              {reference}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-[#1B1A2E]"
            >
              Back to home
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Payment not confirmed
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[#1B1A2E]">
              We couldn&apos;t confirm the payment
            </h1>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <p className="mt-5 break-all rounded-md bg-gray-50 p-3 text-sm font-medium">
              Reference: {reference || "Not available"}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-[#1B1A2E]"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
