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
        <h1 className="text-2xl font-bold text-[#12231d]">Payouts</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setReloadToken((token) => token + 1);
            }}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const owed = payouts.filter((p) => p.status === "owed").reduce((sum, p) => sum + Number(p.amount), 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#12231d]">Payouts</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Owed to you</p>
          <p className="mt-1 text-2xl font-bold text-[#ec1561]">KES {owed.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Paid out so far</p>
          <p className="mt-1 text-2xl font-bold text-[#12231d]">KES {paid.toLocaleString()}</p>
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
                      className={`cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ec1561] ${rowColor}`}
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
                          <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Guest</p>
                              <Link
                                href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                className="mt-1 inline-block font-medium text-[#b30f4b] underline decoration-[#b30f4b]/40 underline-offset-2 hover:text-[#870b38]"
                              >
                                {p.booking?.guest_name ?? "View booking details"}
                              </Link>
                              {p.booking?.guest_email && <p className="break-all text-gray-600">{p.booking.guest_email}</p>}
                              {p.booking?.guest_phone && <p className="text-gray-600">{p.booking.guest_phone}</p>}
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Listing</p>
                              {p.booking?.listing ? (
                                <Link
                                  href={`/host/listings/${p.booking.listing.id}`}
                                  className="mt-1 inline-block font-medium text-[#b30f4b] underline decoration-[#b30f4b]/40 underline-offset-2 hover:text-[#870b38]"
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
                              <p className="mt-1 text-gray-700">{p.booking?.guests_count ?? "—"} guests</p>
                              <p className="text-gray-700">Total: KES {Number(p.booking?.total_amount ?? 0).toLocaleString()}</p>
                              <Link
                                href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                className="mt-1 inline-block font-medium text-[#b30f4b] underline decoration-[#b30f4b]/40 underline-offset-2 hover:text-[#870b38]"
                              >
                                Open booking
                              </Link>
                            </div>
                            <div>
                              <p className="text-xs font-medium uppercase text-gray-500">Payout reconciliation</p>
                              {p.booking?.host_base_amount != null && p.booking.additional_charges_amount != null ? (
                                <>
                                  <p className="mt-1 text-gray-700">Host nightly earnings: KES {Number(p.booking.host_base_amount).toLocaleString()}</p>
                                  <p className="text-gray-700">Additional host charges: KES {Number(p.booking.additional_charges_amount).toLocaleString()}</p>
                                </>
                              ) : (
                                <p className="mt-1 text-xs text-gray-500">Detailed host-rate/charge split is unavailable for this older booking.</p>
                              )}
                              <p className="text-gray-700">Platform fee: KES {Number(p.booking?.commission_amount ?? 0).toLocaleString()}</p>
                              <p className="text-gray-700">Guest total: KES {Number(p.booking?.total_amount ?? 0).toLocaleString()}</p>
                              <p className="font-semibold text-[#12231d]">Payout ledger: KES {Number(p.amount).toLocaleString()}</p>
                              <p className="text-gray-700">Booking payout: KES {Number(p.booking?.host_payout_amount ?? p.amount).toLocaleString()}</p>
                              {p.booking?.host_payout_amount != null && Number(p.amount) !== Number(p.booking.host_payout_amount) && (
                                <p role="alert" className="mt-1 text-xs font-medium text-red-700">
                                  Payout ledger differs from booking payout by KES {Math.abs(Number(p.amount) - Number(p.booking.host_payout_amount)).toLocaleString()}.
                                </p>
                              )}
                              <p className="mt-1 text-gray-700">Status: <StatusBadge status={p.status} /></p>
                              <p className="text-gray-700">Recorded: {new Date(p.created_at).toLocaleDateString()}</p>
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
