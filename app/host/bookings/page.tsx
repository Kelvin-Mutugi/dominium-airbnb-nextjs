// app/host/bookings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Loader2,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import {
  formatCheckoutTime,
  formatDate,
  isCheckoutTimeReached,
  todayISO,
} from "@/app/lib/format";
import {
  getHostBookingChangeRequestsData,
  getHostBookingsData,
  respondToBookingChangeRequest,
  updateHostBookingStatus,
} from "@/app/lib/host/actions";
import type {
  Booking,
  BookingStatus,
  HostBookingPayoutStatus,
  HostBookingChangeRequest,
} from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";
import { RefundProgressPanel } from "@/components/refunds/RefundProgressPanel";

const FILTERS: { label: string; value: BookingStatus }[] = [
  { label: "Payment holds", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const EMPTY_COPY: Record<string, string> = {
  pending:
    "Active holds awaiting guest M-Pesa payment appear here. Expired holds move to the Cancelled filter.",
  confirmed: "Confirmed bookings will show up here as soon as guests pay.",
  completed: "Stays you have finished will be listed here.",
  cancelled: "Cancelled bookings will be listed here.",
};

/* Shared look: cream borders, white cards, dark green text, crimson accent */
const CARD =
  "rounded-2xl border border-[#E9E6DD] bg-white shadow-[0_1px_2px_rgba(18,35,29,0.04)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3124a]";

/* Same column layout for the list header and every row */
const ROW_GRID =
  "sm:grid sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] sm:items-center sm:gap-x-5";

function formatDay(value: string | null | undefined, withYear = false) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function DetailRow({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right ${
          strong ? "font-semibold text-[#12231d]" : "text-gray-900"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "green" | "pink" | "amber" | "grey";
  children: ReactNode;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    pink: "bg-[#FFF5F8] text-[#a3124a] ring-[#a3124a]/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    grey: "bg-[#F7F5EF] text-gray-600 ring-[#E9E6DD]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const HOST_PAYOUT_STATUS: Record<
  HostBookingPayoutStatus,
  { label: string; tone: "green" | "pink" | "amber" | "grey" }
> = {
  not_released: { label: "Not released yet", tone: "grey" },
  under_review: { label: "Under review", tone: "amber" },
  available: { label: "Available", tone: "green" },
  requested: { label: "Requested", tone: "pink" },
  processing: { label: "Processing", tone: "pink" },
  partially_requested: { label: "Partially requested", tone: "pink" },
  partially_paid: { label: "Partially paid", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
};

function SideStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-[#12231d]">
        {value}
      </dd>
    </div>
  );
}

export default function HostBookingsPage() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [changeRequests, setChangeRequests] = useState<
    HostBookingChangeRequest[]
  >([]);
  const [filter, setFilter] = useState<BookingStatus>("confirmed");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const loadRequestId = useRef(0);

  // Initial page loading
  const [loading, setLoading] = useState(true);

  // ID of the booking currently being updated
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status being applied to the booking
  const [updatingStatus, setUpdatingStatus] = useState<BookingStatus | null>(
    null,
  );
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(
    null,
  );
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(
    null,
  );
  const [dateChangeDeclineReasons, setDateChangeDeclineReasons] = useState<
    Record<string, string>
  >({});

  // Error message shown to the host
  const [error, setError] = useState<string | null>(null);

  // Success message shown briefly after an action
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const updateClock = () => setCurrentTime(new Date());
    updateClock();
    const intervalId = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function load(
    showLoader = false,
    status: BookingStatus = filter,
    refreshRequests = true,
  ) {
    const requestId = ++loadRequestId.current;
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const [data, requests] = await Promise.all([
        getHostBookingsData(status),
        refreshRequests
          ? getHostBookingChangeRequestsData()
          : Promise.resolve(null),
      ]);
      if (requestId !== loadRequestId.current) return;
      setBookings(data);
      if (requests) setChangeRequests(requests);
    } catch (err) {
      if (requestId !== loadRequestId.current) return;
      console.error("Failed to load bookings:", err);
      setError("We couldn't load your bookings. Please try again.");
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedStatus = searchParams.get("status");
    const matchingFilter = FILTERS.find(
      (item) => item.value === requestedStatus,
    );
    const initialFilter = matchingFilter?.value ?? "confirmed";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilter(initialFilter);
    void load(true, initialFilter);
    const requestedBooking = searchParams.get("booking");
    setFocusBookingId(requestedBooking);
    // A booking linked from another page opens straight away
    setExpandedId(requestedBooking);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || !focusBookingId) return;
    document
      .getElementById(`host-booking-${focusBookingId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusBookingId]);

  async function handleMarkCompleted(id: string) {
    // Prevent accidental double clicks
    if (updatingId) return;

    setUpdatingId(id);
    setUpdatingStatus("completed");
    setError(null);
    setSuccess(null);

    try {
      await updateHostBookingStatus(id, "completed");

      // Refresh bookings after successful update
      await load(false, filter, false);

      setSuccess("Booking marked as completed.");
      setCompletingBookingId(null);

      // Remove success message after a short delay
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to update booking:", err);
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't update this booking. Please try again.",
      );
    } finally {
      setUpdatingId(null);
      setUpdatingStatus(null);
    }
  }

  async function handleRequestResponse(
    requestId: string,
    approve: boolean,
    declineReason = "",
  ) {
    if (updatingRequestId) return;
    setUpdatingRequestId(requestId);
    setError(null);
    setSuccess(null);
    try {
      await respondToBookingChangeRequest(
        requestId,
        approve,
        approve ? "" : declineReason,
      );
      await load(false, filter);
      setSuccess(
        approve
          ? "Date-change request approved."
          : "Date-change request declined.",
      );
      setDateChangeDeclineReasons((current) => ({
        ...current,
        [requestId]: "",
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't update this request.",
      );
    } finally {
      setUpdatingRequestId(null);
    }
  }

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visible = normalizedSearch
    ? bookings.filter((booking) =>
        [
          booking.booking_reference,
          booking.id,
          booking.listing?.title,
          booking.guest_name,
          booking.guest_country,
          booking.check_in,
          booking.check_out,
        ]
          .filter((value): value is string => Boolean(value))
          .some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch),
          ),
      )
    : bookings;

  /*
   * Sidebar summary, worked out from the bookings already loaded
   */
  const todayStr = currentTime ? todayISO(currentTime) : null;
  const totalPayout = visible.reduce(
    (sum, booking) => sum + Number(booking.host_payout_amount ?? 0),
    0,
  );
  const nextCheckIn = todayStr
    ? [...visible]
        .filter((b) => b.status === "confirmed" && b.check_in >= todayStr)
        .sort((a, b) => a.check_in.localeCompare(b.check_in))[0]
    : undefined;
  const checkInsToday = todayStr
    ? visible.filter((b) => b.status === "confirmed" && b.check_in === todayStr)
        .length
    : 0;
  const checkOutsToday = todayStr
    ? visible.filter(
        (b) => b.status === "confirmed" && b.check_out === todayStr,
      ).length
    : 0;
  const filterLabel =
    FILTERS.find((item) => item.value === filter)?.label.toLowerCase() ??
    filter;

  /*
   * Initial loading state
   */
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-[#EFEBE0]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[#EFEBE0]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="h-11 animate-pulse rounded-xl bg-[#EFEBE0]" />
            <div className={`divide-y divide-[#F1EFE8] ${CARD}`}>
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex animate-pulse items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded bg-[#EFEBE0]" />
                    <div className="h-3 w-56 rounded bg-[#EFEBE0]" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-[#EFEBE0]" />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden space-y-4 lg:block">
            <div className={`h-40 animate-pulse ${CARD}`} />
            <div className={`h-48 animate-pulse ${CARD}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Host portal / Bookings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#12231d] sm:text-3xl">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Pending bookings are temporary M-Pesa payment holds, not host approval requests. Holds expire after 10 minutes and are cancelled if payment is not verified.
          </p>
        </div>
        <Link
          href="/host/date-changes"
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E9E6DD] bg-white px-4 py-2 text-sm font-semibold text-[#12231d] shadow-[0_1px_2px_rgba(18,35,29,0.04)] transition hover:bg-[#FFF5F8] ${FOCUS}`}
        >
          <CalendarClock
            className="h-4 w-4 text-[#a3124a]"
            aria-hidden="true"
          />
          All date changes
          {changeRequests.length > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#a3124a] px-1.5 py-0.5 text-xs font-bold text-white">
              {changeRequests.length}
            </span>
          )}
        </Link>
      </div>

      {/* Success message */}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>

          <button
            onClick={() => load(true)}
            className={`shrink-0 rounded font-semibold underline underline-offset-2 hover:no-underline ${FOCUS}`}
          >
            Try again
          </button>
        </div>
      )}

      {/* Two columns on large screens: bookings left, sidebar right */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ============ MAIN COLUMN ============ */}
        <div className="min-w-0 space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block w-full sm:flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <span className="sr-only">Search bookings</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by guest, listing, reference or date"
                className="min-h-11 w-full rounded-xl border border-[#E9E6DD] bg-white py-2 pl-10 pr-10 text-sm text-[#12231d] placeholder:text-gray-400 focus:border-[#a3124a] focus:outline-none focus:ring-2 focus:ring-[#a3124a]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear booking search"
                  title="Clear search"
                  className={`absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${FOCUS}`}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </label>

            <div
              role="group"
              aria-label="Filter bookings by status"
              className="inline-flex w-full gap-1 overflow-x-auto rounded-full border border-[#E9E6DD] bg-white p-1 sm:w-auto"
            >
              {FILTERS.map((f) => {
                const active = filter === f.value;

                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilter(f.value);
                      setExpandedId(null);
                      void load(true, f.value, false);
                    }}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${FOCUS} ${
                      active
                        ? "bg-[#12231d] text-white"
                        : "text-gray-600 hover:bg-[#F7F5EF] hover:text-[#12231d]"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* One-line summary for phones (the sidebar card is hidden there) */}
          <p className="text-sm text-gray-500 lg:hidden">
            {visible.length} {filterLabel}{" "}
            {visible.length === 1 ? "booking" : "bookings"}
            {visible.length > 0 &&
              filter !== "pending" &&
              ` · KES ${totalPayout.toLocaleString("en-KE")} host payout total`}
          </p>

          {/* Empty state */}
          {visible.length === 0 ? (
            <div
              className={`flex flex-col items-center px-6 py-14 text-center ${CARD}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F7F5EF] text-gray-500">
                <Inbox className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 font-semibold text-[#12231d]">
                {normalizedSearch
                  ? "No bookings match your search"
                  : `No ${filterLabel} bookings`}
              </p>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                {normalizedSearch
                  ? "Check the spelling, or try a guest name, listing or booking reference."
                  : EMPTY_COPY[filter]}
              </p>
              {normalizedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`mt-4 rounded-xl border border-[#E9E6DD] px-4 py-2 text-sm font-semibold text-[#a3124a] hover:bg-[#FFF5F8] ${FOCUS}`}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className={`overflow-hidden ${CARD}`}>
              {/* Column labels (large screens) */}
              <div
                aria-hidden="true"
                className={`hidden border-b border-[#E9E6DD] bg-[#F7F5EF] px-5 py-2.5 text-xs font-medium text-gray-500 ${ROW_GRID}`}
              >
                <span>Guest and listing</span>
                <span>Stay</span>
                <span>{filter === "pending" ? "Potential payout" : "Host payout"}</span>
                <span className="w-[7.5rem]">Status</span>
              </div>

              <ul className="divide-y divide-[#F1EFE8]">
                {visible.map((b) => {
                  const isUpdating = updatingId === b.id;
                  const expanded = expandedId === b.id;
                  const latestDateChange = b.dateChangeHistory?.[0];
                  const checkoutTime = formatCheckoutTime(
                    b.listing?.check_out_time,
                  );
                  const checkoutTimeReached =
                    currentTime !== null &&
                    isCheckoutTimeReached(
                      b.check_out,
                      b.listing?.check_out_time,
                      currentTime,
                    );
                  const isCheckoutDateToday =
                    currentTime !== null &&
                    b.check_out === todayISO(currentTime);
                  const canMarkCompleted =
                    b.status === "confirmed" && checkoutTimeReached;
                  const isPaid =
                    b.paymentStatus === "paid" || b.paymentStatus === "success";
                  const isRefunded = b.paymentStatus === "refunded";
                  const isPaymentPending = b.paymentStatus === "pending";
                  const isPaymentFailed = b.paymentStatus === "failed";
                  const holdExpiryTime = b.hold_expires_at
                    ? Date.parse(b.hold_expires_at)
                    : Number.NaN;
                  const paymentHoldExpired =
                    b.status === "pending" &&
                    currentTime !== null &&
                    Number.isFinite(holdExpiryTime) &&
                    holdExpiryTime <= currentTime.getTime();
                  const payoutStatus =
                    HOST_PAYOUT_STATUS[b.hostPayoutStatus ?? "not_released"];
                  const extras = b.selectedOptionalFees;
                  const unread = b.unreadSupportReplyCount ?? 0;

                  return (
                    <li
                      key={b.id}
                      id={`host-booking-${b.id}`}
                      className={`scroll-mt-6 transition-opacity ${
                        isUpdating ? "opacity-70" : ""
                      } ${
                        focusBookingId === b.id
                          ? "ring-2 ring-inset ring-[#a3124a]"
                          : ""
                      }`}
                    >
                      {/* ---------- Summary row ---------- */}
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={`booking-details-${b.id}`}
                        onClick={() => setExpandedId(expanded ? null : b.id)}
                        className={`block w-full px-4 py-4 text-left transition-colors hover:bg-[#FBFAF6] sm:px-5 ${ROW_GRID} ${
                          expanded ? "bg-[#FBFAF6]" : ""
                        } ${FOCUS} focus-visible:-outline-offset-2`}
                      >
                        {/* Guest + listing + flags */}
                        <span className="block min-w-0">
                          <span className="block truncate font-semibold text-[#12231d]">
                            {b.guest_name ?? "Guest"}
                            {b.guest_country ? (
                              <span className="font-normal text-gray-500">
                                {" "}
                                ({b.guest_country})
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-gray-600">
                            {b.listing?.title ?? "Listing unavailable"}
                          </span>
                          {(canMarkCompleted ||
                            unread > 0 ||
                            latestDateChange ||
                            isPaymentPending ||
                            isPaymentFailed ||
                            paymentHoldExpired) && (
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {canMarkCompleted && (
                                <Chip tone="green">Ready to complete</Chip>
                              )}
                              {unread > 0 && (
                                <Chip tone="pink">
                                  {unread === 1
                                    ? "1 new reply"
                                    : `${unread} new replies`}
                                </Chip>
                              )}
                              {latestDateChange && (
                                <Chip tone="grey">Dates changed</Chip>
                              )}
                              {isPaymentPending && (
                                <Chip tone="amber">Guest payment pending</Chip>
                              )}
                              {isPaymentFailed && (
                                <Chip tone="amber">Guest payment failed</Chip>
                              )}
                              {paymentHoldExpired && (
                                <Chip tone="amber">Payment hold expired</Chip>
                              )}
                            </span>
                          )}
                        </span>

                        {/* Dates */}
                        <span className="mt-3 block sm:mt-0">
                          <span className="block text-sm font-medium text-[#12231d]">
                            {formatDay(b.check_in)}{" "}
                            <span className="text-gray-400" aria-hidden="true">
                              →
                            </span>{" "}
                            {formatDay(b.check_out)}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {b.nights} {b.nights === 1 ? "night" : "nights"}
                          </span>
                        </span>

                        {/* Payout */}
                        <span className="mt-2 block min-w-0 sm:mt-0">
                          <span className="block text-sm font-semibold tabular-nums text-[#12231d]">
                            KES {b.host_payout_amount.toLocaleString()}
                          </span>
                          <span className="mt-1 block">
                            <Chip tone={payoutStatus.tone}>
                              {payoutStatus.label}
                            </Chip>
                          </span>
                        </span>

                        {/* Status + chevron */}
                        <span className="mt-3 flex items-center justify-between gap-2 sm:mt-0 sm:w-[7.5rem]">
                          <StatusBadge status={b.status} />
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                              expanded ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          />
                        </span>
                      </button>

                      {/* ---------- Details ---------- */}
                      {expanded && (
                        <div
                          id={`booking-details-${b.id}`}
                          className="space-y-5 border-t border-[#F1EFE8] bg-[#FBFAF6] px-4 py-5 sm:px-5"
                        >
                          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
                            <section aria-label="Stay and guest">
                              <h4 className="text-sm font-semibold text-[#12231d]">
                                Stay and guest
                              </h4>
                              <dl className="mt-1 divide-y divide-[#E9E6DD] text-sm">
                                <DetailRow label="Check-in">
                                  {formatDay(b.check_in, true)}
                                </DetailRow>
                                <DetailRow label="Check-out">
                                  {formatDay(b.check_out, true)}
                                </DetailRow>
                                <DetailRow label="Nights">{b.nights}</DetailRow>
                                <DetailRow label="Guest">
                                  {b.guest_name ?? "Guest"}
                                  {b.guest_country
                                    ? `, ${b.guest_country}`
                                    : ""}
                                </DetailRow>
                                <DetailRow label="Party">
                                  {b.adults_count}{" "}
                                  {b.adults_count === 1 ? "adult" : "adults"},{" "}
                                  {b.children_count}{" "}
                                  {b.children_count === 1
                                    ? "child"
                                    : "children"}
                                  , {b.pets_count}{" "}
                                  {b.pets_count === 1 ? "pet" : "pets"}
                                </DetailRow>
                                <DetailRow label="Rooms">
                                  {b.rooms_count}
                                </DetailRow>
                                <DetailRow label="Reference">
                                  {b.booking_reference}
                                </DetailRow>
                              </dl>
                            </section>

                            <section aria-label="Host payout and guest payment">
                              <h4 className="text-sm font-semibold text-[#12231d]">
                                Host payout and guest payment
                              </h4>
                              <dl className="mt-1 divide-y divide-[#E9E6DD] text-sm">
                                <DetailRow label="Host payout amount" strong>
                                  <span className="tabular-nums">
                                    KES {b.host_payout_amount.toLocaleString()}
                                  </span>
                                </DetailRow>
                                <DetailRow label="Host payout status">
                                  <Chip tone={payoutStatus.tone}>
                                    {payoutStatus.label}
                                  </Chip>
                                </DetailRow>
                                <DetailRow label="Guest payment">
                                  <span
                                    className={`font-medium ${
                                      isPaid
                                        ? "text-emerald-700"
                                        : isRefunded
                                          ? "text-amber-800"
                                          : "text-gray-600"
                                    }`}
                                  >
                                    {isPaid
                                      ? "Received"
                                      : isRefunded
                                        ? "Refunded"
                                        : isPaymentPending
                                          ? "Pending"
                                          : isPaymentFailed
                                            ? "Failed"
                                            : b.paymentStatus
                                              ? `Payment status: ${b.paymentStatus.replaceAll("_", " ")}`
                                              : "Status unavailable"}
                                  </span>
                                </DetailRow>
                                {isPaid && b.paymentPaidAt && (
                                  <DetailRow label="Guest paid on">
                                    {formatDate(b.paymentPaidAt, "long")}
                                  </DetailRow>
                                )}
                              </dl>

                              <h5 className="mt-4 text-sm font-semibold text-[#12231d]">
                                Extras the guest chose
                              </h5>
                              {extras === null || extras === undefined ? (
                                <p className="mt-1 text-sm text-gray-500">
                                  We couldn&apos;t load the extras for this
                                  booking.
                                </p>
                              ) : extras.length === 0 ? (
                                <p className="mt-1 text-sm text-gray-500">
                                  None.
                                </p>
                              ) : (
                                <ul className="mt-1 divide-y divide-[#E9E6DD] text-sm">
                                  {extras.map((fee) => (
                                    <li
                                      key={`${fee.name}-${fee.frequency}`}
                                      className="flex flex-wrap items-baseline justify-between gap-x-4 py-2"
                                    >
                                      <span className="text-gray-900">
                                        {fee.name}
                                        <span className="ml-2 text-xs text-gray-500">
                                          {fee.frequency === "per_night"
                                            ? `KES ${Number(fee.unitAmount).toLocaleString("en-KE")} per night`
                                            : "per booking"}
                                        </span>
                                      </span>
                                      <span className="tabular-nums text-gray-900">
                                        KES{" "}
                                        {Number(fee.amount).toLocaleString(
                                          "en-KE",
                                        )}
                                        <span
                                          className={`ml-2 text-xs font-medium ${
                                            isPaid
                                              ? "text-emerald-700"
                                              : isRefunded
                                                ? "text-amber-800"
                                                : "text-gray-500"
                                          }`}
                                        >
                                          {isPaid
                                            ? "Paid by guest"
                                            : isRefunded
                                              ? "Refunded"
                                              : isPaymentPending
                                                ? "Pending"
                                                : isPaymentFailed
                                                  ? "Unpaid"
                                                  : "Status unavailable"}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </section>
                          </div>

                          {/* Things that need a look, only when they exist */}
                          {latestDateChange && (
                            <div className="flex gap-3 rounded-xl bg-[#FFF5F8] px-4 py-3 ring-1 ring-inset ring-[#a3124a]/15">
                              <CalendarClock
                                className="mt-0.5 h-4 w-4 shrink-0 text-[#a3124a]"
                                aria-hidden="true"
                              />
                              <div className="text-sm">
                                <p className="font-semibold text-[#12231d]">
                                  Dates were changed
                                  {(b.dateChangeHistory?.length ?? 0) > 1
                                    ? ` (${b.dateChangeHistory?.length} times)`
                                    : ""}
                                </p>
                                <p className="mt-0.5 text-gray-600">
                                  Before:{" "}
                                  {formatDay(latestDateChange.current_check_in)}{" "}
                                  →{" "}
                                  {formatDay(latestDateChange.current_check_out)}
                                </p>
                                <p className="font-medium text-[#12231d]">
                                  Now:{" "}
                                  {formatDay(
                                    latestDateChange.requested_check_in,
                                  )}{" "}
                                  →{" "}
                                  {formatDay(
                                    latestDateChange.requested_check_out,
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          <RefundProgressPanel
                            requests={b.refundRequests ?? []}
                            audience="host"
                          />

                          {b.status === "pending" && (
                            <div
                              role="status"
                              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                            >
                              <p className="text-sm font-semibold text-amber-950">
                                {isPaid
                                  ? "Payment requires review"
                                  : paymentHoldExpired
                                    ? "Payment hold expired"
                                    : "Awaiting guest payment"}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-amber-900">
                                {isPaid
                                  ? "Payment is recorded, but this booking is still pending. Do not ask the guest to pay again; contact support with this booking reference."
                                  : paymentHoldExpired
                                    ? "This checkout hold expired and the reservation is not confirmed. If the guest reports being charged, do not ask them to pay again; contact support to reconcile the payment."
                                    : isPaymentFailed
                                      ? "The guest's payment attempt did not complete. No host action is needed; the booking is confirmed only after successful M-Pesa verification."
                                      : isPaymentPending
                                        ? "The guest is completing M-Pesa checkout. The booking will be confirmed automatically after Safaricom verifies payment. No host action is needed."
                                        : "This reservation is not confirmed and may still be awaiting payment. Only successful M-Pesa verification confirms it; no host decision is required."}
                              </p>
                            </div>
                          )}

                          {b.special_requests && (
                            <p className="rounded-xl border border-[#E9E6DD] bg-white px-4 py-3 text-sm text-gray-600">
                              <span className="font-medium text-[#12231d]">
                                Guest note:{" "}
                              </span>
                              {b.special_requests}
                            </p>
                          )}

                          {b.status === "confirmed" &&
                            (checkoutTimeReached || isCheckoutDateToday) && (
                              <p
                                role="status"
                                className={`rounded-xl px-4 py-3 text-sm ${
                                  checkoutTimeReached
                                    ? "bg-emerald-50 font-medium text-emerald-900"
                                    : "bg-amber-50 text-amber-900"
                                }`}
                              >
                                {checkoutTimeReached
                                  ? `Check-out time (${checkoutTime} EAT) has passed. You can now mark this stay as completed.`
                                  : `Check-out is at ${checkoutTime} EAT. You can mark this stay as completed after that.`}
                              </p>
                            )}

                          {/* Confirm completion */}
                          {canMarkCompleted && completingBookingId === b.id && (
                            <div
                              role="group"
                              aria-labelledby={`complete-heading-${b.id}`}
                              className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
                            >
                              <div>
                                <h4
                                  id={`complete-heading-${b.id}`}
                                  className="text-sm font-semibold text-amber-950"
                                >
                                  Mark this stay as completed?
                                </h4>
                                <p className="mt-1 text-sm leading-6 text-amber-900">
                                  {b.guest_name ?? "The guest"}&apos;s stay at{" "}
                                  {b.listing?.title ?? "this listing"} will be
                                  marked as done. Your payout is held until 24
                                  hours after check-out, and for longer if a
                                  support case or guest request is still open.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => setCompletingBookingId(null)}
                                  className={`min-h-11 rounded-xl border border-amber-900/20 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 ${FOCUS}`}
                                >
                                  Not yet
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => void handleMarkCompleted(b.id)}
                                  className={`min-h-11 rounded-xl bg-[#12231d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#294238] disabled:cursor-wait disabled:opacity-60 ${FOCUS}`}
                                >
                                  {isUpdating &&
                                  updatingStatus === "completed" ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                      />
                                      Updating…
                                    </span>
                                  ) : (
                                    "Yes, mark completed"
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E9E6DD] pt-4">
                            <div className="flex flex-wrap items-center gap-4">
                              <Link
                                href={`/host/bookings/${b.id}`}
                                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E9E6DD] bg-white px-4 py-2 text-sm font-semibold text-[#12231d] transition hover:bg-[#F7F5EF] ${FOCUS}`}
                              >
                                <MessageCircle
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Booking support
                                {unread > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5F8] px-2 py-0.5 text-xs font-semibold text-[#a3124a]">
                                    <span
                                      aria-hidden="true"
                                      className="h-1.5 w-1.5 rounded-full bg-[#a3124a]"
                                    />
                                    {unread === 1
                                      ? "1 new reply"
                                      : `${unread} new replies`}
                                  </span>
                                )}
                              </Link>
                              <Link
                                href={`/account/support?booking=${b.id}&category=host_guest_concern`}
                                className={`rounded text-sm font-medium text-[#a3124a] underline underline-offset-2 hover:no-underline ${FOCUS}`}
                              >
                                Report an issue
                              </Link>
                            </div>

                            {canMarkCompleted && completingBookingId !== b.id && (
                              <button
                                type="button"
                                disabled={Boolean(updatingId)}
                                onClick={() => setCompletingBookingId(b.id)}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#12231d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#294238] disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
                              >
                                <Check className="h-4 w-4" aria-hidden="true" />
                                Mark completed
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* ============ SIDEBAR ============
            On phones it sits above the bookings so requests are seen first.
            On large screens it stays in view while the list scrolls. */}
        <aside
          aria-label="Bookings sidebar"
          className="order-first space-y-4 lg:sticky lg:top-6 lg:order-none lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1"
        >
          {/* Needs your attention */}
          <section
            aria-labelledby="booking-change-requests-heading"
            className={`p-4 sm:p-5 ${CARD}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="booking-change-requests-heading"
                className="text-base font-semibold text-[#12231d]"
              >
                Needs your attention
              </h2>
              {changeRequests.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                  {changeRequests.length}
                </span>
              )}
            </div>

            {changeRequests.length === 0 ? (
              <div className="mt-3 flex items-start gap-3 rounded-xl bg-emerald-50 p-3.5">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">
                    You&apos;re all caught up
                  </p>
                  <p className="mt-0.5 text-sm text-emerald-900/80">
                    Guest requests to change dates will show up here.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-500">
                  Guests want to move their dates. If you don&apos;t reply by
                  the deadline, the system decides after checking availability
                  and price.
                </p>
                <div className="mt-3 space-y-3">
                  {changeRequests.map((request) => {
                    const isUpdatingRequest = updatingRequestId === request.id;
                    const listing = Array.isArray(request.booking.listing)
                      ? request.booking.listing[0]
                      : request.booking.listing;
                    const declineReason =
                      dateChangeDeclineReasons[request.id] ?? "";
                    return (
                      <article
                        key={request.id}
                        className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5"
                      >
                        <p className="text-sm font-semibold text-[#12231d]">
                          {listing?.title ?? "Booking"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.booking.guest_name ?? "Guest"}
                        </p>

                        <div className="mt-2.5 space-y-1.5 text-sm">
                          <p className="flex justify-between gap-2 text-gray-600">
                            <span>Now</span>
                            <span className="text-right tabular-nums">
                              {formatDay(request.current_check_in)} to{" "}
                              {formatDay(request.current_check_out)}
                            </span>
                          </p>
                          {request.request_type === "date_change" &&
                            request.requested_check_in &&
                            request.requested_check_out && (
                              <p className="flex justify-between gap-2 font-semibold text-[#12231d]">
                                <span className="text-[#a3124a]">Asked for</span>
                                <span className="text-right tabular-nums">
                                  {formatDay(request.requested_check_in)} to{" "}
                                  {formatDay(request.requested_check_out)}
                                </span>
                              </p>
                            )}
                        </div>

                        {request.request_type === "date_change" &&
                          request.quoted_total_amount != null && (
                            <p className="mt-2 text-xs text-gray-600">
                              New total about KES{" "}
                              {Number(request.quoted_total_amount).toLocaleString(
                                "en-KE",
                              )}
                              . You can only approve if the total stays the
                              same.
                            </p>
                          )}
                        {request.auto_decision_at && (
                          <p className="mt-1.5 text-xs font-medium text-amber-800">
                            Reply by{" "}
                            {formatDate(request.auto_decision_at, "long")}
                          </p>
                        )}
                        {request.reason && (
                          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white px-2.5 py-2 text-xs text-gray-600">
                            <span className="font-medium text-[#12231d]">
                              Guest note:{" "}
                            </span>
                            {request.reason}
                          </p>
                        )}

                        <button
                          type="button"
                          disabled={isUpdatingRequest}
                          onClick={() =>
                            handleRequestResponse(request.id, true)
                          }
                          className={`mt-3 min-h-10 w-full rounded-lg bg-[#12231d] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#294238] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
                        >
                          {isUpdatingRequest ? "Saving…" : "Approve date change"}
                        </button>

                        <details className="group mt-2">
                          <summary
                            className={`cursor-pointer list-none rounded-lg px-3 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-white [&::-webkit-details-marker]:hidden ${FOCUS}`}
                          >
                            <span className="group-open:hidden">
                              Decline instead
                            </span>
                            <span className="hidden group-open:inline">
                              Cancel decline
                            </span>
                          </summary>
                          <label
                            htmlFor={`embedded-date-change-reason-${request.id}`}
                            className="mt-2 block text-xs font-medium text-[#12231d]"
                          >
                            Reason (the guest will see this)
                            <textarea
                              id={`embedded-date-change-reason-${request.id}`}
                              value={declineReason}
                              onChange={(event) =>
                                setDateChangeDeclineReasons((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }))
                              }
                              minLength={5}
                              maxLength={1000}
                              rows={3}
                              placeholder="For example: those dates are already held for another guest."
                              className="mt-1 block w-full rounded-lg border border-[#E9E6DD] bg-white px-2.5 py-2 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:border-[#a3124a] focus:outline-none focus:ring-2 focus:ring-[#a3124a]/20"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={
                              isUpdatingRequest ||
                              declineReason.trim().length < 5
                            }
                            onClick={() =>
                              handleRequestResponse(
                                request.id,
                                false,
                                declineReason,
                              )
                            }
                            className={`mt-2 min-h-10 w-full rounded-lg border border-[#E9E6DD] bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F7F5EF] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
                          >
                            Send decline
                          </button>
                        </details>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* At a glance (hidden on phones; they get the one-line summary) */}
          <section
            aria-labelledby="bookings-glance-heading"
            className={`hidden p-5 lg:block ${CARD}`}
          >
            <h2
              id="bookings-glance-heading"
              className="text-base font-semibold text-[#12231d]"
            >
              At a glance
            </h2>
            <dl className="mt-3 divide-y divide-[#F1EFE8]">
              <SideStat
                label={`${filter.charAt(0).toUpperCase()}${filter.slice(1)} bookings`}
                value={visible.length}
              />
              {filter !== "pending" && (
                <SideStat
                  label="Host payout total"
                  value={`KES ${totalPayout.toLocaleString("en-KE")}`}
                />
              )}
              {filter === "confirmed" && (
                <>
                  <SideStat label="Checking in today" value={checkInsToday} />
                  <SideStat label="Checking out today" value={checkOutsToday} />
                  <SideStat
                    label="Next check-in"
                    value={
                      nextCheckIn ? (
                        <span className="block">
                          {formatDay(nextCheckIn.check_in, true)}
                          <span className="block text-xs font-normal text-gray-500">
                            {nextCheckIn.guest_name ?? "Guest"}
                          </span>
                        </span>
                      ) : (
                        <span className="font-normal text-gray-500">
                          None yet
                        </span>
                      )
                    }
                  />
                </>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}