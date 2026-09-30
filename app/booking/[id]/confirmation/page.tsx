"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ConfirmationData {
  bookingId: string;
  bookingReference: string;
  listingId: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentConfirmed: boolean;
  emailConfirmationEnabled: boolean;
  paymentAttemptReference: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  children: number;
  pets: number;
  totalAmount: number;
  payment: {
    amountPaid: number;
    currency: string;
    paidAt: string | null;
    method: string | null;
    reference: string | null;
  } | null;
  hostContact: string | null;
}

function formatMoney(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const bookingId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [booking, setBooking] = useState<ConfirmationData | null>(null);
  const [state, setState] = useState<"verifying" | "confirmed" | "timeout" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const reference = searchParams.get("reference");

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let referenceToVerify = reference;
    let verificationRequested = false;
    const stopAt = Date.now() + 60_000;

    async function poll() {
      try {
        const verifyQuery = referenceToVerify && !verificationRequested
          ? `?reference=${encodeURIComponent(referenceToVerify)}&verify=1`
          : "";
        if (verifyQuery) verificationRequested = true;
        const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}${verifyQuery}`, { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setState("error");
          setErrorMessage(result.error ?? "We couldn't load this booking.");
          return;
        }

        setBooking(result as ConfirmationData);
  referenceToVerify ??= result.paymentAttemptReference ?? null;
        if (["failed", "abandoned"].includes(String(result.paymentAttemptStatus))) {
          setState("error");
          setErrorMessage("Payment wasn't completed. Your date hold is still active. Return to checkout to try again.");
          return;
        }
        if ((result.status === "confirmed" || result.status === "completed") && result.paymentConfirmed) {
          setState("confirmed");
          return;
        }
        if (result.status === "cancelled") {
          setState("error");
          setErrorMessage("This booking hold has expired or was cancelled. Contact support if Paystack charged you.");
          return;
        }
        if (Date.now() >= stopAt) {
          setState("timeout");
          return;
        }
        timer = window.setTimeout(() => void poll(), 2000);
      } catch {
        if (cancelled) return;
        if (Date.now() >= stopAt) {
          setState("timeout");
          return;
        }
        timer = window.setTimeout(() => void poll(), 2000);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [bookingId, reference, retryCount]);

  const trip = booking ? `${booking.checkIn} to ${booking.checkOut}` : "";
  const listingId = booking?.listingId ?? searchParams.get("listingId");
  const checkoutUrl = booking
    ? `/booking/${booking.listingId}?${new URLSearchParams({ bookingId: booking.bookingId, checkIn: booking.checkIn, checkOut: booking.checkOut, guests: String(booking.guests), children: String(booking.children), pets: String(booking.pets) }).toString()}`
    : null;

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-[#1B1A2E] sm:py-16">
      <section className="mx-auto w-full max-w-xl">
        {state === "verifying" && (
          <>
            <p className="text-sm font-semibold text-[#1769AA]">PAYMENT</p>
            <h1 className="mt-3 text-2xl font-semibold">Verifying your payment…</h1>
            <p className="mt-2 text-sm text-[#3A3856]">We&apos;re waiting for Paystack&apos;s secure confirmation.</p>
          </>
        )}

        {state === "confirmed" && booking && (
          <>
            <p className="text-sm font-semibold text-emerald-800">PAYMENT CONFIRMED</p>
            <h1 className="mt-3 text-2xl font-semibold">Your booking is confirmed</h1>
            <p className="mt-2 text-sm text-[#3A3856]">{booking.listingTitle}</p>
            <dl className="mt-6 divide-y divide-[#E9E6DD] border-y border-[#E9E6DD] text-sm">
              <div className="flex justify-between gap-4 py-4"><dt className="text-[#3A3856]">Booking ID</dt><dd className="break-all text-right font-medium">{booking.bookingReference || booking.bookingId}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-[#3A3856]">Dates</dt><dd className="text-right">{trip}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-[#3A3856]">Party</dt><dd className="text-right">{booking.guests - booking.children} adult{booking.guests - booking.children === 1 ? "" : "s"}{booking.children ? ` · ${booking.children} kid${booking.children === 1 ? "" : "s"}` : ""}{booking.pets ? ` · ${booking.pets} pet${booking.pets === 1 ? "" : "s"}` : ""}</dd></div>
              <div className="flex justify-between gap-4 py-4"><dt className="text-[#3A3856]">Total paid</dt><dd className="font-semibold">{formatMoney(booking.payment?.amountPaid ?? booking.totalAmount, booking.payment?.currency ?? "KES")}</dd></div>
              {booking.payment?.method && <div className="flex justify-between gap-4 py-4"><dt className="text-[#3A3856]">Paid with</dt><dd className="capitalize">{booking.payment.method.replaceAll("_", " ")}</dd></div>}
            </dl>
            <section className="mt-6 border-b border-[#E9E6DD] pb-6">
              <h2 className="font-semibold">Host contact</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[#3A3856]">
                {booking.hostContact || "Your host hasn’t added arrival contact details yet. Use booking messages to reach them."}
              </p>
            </section>
            <Link href="/account/bookings" className="mt-6 inline-flex min-h-12 items-center rounded-md bg-[#1B1A2E] px-5 font-semibold text-white">View bookings</Link>
          </>
        )}

        {state === "timeout" && (
          <>
            <p className="text-sm font-semibold text-amber-800">PAYMENT PROCESSING</p>
            <h1 className="mt-3 text-2xl font-semibold">Your payment is still processing</h1>
            <p className="mt-2 text-sm leading-6 text-[#3A3856]">
              Paystack hasn&apos;t confirmed the payment yet. Your booking will remain pending until confirmation.{" "}
              {booking?.emailConfirmationEnabled
                ? "We’ll email your confirmation when the payment is verified."
                : "Your confirmation will appear here when the payment is verified. Email notifications are not configured yet."}
            </p>
            {booking && <p className="mt-4 text-sm text-[#3A3856]">Booking reference: <span className="font-medium text-[#1B1A2E]">{booking.bookingReference || booking.bookingId}</span></p>}
            <button
              type="button"
              onClick={() => {
                setBooking(null);
                setState("verifying");
                setRetryCount((count) => count + 1);
              }}
              className="mt-6 min-h-12 rounded-md border border-[#B8B7B2] px-5 font-semibold"
            >
              Check again
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <p className="text-sm font-semibold text-red-800">BOOKING STATUS</p>
            <h1 className="mt-3 text-2xl font-semibold">We couldn&apos;t confirm this booking</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-[#3A3856]">{errorMessage}</p>
            {checkoutUrl && <Link href={checkoutUrl} className="mt-6 inline-flex min-h-12 items-center rounded-md bg-[#1B1A2E] px-5 font-semibold text-white">Return to checkout</Link>}
            {!checkoutUrl && listingId && <Link href={`/apartments/${listingId}`} className="mt-6 inline-flex min-h-12 items-center rounded-md border border-[#B8B7B2] px-5 font-semibold">Back to listing</Link>}
          </>
        )}
      </section>
    </main>
  );
}