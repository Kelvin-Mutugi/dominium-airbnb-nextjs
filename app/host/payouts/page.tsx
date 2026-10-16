// app/host/payouts/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Info } from "lucide-react";
import Link from "next/link";
import { getHostPayoutsData } from "@/app/lib/host/actions";
import type { Payout } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";
import { RequestPayoutButton } from "@/components/host/RequestPayoutButton";

interface HostPayoutRequest {
  id: string;
  amount: number | string;
  net_amount: number | string | null;
  destination_method: string;
  destination_details: Record<string, string> | null;
  status: string;
  external_reference: string | null;
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
}

type Tab = "earnings" | "requests";
type EarningsFilter = "all" | "owed" | "processing" | "paid";

const kes = (value: number | string | null | undefined) =>
  `KES ${Number(value ?? 0).toLocaleString("en-KE")}`;

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const linkClass =
  "font-medium text-[#9C2454] underline decoration-[#9C2454]/30 underline-offset-2 hover:text-[#7E1C44] hover:decoration-[#7E1C44]";

function Row({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-gray-600">{label}</dt>
      <dd
        className={`text-right tabular-nums ${
          strong ? "font-semibold text-[#12231d]" : "text-gray-900"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-semibold text-[#12231d]">{children}</h3>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.8fr]">
        <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-44 animate-pulse rounded-xl bg-gray-100" />
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-gray-100" />
      <span className="sr-only">Loading payouts…</span>
    </div>
  );
}

export default function HostPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<HostPayoutRequest[]>([]);
  const [remainingByPayoutId, setRemainingByPayoutId] = useState<
    Record<string, number>
  >({});
  const [paidByPayoutId, setPaidByPayoutId] = useState<Record<string, number>>(
    {},
  );
  const [paidRequestPayoutIds, setPaidRequestPayoutIds] = useState<string[]>([]);
  const [requestableAmount, setRequestableAmount] = useState(0);
  const [feeBalance, setFeeBalance] = useState(0);
  const [payoutPhone, setPayoutPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [tab, setTab] = useState<Tab>("earnings");
  const [filter, setFilter] = useState<EarningsFilter>("all");

  useEffect(() => {
    let active = true;
    getHostPayoutsData()
      .then((data) => {
        if (active) {
          setPayouts(data.payouts);
          setPayoutRequests(data.requests as HostPayoutRequest[]);
          setRemainingByPayoutId(data.remainingAmountByPayoutId);
          setPaidByPayoutId(data.paidAmountByPayoutId);
          setPaidRequestPayoutIds(data.paidRequestPayoutIds);
          setRequestableAmount(data.requestableAmount);
          setFeeBalance(data.feeBalance);
          setPayoutPhone(data.payoutPhone);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load payouts:", loadError);
        if (active)
          setError("We couldn't load your payouts. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const filteredPayouts = useMemo(
    () =>
      filter === "all" ? payouts : payouts.filter((p) => p.status === filter),
    [payouts, filter],
  );

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold text-red-900">
              Payouts didn&apos;t load
            </p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setReloadToken((token) => token + 1);
          }}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    );
  }

  // ---- Totals (logic unchanged) ----
  const owed = payouts
    .filter((p) => p.status === "owed")
    .reduce((sum, p) => sum + (remainingByPayoutId[p.id] ?? 0), 0);
  const processing =
    payouts
      .filter((p) => p.status === "processing")
      .reduce((sum, p) => sum + Number(p.amount), 0) +
    payoutRequests
      .filter((request) => ["requested", "processing"].includes(request.status))
      .reduce((sum, request) => sum + Number(request.amount), 0);
  const owedCount = payouts.filter(
    (p) => (remainingByPayoutId[p.id] ?? 0) > 0,
  ).length;
  const paidRequests = payoutRequests.filter(
    (request) => request.status === "paid",
  );
  const paidRequestTotal = paidRequests.reduce(
    (sum, request) => sum + Number(request.net_amount ?? 0),
    0,
  );
  const paidRequestPayoutIdSet = new Set(paidRequestPayoutIds);
  const paidWithoutRequestsList = payouts.filter(
    (payout) =>
      payout.status === "paid" && !paidRequestPayoutIdSet.has(payout.id),
  );
  const paidWithoutRequests = paidWithoutRequestsList.reduce(
    (sum, payout) => sum + Number(payout.amount),
    0,
  );
  const paidCount = paidWithoutRequestsList.length + paidRequests.length;
  const heldHistorical = payouts
    .filter((p) => p.status === "owed" && !p.eligible_for_withdrawal)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const filters: { key: EarningsFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: payouts.length },
    {
      key: "owed",
      label: "Waiting",
      count: payouts.filter((p) => p.status === "owed").length,
    },
    {
      key: "processing",
      label: "Processing",
      count: payouts.filter((p) => p.status === "processing").length,
    },
    {
      key: "paid",
      label: "Paid",
      count: payouts.filter((p) => p.status === "paid").length,
    },
  ];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "earnings", label: "Booking earnings", count: payouts.length },
    { key: "requests", label: "Payout requests", count: payoutRequests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <h1 className="text-2xl font-bold text-[#12231d]">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Track what you&apos;ve earned from completed stays, request a
          withdrawal to M-Pesa, and see what has been paid.
        </p>
      </header>

      {/* Balance + summary */}
      <section
        aria-label="Payout summary"
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]"
      >
        <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Available to withdraw
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#12231d]">
              {kes(requestableAmount)}
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              You can request any amount up to this. Payout processing fees may
              reduce what reaches your M-Pesa number.
            </p>
            {feeBalance !== 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {feeBalance > 0
                  ? "Processing fees due"
                  : "Processing fee credit"}
                : {kes(Math.abs(feeBalance))}
              </p>
            )}
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <RequestPayoutButton
              key={`${requestableAmount}-${payoutPhone}`}
              amount={requestableAmount}
              initialPhone={payoutPhone}
              onRequested={() => setReloadToken((token) => token + 1)}
            />
          </div>
        </div>

        <dl className="grid divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-5">
            <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <span className="h-2 w-2 rounded-full bg-[#b36b00]" aria-hidden="true" />
              Waiting for payout
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#12231d]">
              {kes(owed)}
            </dd>
            <dd className="mt-2 text-xs leading-5 text-gray-600">
              From {owedCount} {owedCount === 1 ? "booking" : "bookings"}.
              {heldHistorical > 0 &&
                ` ${kes(heldHistorical)} can't be requested yet.`}
            </dd>
          </div>
          <div className="p-5">
            <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <span className="h-2 w-2 rounded-full bg-[#365d80]" aria-hidden="true" />
              Processing
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#12231d]">
              {kes(processing)}
            </dd>
            <dd className="mt-2 text-xs leading-5 text-gray-600">
              Being reviewed or sent to your M-Pesa.
            </dd>
          </div>
          <div className="p-5">
            <dt className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <span className="h-2 w-2 rounded-full bg-[#315b47]" aria-hidden="true" />
              Paid out
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#12231d]">
              {kes(paidWithoutRequests + paidRequestTotal)}
            </dd>
            <dd className="mt-2 text-xs leading-5 text-gray-600">
              {paidCount} {paidCount === 1 ? "payment" : "payments"} sent to
              you.
            </dd>
          </div>
        </dl>
      </section>

      {/* History */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          role="tablist"
          aria-label="Payout history"
          className="flex gap-6 border-b border-gray-200 px-5"
        >
          {tabs.map((t) => {
            const selected = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={selected}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] ${
                  selected
                    ? "border-[#9C2454] text-[#12231d]"
                    : "border-transparent text-gray-600 hover:text-[#12231d]"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    selected
                      ? "bg-[#9C2454]/10 text-[#9C2454]"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- Booking earnings ---------- */}
        {tab === "earnings" && (
          <div id="panel-earnings" role="tabpanel" aria-labelledby="tab-earnings">
            {payouts.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-[#12231d]">No earnings yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                  Your earnings will show up here after your first guest checks
                  out.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
                  {filters.map((f) => {
                    const selected = filter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E23E85] ${
                          selected
                            ? "bg-[#12231d] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {f.label}{" "}
                        <span className={selected ? "text-white/70" : "text-gray-500"}>
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredPayouts.length === 0 ? (
                  <p className="px-6 py-12 text-center text-sm text-gray-600">
                    No payouts with this status.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-medium text-gray-600">
                        <tr>
                          <th scope="col" className="px-5 py-3">
                            Stay
                          </th>
                          <th scope="col" className="px-4 py-3 text-right">
                            Earnings
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Status
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Paid on
                          </th>
                          <th scope="col" className="w-12 px-4 py-3">
                            <span className="sr-only">Details</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPayouts.map((p) => {
                          const expanded = expandedPayoutId === p.id;
                          const toggle = () =>
                            setExpandedPayoutId(expanded ? null : p.id);
                          const remaining = remainingByPayoutId[p.id] ?? 0;
                          const covered = paidByPayoutId[p.id] ?? 0;
                          const gross = Number(
                            p.booking?.host_gross_amount ??
                              p.booking?.host_payout_amount ??
                              p.amount,
                          );
                          const net = Number(
                            p.booking?.host_payout_amount ?? p.amount,
                          );
                          const location =
                            [p.booking?.listing?.town, p.booking?.listing?.county]
                              .filter(Boolean)
                              .join(", ") || null;

                          return (
                            <Fragment key={p.id}>
                              <tr
                                onClick={toggle}
                                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                                  expanded ? "bg-gray-50" : ""
                                }`}
                              >
                                <td className="px-5 py-3.5">
                                  <p className="font-medium text-[#12231d]">
                                    {p.booking?.listing?.title ?? "Completed stay"}
                                  </p>
                                  <p className="mt-0.5 text-xs text-gray-600">
                                    {p.booking
                                      ? `${formatDate(p.booking.check_in)} to ${formatDate(p.booking.check_out)}`
                                      : "Booking details unavailable"}
                                  </p>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5 text-right">
                                  <p className="font-semibold tabular-nums text-[#12231d]">
                                    {kes(p.amount)}
                                  </p>
                                  {p.status === "owed" && (
                                    <p className="mt-0.5 text-xs text-gray-600">
                                      {p.eligible_for_withdrawal
                                        ? `${kes(remaining)} available`
                                        : "Not available yet"}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3.5">
                                  <StatusBadge status={p.status} />
                                </td>
                                <td className="whitespace-nowrap px-4 py-3.5 text-gray-700">
                                  {formatDate(p.paid_at)}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-controls={`payout-details-${p.id}`}
                                    aria-label={
                                      expanded ? "Hide details" : "Show details"
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggle();
                                    }}
                                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E23E85]"
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${
                                        expanded ? "rotate-180" : ""
                                      }`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                </td>
                              </tr>

                              {expanded && (
                                <tr id={`payout-details-${p.id}`} className="bg-gray-50">
                                  <td colSpan={5} className="px-5 pb-5 pt-1">
                                    {p.status === "processing" && (
                                      <div className="mb-4 flex gap-3 rounded-lg border border-[#365d80]/20 bg-[#edf4f8] p-3">
                                        <Info
                                          className="mt-0.5 h-4 w-4 shrink-0 text-[#284c68]"
                                          aria-hidden="true"
                                        />
                                        <div>
                                          <p className="text-sm font-semibold text-[#284c68]">
                                            What happens next
                                          </p>
                                          <p className="mt-0.5 text-sm leading-5 text-[#425d70]">
                                            Your payout becomes available 24
                                            hours after checkout, once any open
                                            guest request or support case is
                                            resolved.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    {!p.eligible_for_withdrawal &&
                                      p.status === "owed" && (
                                        <div className="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                          <Info
                                            className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                                            aria-hidden="true"
                                          />
                                          <p className="text-sm leading-5 text-amber-900">
                                            This earlier payout can&apos;t be
                                            withdrawn yet. It needs a review by
                                            our team.
                                          </p>
                                        </div>
                                      )}

                                    <div className="grid gap-4 lg:grid-cols-3">
                                      {/* Stay and guest */}
                                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                                        <SectionTitle>Stay and guest</SectionTitle>
                                        <dl className="divide-y divide-gray-100">
                                          <Row label="Listing">
                                            {p.booking?.listing ? (
                                              <Link
                                                href={`/host/listings/${p.booking.listing.id}`}
                                                className={linkClass}
                                              >
                                                {p.booking.listing.title}
                                              </Link>
                                            ) : (
                                              "Unavailable"
                                            )}
                                          </Row>
                                          <Row label="Location">
                                            {location ?? "—"}
                                          </Row>
                                          <Row label="Guest">
                                            <Link
                                              href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                              className={linkClass}
                                            >
                                              {p.booking?.guest_name ?? "View booking"}
                                            </Link>
                                            {p.booking?.guest_country
                                              ? `, ${p.booking.guest_country}`
                                              : ""}
                                          </Row>
                                          <Row label="Nights">
                                            {p.booking?.nights ?? "—"}
                                          </Row>
                                          <Row label="Guests">
                                            {p.booking
                                              ? `${p.booking.adults_count ?? 0} adults, ${p.booking.children_count ?? 0} children`
                                              : "—"}
                                          </Row>
                                          <Row label="Rooms">
                                            {p.booking?.rooms_count ?? "—"}
                                          </Row>
                                        </dl>
                                        {p.booking?.special_requests && (
                                          <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 p-2.5 text-xs leading-5 text-gray-700">
                                            <span className="font-medium">
                                              Guest request:
                                            </span>{" "}
                                            {p.booking.special_requests}
                                          </p>
                                        )}
                                      </div>

                                      {/* Earnings breakdown */}
                                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                                        <SectionTitle>Earnings breakdown</SectionTitle>
                                        <dl>
                                          <Row label="Earnings before deductions">
                                            {kes(gross)}
                                          </Row>
                                          <Row label="Payout processing fees">
                                            {p.booking?.collection_fee_reconciled ? (
                                              `− ${kes(p.booking.collection_fee_amount)}`
                                            ) : (
                                              <span className="text-xs text-gray-600">
                                                Applied when paid
                                              </span>
                                            )}
                                          </Row>
                                          <div className="mt-1 border-t border-gray-200 pt-1">
                                            <Row label="Booking earnings" strong>
                                              {kes(net)}
                                            </Row>
                                          </div>
                                          {p.status === "owed" &&
                                            p.eligible_for_withdrawal && (
                                              <div className="mt-2 border-t border-dashed border-gray-200 pt-1">
                                                <Row label="Already withdrawn">
                                                  {kes(covered)}
                                                </Row>
                                                <Row label="Still available" strong>
                                                  {kes(remaining)}
                                                </Row>
                                              </div>
                                            )}
                                        </dl>
                                      </div>

                                      {/* Booking and status */}
                                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
                                        <SectionTitle>Booking and status</SectionTitle>
                                        <dl className="divide-y divide-gray-100">
                                          <Row label="Reference">
                                            {p.booking?.booking_reference ?? "Unavailable"}
                                          </Row>
                                          <Row label="Booking status">
                                            <StatusBadge
                                              status={p.booking?.status ?? "unknown"}
                                            />
                                          </Row>
                                          <Row label="Payout status">
                                            <StatusBadge status={p.status} />
                                          </Row>
                                          <Row label="Paid on">
                                            {p.paid_at ? formatDate(p.paid_at) : "Not paid yet"}
                                          </Row>
                                        </dl>
                                        <Link
                                          href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                          className={`mt-3 inline-block ${linkClass}`}
                                        >
                                          Open booking
                                        </Link>
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
              </>
            )}
          </div>
        )}

        {/* ---------- Payout requests ---------- */}
        {tab === "requests" && (
          <div id="panel-requests" role="tabpanel" aria-labelledby="tab-requests">
            {payoutRequests.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold text-[#12231d]">
                  No payout requests yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                  When you request a withdrawal, you can follow it here from
                  request to payment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-medium text-gray-600">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        Requested
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Fees
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        You receive
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3">
                        M-Pesa reference
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payoutRequests.map((request) => {
                      const isPaid = request.status === "paid";
                      const fees = Math.max(
                        Number(request.amount) - Number(request.net_amount ?? 0),
                        0,
                      );
                      return (
                        <tr key={request.id} className="align-top">
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-[#12231d]">
                              {formatDateTime(request.requested_at)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-600">
                              To M-Pesa{" "}
                              {request.destination_details?.mpesa_number ??
                                request.destination_details?.phone ??
                                "—"}
                            </p>
                            {request.processed_at && (
                              <p className="mt-0.5 text-xs text-gray-600">
                                Processed {formatDate(request.processed_at)}
                              </p>
                            )}
                            {request.status === "reversed" && (
                              <p className="mt-1.5 max-w-xs rounded-md bg-amber-50 px-2 py-1.5 text-xs leading-5 text-amber-900 ring-1 ring-amber-200">
                                This payment was returned. The processing fee
                                will be taken from a future payout.
                              </p>
                            )}
                            {request.admin_note && (
                              <p className="mt-1.5 max-w-xs text-xs leading-5 text-gray-700">
                                <span className="font-medium">Note:</span>{" "}
                                {request.admin_note}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-[#12231d]">
                            {kes(request.amount)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-gray-700">
                            {isPaid ? `− ${kes(fees)}` : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-gray-900">
                            {isPaid ? kes(request.net_amount) : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-gray-700">
                            {request.external_reference ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}