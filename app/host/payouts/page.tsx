// app/host/payouts/page.tsx
"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { getHostPayoutsData } from "@/app/lib/host/actions";
import type { Payout } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

export default function HostPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getHostPayoutsData()
      .then((data) => {
        if (active) setPayouts(data);
      })
      .catch((loadError) => {
        console.error("Failed to load payouts:", loadError);
        if (active) setError("We couldn't load your payouts. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  if (loading) return <p className="text-gray-500">Loading payouts…</p>;

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setReloadToken((token) => token + 1);
          }}
          className="font-semibold text-[#9C2454] underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const owed = payouts.filter((p) => p.status === "owed").reduce((sum, p) => sum + Number(p.amount), 0);
  const processing = payouts.filter((p) => p.status === "processing").reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);
  const owedCount = payouts.filter((p) => p.status === "owed").length;
  const paidCount = payouts.filter((p) => p.status === "paid").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#12231d]">Payouts</h1>

      <div className="grid gap-px border border-[#12231d]/15 bg-[#12231d]/15 sm:grid-cols-3">
        <div className="bg-white p-5">
          <p className="text-sm font-medium text-[#565c57]">Owed to you</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#9a5b00]">KES {owed.toLocaleString("en-KE")}</p>
          <p className="mt-2 text-xs leading-5 text-[#747873]">
            {owedCount} {owedCount === 1 ? "payout" : "payouts"} recorded as owed and awaiting payment.
          </p>
        </div>
        <div className="bg-white p-5">
          <p className="text-sm font-medium text-[#565c57]">Processing</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#365d80]">KES {processing.toLocaleString("en-KE")}</p>
          <p className="mt-2 text-xs leading-5 text-[#747873]">
            Processing is a temporary hold, not a payment in progress. After 24 hours from checkout and once any support case or guest request is resolved, the payout moves to Owed (awaiting payment) at the next daily review.
          </p>
        </div>
        <div className="bg-white p-5">
          <p className="text-sm font-medium text-[#565c57]">Paid out</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#315b47]">KES {paid.toLocaleString("en-KE")}</p>
          <p className="mt-2 text-xs leading-5 text-[#747873]">
            {paidCount} {paidCount === 1 ? "payout" : "payouts"} marked paid in your history.
          </p>
        </div>
      </div>

      {payouts.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
          Payouts will appear here after your first completed booking.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => {
                const expanded = expandedPayoutId === p.id;
                const rowColor = p.status === "paid"
                  ? "bg-white hover:bg-gray-50"
                  : p.status === "processing"
                    ? "bg-gray-50 hover:bg-gray-100"
                    : "bg-gray-100/70 hover:bg-gray-100";

                return (
                  <Fragment key={p.id}>
                    <tr
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={() => setExpandedPayoutId(expanded ? null : p.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setExpandedPayoutId(expanded ? null : p.id);
                        }
                      }}
                      className={`cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E23E85] ${rowColor}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-[#12231d]">{p.booking?.listing?.title ?? "Completed stay"}</p>
                            <p className="text-gray-600">
                              {p.booking ? `${p.booking.check_in} → ${p.booking.check_out}` : "Booking details unavailable"}
                            </p>
                          </div>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#12231d]">KES {Number(p.amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                    </tr>
                    {expanded && (
                      <tr className="bg-white">
                        <td colSpan={4} className="px-4 pb-4">
                          <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            {p.status === "processing" && (
                              <div className="rounded-md border border-[#365d80]/20 bg-[#edf4f8] p-3 sm:col-span-2 lg:col-span-3">
                                <p className="font-semibold text-[#284c68]">What happens next</p>
                                <p className="mt-1 text-sm leading-5 text-[#425d70]">
                                  This payout is temporarily held after the host marked the stay complete. After 24 hours from the listing&apos;s scheduled check-out, the system checks that there are no unresolved booking support cases or guest requests. It then changes the status to <strong>Owed</strong> at the next daily review. Owed means awaiting transfer; it is not marked paid until the admin records the payment.
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Guest</p>
                              <Link
                                href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                className="mt-1 inline-block font-medium text-[#9C2454] underline decoration-[#9C2454]/40 underline-offset-2 hover:text-[#7E1C44]"
                              >
                                {p.booking?.guest_name ?? "View booking details"}
                              </Link>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Listing</p>
                              {p.booking?.listing ? (
                                <Link
                                  href={`/host/listings/${p.booking.listing.id}`}
                                  className="mt-1 inline-block font-medium text-[#9C2454] underline decoration-[#9C2454]/40 underline-offset-2 hover:text-[#7E1C44]"
                                >
                                  {p.booking.listing.title}
                                </Link>
                              ) : (
                                <p className="mt-1 font-medium text-[#12231d]">Listing details unavailable</p>
                              )}
                              <p className="text-gray-600">
                                {[p.booking?.listing?.town, p.booking?.listing?.county].filter(Boolean).join(", ") || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Booking</p>
                              <p className="mt-1 text-gray-700">Reference: {p.booking?.booking_reference ?? "Unavailable"}</p>
                              <p className="text-gray-700">Booking status: <StatusBadge status={p.booking?.status ?? "unknown"} /></p>
                              <p className="text-gray-700">{p.booking?.nights ?? "—"} nights · {p.booking?.adults_count ?? "—"} adults · {p.booking?.children_count ?? "—"} children · {p.booking?.rooms_count ?? "—"} rooms</p>
                              <p className="text-gray-700">Guest: {p.booking?.guest_name ?? "Guest"}{p.booking?.guest_country ? ` · ${p.booking.guest_country}` : ""}</p>
                              <p className="text-gray-700">Host payout: KES {Number(p.booking?.host_payout_amount ?? p.amount).toLocaleString()}</p>
                              {p.booking?.special_requests && <p className="mt-1 whitespace-pre-wrap text-gray-600">Request: {p.booking.special_requests}</p>}
                              <Link href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`} className="mt-1 inline-block font-medium text-[#9C2454] underline decoration-[#9C2454]/40 underline-offset-2 hover:text-[#7E1C44]">
                                Open booking
                              </Link>
                              <p className="mt-2 text-gray-700">Payout ledger: KES {Number(p.amount).toLocaleString()}</p>
                              <p className="text-gray-700">Status: <StatusBadge status={p.status} /></p>
                              <p className="text-gray-700">Paid: {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "Not paid yet"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
