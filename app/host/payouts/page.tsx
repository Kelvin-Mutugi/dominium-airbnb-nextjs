// app/host/payouts/page.tsx
"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Info, LifeBuoy } from "lucide-react";
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

/* Shared look: cream borders, white cards, dark green text, crimson accent */
const CARD =
  "rounded-2xl border border-[#E9E6DD] bg-white shadow-[0_1px_2px_rgba(18,35,29,0.04)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3124a]";
const linkClass = `rounded font-medium text-[#a3124a] underline decoration-[#a3124a]/30 underline-offset-2 hover:decoration-[#a3124a] ${FOCUS}`;

const HOW_IT_WORKS = [
  {
    title: "Your guest checks out",
    body: "Once the stay is complete, the earnings are added to your list.",
  },
  {
    title: "24 hours later, it's yours to withdraw",
    body: "This waits until any open guest request or support case is resolved.",
  },
  {
    title: "Request a withdrawal to M-Pesa",
    body: "Pick any amount up to your balance. Processing fees may reduce what reaches your phone.",
  },
];

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

function StatTile({
  label,
  value,
  note,
  dot,
  tint,
}: {
  label: string;
  value: string;
  note: string;
  dot: string;
  tint: string;
}) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${tint}`}>
      <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <span
          className={`h-2 w-2 rounded-full ${dot}`}
          aria-hidden="true"
        />
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#12231d]">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-gray-600">{note}</p>
    </div>
  );
}

function HowItWorksList() {
  return (
    <ol className="space-y-3">
      {HOW_IT_WORKS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF5F8] text-xs font-semibold text-[#a3124a]"
          >
            {index + 1}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#12231d]">{step.title}</p>
            <p className="mt-0.5 text-sm leading-5 text-gray-600">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#EFEBE0]" />
        <div className="h-4 w-72 animate-pulse rounded bg-[#EFEBE0]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-[#F7F5EF]"
              />
            ))}
          </div>
          <div className={`h-80 animate-pulse ${CARD}`} />
        </div>
        <div className={`hidden h-64 animate-pulse lg:block ${CARD}`} />
      </div>
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
        className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between"
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
          className={`min-h-11 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-100 ${FOCUS}`}
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

  const phoneTail = payoutPhone.replace(/\D/g, "").slice(-3);

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
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Page header */}
      <header>
        <p className="text-sm text-gray-500">Host portal / Payouts</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#12231d] sm:text-3xl">
          Payouts
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          See what you&apos;ve earned from completed stays, withdraw to M-Pesa,
          and check what has been paid.
        </p>
      </header>

      {/* Two columns on large screens: history left, balance sidebar right */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ============ MAIN COLUMN ============ */}
        <div className="min-w-0 space-y-6">
          {/* Summary tiles */}
          <section
            aria-label="Payout summary"
            className="grid gap-3 sm:grid-cols-3"
          >
            <StatTile
              label="Waiting for payout"
              value={kes(owed)}
              dot="bg-[#b36b00]"
              tint="bg-[#FFF8EC] ring-1 ring-inset ring-[#b36b00]/15"
              note={`From ${owedCount} ${owedCount === 1 ? "booking" : "bookings"}.${
                heldHistorical > 0
                  ? ` ${kes(heldHistorical)} can't be requested yet.`
                  : ""
              }`}
            />
            <StatTile
              label="Processing"
              value={kes(processing)}
              dot="bg-[#365d80]"
              tint="bg-[#EEF4F8] ring-1 ring-inset ring-[#365d80]/15"
              note="Being reviewed or sent to your M-Pesa."
            />
            <StatTile
              label="Paid out"
              value={kes(paidWithoutRequests + paidRequestTotal)}
              dot="bg-[#315b47]"
              tint="bg-[#EEF8F2] ring-1 ring-inset ring-[#315b47]/15"
              note={`${paidCount} ${paidCount === 1 ? "payment" : "payments"} sent to you.`}
            />
          </section>

          {/* History */}
          <section className={CARD}>
            <div
              role="tablist"
              aria-label="Payout history"
              className="flex gap-6 overflow-x-auto border-b border-[#E9E6DD] px-5"
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
                    className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 py-4 text-sm font-semibold transition-colors ${FOCUS} ${
                      selected
                        ? "border-[#a3124a] text-[#12231d]"
                        : "border-transparent text-gray-600 hover:text-[#12231d]"
                    }`}
                  >
                    {t.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                        selected
                          ? "bg-[#a3124a]/10 text-[#a3124a]"
                          : "bg-[#F7F5EF] text-gray-600"
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
              <div
                id="panel-earnings"
                role="tabpanel"
                aria-labelledby="tab-earnings"
              >
                {payouts.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-[#12231d]">
                      No earnings yet
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                      Your earnings will show up here after your first guest
                      checks out.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 border-b border-[#F1EFE8] px-5 py-3">
                      {filters.map((f) => {
                        const selected = filter === f.key;
                        return (
                          <button
                            key={f.key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setFilter(f.key)}
                            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${FOCUS} ${
                              selected
                                ? "bg-[#12231d] text-white"
                                : "border border-[#E9E6DD] text-gray-700 hover:bg-[#F7F5EF]"
                            }`}
                          >
                            {f.label}{" "}
                            <span
                              className={
                                selected ? "text-white/70" : "text-gray-500"
                              }
                            >
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
                        <table className="w-full min-w-[520px] text-left text-sm">
                          <thead className="bg-[#F7F5EF] text-xs font-medium text-gray-600">
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
                              <th scope="col" className="w-12 px-4 py-3">
                                <span className="sr-only">Details</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1EFE8]">
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
                                [
                                  p.booking?.listing?.town,
                                  p.booking?.listing?.county,
                                ]
                                  .filter(Boolean)
                                  .join(", ") || null;

                              return (
                                <Fragment key={p.id}>
                                  <tr
                                    onClick={toggle}
                                    className={`cursor-pointer transition-colors hover:bg-[#FBFAF6] ${
                                      expanded ? "bg-[#FBFAF6]" : ""
                                    }`}
                                  >
                                    <td className="px-5 py-4">
                                      <p className="font-medium text-[#12231d]">
                                        {p.booking?.listing?.title ??
                                          "Completed stay"}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-600">
                                        {p.booking
                                          ? `${formatDate(p.booking.check_in)} to ${formatDate(p.booking.check_out)}`
                                          : "Booking details unavailable"}
                                      </p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-4 text-right">
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
                                    <td className="px-4 py-4">
                                      <StatusBadge status={p.status} />
                                      {p.paid_at && (
                                        <p className="mt-1 whitespace-nowrap text-xs text-gray-600">
                                          Paid {formatDate(p.paid_at)}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                      <button
                                        type="button"
                                        aria-expanded={expanded}
                                        aria-controls={`payout-details-${p.id}`}
                                        aria-label={
                                          expanded
                                            ? "Hide details"
                                            : "Show details"
                                        }
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          toggle();
                                        }}
                                        className={`rounded-lg p-2 text-gray-500 hover:bg-[#F1EFE8] hover:text-gray-900 ${FOCUS}`}
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
                                    <tr
                                      id={`payout-details-${p.id}`}
                                      className="bg-[#FBFAF6]"
                                    >
                                      <td colSpan={4} className="px-5 pb-5 pt-1">
                                        {p.status === "processing" && (
                                          <div className="mb-4 flex gap-3 rounded-xl border border-[#365d80]/20 bg-[#EEF4F8] p-3.5">
                                            <Info
                                              className="mt-0.5 h-4 w-4 shrink-0 text-[#284c68]"
                                              aria-hidden="true"
                                            />
                                            <div>
                                              <p className="text-sm font-semibold text-[#284c68]">
                                                What happens next
                                              </p>
                                              <p className="mt-0.5 text-sm leading-5 text-[#425d70]">
                                                Your payout becomes available
                                                24 hours after checkout, once
                                                any open guest request or
                                                support case is resolved.
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                        {!p.eligible_for_withdrawal &&
                                          p.status === "owed" && (
                                            <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                                              <Info
                                                className="mt-0.5 h-4 w-4 shrink-0 text-amber-800"
                                                aria-hidden="true"
                                              />
                                              <p className="text-sm leading-5 text-amber-900">
                                                This earlier payout can&apos;t
                                                be withdrawn yet. It needs a
                                                review by our team.
                                              </p>
                                            </div>
                                          )}

                                        <div className="grid gap-3 md:grid-cols-2">
                                          {/* Earnings breakdown */}
                                          <div className="rounded-xl border border-[#E9E6DD] bg-white p-4 text-sm">
                                            <SectionTitle>
                                              Earnings breakdown
                                            </SectionTitle>
                                            <dl>
                                              <Row label="Earnings before deductions">
                                                {kes(gross)}
                                              </Row>
                                              <Row label="Payout processing fees">
                                                {p.booking
                                                  ?.collection_fee_reconciled ? (
                                                  `− ${kes(p.booking.collection_fee_amount)}`
                                                ) : (
                                                  <span className="text-xs text-gray-600">
                                                    Applied when paid
                                                  </span>
                                                )}
                                              </Row>
                                              <div className="mt-1 border-t border-[#E9E6DD] pt-1">
                                                <Row
                                                  label="Booking earnings"
                                                  strong
                                                >
                                                  {kes(net)}
                                                </Row>
                                              </div>
                                              {p.status === "owed" &&
                                                p.eligible_for_withdrawal && (
                                                  <div className="mt-2 border-t border-dashed border-[#E9E6DD] pt-1">
                                                    <Row label="Already withdrawn">
                                                      {kes(covered)}
                                                    </Row>
                                                    <Row
                                                      label="Still available"
                                                      strong
                                                    >
                                                      {kes(remaining)}
                                                    </Row>
                                                  </div>
                                                )}
                                            </dl>
                                          </div>

                                          {/* Booking and status */}
                                          <div className="rounded-xl border border-[#E9E6DD] bg-white p-4 text-sm">
                                            <SectionTitle>
                                              Booking and status
                                            </SectionTitle>
                                            <dl className="divide-y divide-[#F1EFE8]">
                                              <Row label="Reference">
                                                {p.booking?.booking_reference ??
                                                  "Unavailable"}
                                              </Row>
                                              <Row label="Booking status">
                                                <StatusBadge
                                                  status={
                                                    p.booking?.status ??
                                                    "unknown"
                                                  }
                                                />
                                              </Row>
                                              <Row label="Payout status">
                                                <StatusBadge status={p.status} />
                                              </Row>
                                              <Row label="Paid on">
                                                {p.paid_at
                                                  ? formatDate(p.paid_at)
                                                  : "Not paid yet"}
                                              </Row>
                                            </dl>
                                            <Link
                                              href={`/host/bookings?status=completed&booking=${encodeURIComponent(p.booking_id)}#host-booking-${p.booking_id}`}
                                              className={`mt-3 inline-block ${linkClass}`}
                                            >
                                              Open booking
                                            </Link>
                                          </div>

                                          {/* Stay and guest */}
                                          <div className="rounded-xl border border-[#E9E6DD] bg-white p-4 text-sm md:col-span-2">
                                            <SectionTitle>
                                              Stay and guest
                                            </SectionTitle>
                                            <dl className="grid gap-x-8 sm:grid-cols-2">
                                              <div className="divide-y divide-[#F1EFE8]">
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
                                                    {p.booking?.guest_name ??
                                                      "View booking"}
                                                  </Link>
                                                  {p.booking?.guest_country
                                                    ? `, ${p.booking.guest_country}`
                                                    : ""}
                                                </Row>
                                              </div>
                                              <div className="divide-y divide-[#F1EFE8]">
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
                                              </div>
                                            </dl>
                                            {p.booking?.special_requests && (
                                              <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#F7F5EF] p-3 text-xs leading-5 text-gray-700">
                                                <span className="font-medium">
                                                  Guest request:
                                                </span>{" "}
                                                {p.booking.special_requests}
                                              </p>
                                            )}
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
              <div
                id="panel-requests"
                role="tabpanel"
                aria-labelledby="tab-requests"
              >
                {payoutRequests.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-[#12231d]">
                      No payout requests yet
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">
                      When you request a withdrawal, you can follow it here
                      from request to payment.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F1EFE8]">
                    {payoutRequests.map((request) => {
                      const isPaid = request.status === "paid";
                      const fees = Math.max(
                        Number(request.amount) -
                          Number(request.net_amount ?? 0),
                        0,
                      );
                      return (
                        <li key={request.id} className="px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
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
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-semibold tabular-nums text-[#12231d]">
                                {kes(request.amount)}
                              </p>
                              <StatusBadge status={request.status} />
                            </div>
                          </div>

                          {(isPaid || request.external_reference) && (
                            <dl className="mt-3 grid gap-3 rounded-xl bg-[#F7F5EF] p-3.5 text-sm sm:grid-cols-3">
                              {isPaid && (
                                <>
                                  <div>
                                    <dt className="text-xs text-gray-600">
                                      Fees
                                    </dt>
                                    <dd className="mt-0.5 font-medium tabular-nums text-gray-900">
                                      − {kes(fees)}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-gray-600">
                                      You received
                                    </dt>
                                    <dd className="mt-0.5 font-semibold tabular-nums text-[#12231d]">
                                      {kes(request.net_amount)}
                                    </dd>
                                  </div>
                                </>
                              )}
                              {request.external_reference && (
                                <div>
                                  <dt className="text-xs text-gray-600">
                                    M-Pesa reference
                                  </dt>
                                  <dd className="mt-0.5 break-all font-medium text-gray-900">
                                    {request.external_reference}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          )}

                          {request.status === "reversed" && (
                            <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
                              This payment was returned. The processing fee will
                              be taken from a future payout.
                            </p>
                          )}
                          {request.admin_note && (
                            <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-sm leading-5 text-blue-900">
                              <span className="font-semibold">
                                Message from admin:
                              </span>{" "}
                              {request.admin_note}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Phones: the explainer folds away at the bottom */}
          <details className={`group lg:hidden ${CARD}`}>
            <summary
              className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm font-semibold text-[#12231d] [&::-webkit-details-marker]:hidden ${FOCUS}`}
            >
              How payouts work
              <ChevronDown
                className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-[#F1EFE8] px-5 py-4">
              <HowItWorksList />
            </div>
          </details>
        </div>

        {/* ============ SIDEBAR ============
            On phones the balance comes first so the main action is at the top.
            On large screens it stays in view while the history scrolls. */}
        <aside
          aria-label="Balance and withdrawals"
          className="order-first space-y-4 lg:sticky lg:top-6 lg:order-none lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1"
        >
          <section
            aria-label="Available to withdraw"
            className={`overflow-hidden ${CARD}`}
          >
            <div className="bg-[#12231d] p-5 text-white">
              <p className="text-sm font-medium text-white/70">
                Available to withdraw
              </p>
              <p className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight">
                {kes(requestableAmount)}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/70">
                {phoneTail
                  ? `Sent to your M-Pesa number ending in ${phoneTail}.`
                  : "You'll enter your M-Pesa number when you request."}
              </p>
            </div>
            <div className="space-y-3 p-5">
              <RequestPayoutButton
                key={`${requestableAmount}-${payoutPhone}`}
                amount={requestableAmount}
                initialPhone={payoutPhone}
                onRequested={() => setReloadToken((token) => token + 1)}
              />
              <p className="text-xs leading-5 text-gray-600">
                You can request any amount up to your balance. Payout
                processing fees may reduce what reaches your M-Pesa number.
              </p>
              {feeBalance !== 0 && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
                  <Info
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {feeBalance > 0
                      ? "Processing fees due"
                      : "Processing fee credit"}
                    : {kes(Math.abs(feeBalance))}
                  </span>
                </p>
              )}
            </div>
          </section>

          <section
            aria-labelledby="how-payouts-work-heading"
            className={`hidden p-5 lg:block ${CARD}`}
          >
            <h2
              id="how-payouts-work-heading"
              className="mb-3 text-base font-semibold text-[#12231d]"
            >
              How payouts work
            </h2>
            <HowItWorksList />
          </section>

          <section
            aria-label="Help"
            className={`hidden items-start gap-3 p-5 lg:flex ${CARD}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF5F8] text-[#a3124a]">
              <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#12231d]">
                A payment looks wrong?
              </p>
              <p className="mt-0.5 text-sm text-gray-600">
                <Link href="/account/support" className={linkClass}>
                  Contact support
                </Link>{" "}
                and include the booking reference.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}