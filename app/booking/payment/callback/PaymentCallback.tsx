"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface PaymentReceipt {
  bookingId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  subtotal: number;
  serviceFee: number;
  tax: number;
  total: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string | null;
  transactionId: number | null;
  paidAt: string | null;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatReceiptDate(value: string | null) {
  if (!value) return "Payment confirmed";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";

  const [verificationStatus, setVerificationStatus] = useState<
    "checking" | "success" | "pending" | "failed"
  >("checking");

  const [bookingId, setBookingId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = reference ? verificationStatus : "failed";
  const displayedError = reference ? error : "No payment reference was returned by Paystack.";

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await fetch("/api/payments/paystack/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (cancelled) return;

        setBookingId(result.bookingId ?? null);

        if (response.ok && result.success) {
          setReceipt(result.receipt ?? null);
          setVerificationStatus("success");
          return;
        }

        if (
          result.status === "pending" ||
          result.status === "ongoing" ||
          result.status === "processing"
        ) {
          setVerificationStatus("pending");
          return;
        }

        setVerificationStatus("failed");
        setError(result.error ?? "The payment was not completed.");
      } catch {
        if (!cancelled) {
          setVerificationStatus("failed");
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

            {receipt ? (
              <section aria-labelledby="receipt-heading" className="mt-6 border-y border-gray-200 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="receipt-heading" className="text-lg font-semibold text-[#1B1A2E]">Payment receipt</h2>
                    <p className="mt-1 text-xs text-gray-500">{formatReceiptDate(receipt.paidAt)}</p>
                  </div>
                  <button type="button" onClick={() => window.print()} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-[#1B1A2E] hover:bg-gray-50 print:hidden">Print receipt</button>
                </div>

                <p className="mt-4 font-medium text-[#1B1A2E]">{receipt.listingTitle}</p>
                <p className="mt-1 text-sm text-gray-600">{receipt.checkIn} to {receipt.checkOut}</p>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Stay subtotal</dt><dd>{formatMoney(receipt.subtotal, receipt.currency)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Service fee</dt><dd>{formatMoney(receipt.serviceFee, receipt.currency)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Tax</dt><dd>{receipt.tax > 0 ? formatMoney(receipt.tax, receipt.currency) : "No separate tax configured"}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-semibold text-[#1B1A2E]"><dt>Total paid</dt><dd>{formatMoney(receipt.amountPaid, receipt.currency)}</dd></div>
                  <div className="flex justify-between gap-4 pt-2"><dt className="text-gray-600">Payment method</dt><dd className="capitalize">{receipt.paymentMethod.replaceAll("_", " ")}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Booking reference</dt><dd className="break-all text-right font-medium">{receipt.bookingId}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Payment reference</dt><dd className="break-all text-right font-medium">{receipt.paymentReference ?? reference}</dd></div>
                  {receipt.transactionId && <div className="flex justify-between gap-4"><dt className="text-gray-600">Paystack transaction</dt><dd>{receipt.transactionId}</dd></div>}
                </dl>
              </section>
            ) : (
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Booking reference</dt><dd className="font-medium">{bookingId ?? "—"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-gray-500">Payment reference</dt><dd className="break-all text-right font-medium">{reference}</dd></div>
              </dl>
            )}

            <div className="mt-6 flex flex-wrap gap-3 print:hidden">
              <Link href={bookingId ? `/account/bookings/${bookingId}` : "/account/bookings"} className="inline-flex rounded-md bg-[#1B1A2E] px-4 py-3 text-sm font-semibold text-white">View booking</Link>
              <Link href="/" className="inline-flex rounded-md border border-gray-300 px-4 py-3 text-sm font-semibold text-[#1B1A2E]">Back to home</Link>
            </div>
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

            <p className="mt-2 text-sm text-gray-600">{displayedError}</p>

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