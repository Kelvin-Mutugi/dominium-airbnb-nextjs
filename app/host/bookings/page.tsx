// app/host/bookings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { formatCheckoutTime, formatDate, isCheckoutTimeReached, todayISO } from "@/app/lib/format";
import {
  getHostBookingChangeRequestsData,
  getHostBookingsData,
  respondToBookingChangeRequest,
  updateHostBookingStatus,
} from "@/app/lib/host/actions";
import type { Booking, BookingStatus, HostBookingChangeRequest } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";
import { RefundProgressPanel } from "@/components/refunds/RefundProgressPanel";

const FILTERS: { label: string; value: Exclude<BookingStatus, "pending"> }[] = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function HostBookingsPage() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [changeRequests, setChangeRequests] = useState<HostBookingChangeRequest[]>([]);
  const [filter, setFilter] = useState<Exclude<BookingStatus, "pending">>("confirmed");
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);

  // Initial page loading
  const [loading, setLoading] = useState(true);

  // ID of the booking currently being updated
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status being applied to the booking
  const [updatingStatus, setUpdatingStatus] =
    useState<BookingStatus | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [dateChangeDeclineReasons, setDateChangeDeclineReasons] = useState<Record<string, string>>({});

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
    status: Exclude<BookingStatus, "pending"> = filter,
    refreshRequests = true,
  ) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const [data, requests] = await Promise.all([
        getHostBookingsData(status),
        refreshRequests ? getHostBookingChangeRequestsData() : Promise.resolve(null),
      ]);
      setBookings(data);
      if (requests) setChangeRequests(requests);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      setError("We couldn't load your bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedStatus = searchParams.get("status");
    const matchingFilter = FILTERS.find((item) => item.value === requestedStatus);
    const initialFilter = matchingFilter?.value ?? "confirmed";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilter(initialFilter);
    void load(true, initialFilter);
    setFocusBookingId(searchParams.get("booking"));
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
      setError(err instanceof Error ? err.message : "We couldn't update this booking. Please try again.");
    } finally {
      setUpdatingId(null);
      setUpdatingStatus(null);
    }
  }

  async function handleRequestResponse(
    requestId: string,
    approve: boolean,
    declineReason = '',
  ) {
    if (updatingRequestId) return;
    setUpdatingRequestId(requestId);
    setError(null);
    setSuccess(null);
    try {
      await respondToBookingChangeRequest(requestId, approve, approve ? '' : declineReason);
      await load(false, filter);
      setSuccess(approve ? "Date-change request approved." : "Date-change request declined.");
      setDateChangeDeclineReasons((current) => ({ ...current, [requestId]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't update this request.");
    } finally {
      setUpdatingRequestId(null);
    }
  }

  const visible = bookings;

  /*
   * Initial loading state
   */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-gray-200" />

        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <div
              key={f.value}
              className="h-8 w-16 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-56 rounded bg-gray-200" />
                  <div className="h-4 w-72 rounded bg-gray-200" />
                  <div className="h-4 w-64 rounded bg-gray-200" />
                </div>

                <div className="space-y-2">
                  <div className="ml-auto h-5 w-24 rounded bg-gray-200" />
                  <div className="ml-auto h-3 w-28 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#12231d]">
          Bookings
        </h1>
        <Link href="/host/date-changes" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E23E85]/30 bg-white px-3 py-2 text-sm font-semibold text-[#9C2454] hover:bg-[#FDF0F5]">
          Date changes
          {changeRequests.length > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#E23E85] px-1.5 py-0.5 text-xs font-bold text-white">
              {changeRequests.length}
            </span>
          )}
        </Link>
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => load(true)}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {changeRequests.length > 0 && (
        <section aria-labelledby="booking-change-requests-heading" className="space-y-3">
          <div>
            <h2 id="booking-change-requests-heading" className="text-lg font-semibold text-[#12231d]">Guest date-change requests</h2>
            <p className="text-sm text-gray-500">Review requested dates before updating a booking. If no decision is made by the deadline, the system may approve after checking availability and price, or decline with an explanation.</p>
          </div>
          {changeRequests.map((request) => {
            const isUpdatingRequest = updatingRequestId === request.id;
            const listing = Array.isArray(request.booking.listing) ? request.booking.listing[0] : request.booking.listing;
            return (
              <article key={request.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#12231d]">Date change · {listing?.title ?? "Booking"}</p>
                    <p className="mt-1 text-sm text-gray-600">Guest: {request.booking.guest_name ?? "Guest"}</p>
                    <p className="mt-1 text-sm text-gray-600">Current: {request.current_check_in} to {request.current_check_out}</p>
                    {request.request_type === "date_change" && request.requested_check_in && request.requested_check_out && (
                      <p className="mt-1 text-sm font-medium text-[#12231d]">Requested: {request.requested_check_in} to {request.requested_check_out}</p>
                    )}
                    {request.request_type === "date_change" && request.quoted_total_amount != null && (
                      <p className="mt-1 text-sm text-gray-600">Estimated revised total: KES {Number(request.quoted_total_amount).toLocaleString("en-KE")}. Approval is available only when the total is unchanged.</p>
                    )}
                    {request.auto_decision_at && <p className="mt-1 text-xs font-medium text-amber-800">Decision deadline: {formatDate(request.auto_decision_at, "long")}. The system will check availability and total before deciding.</p>}
                    {request.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">Guest note: {request.reason}</p>}
                    <label htmlFor={`embedded-date-change-reason-${request.id}`} className="mt-3 block max-w-lg text-xs font-medium text-gray-600">
                      Reason if declining <span className="font-normal">(required; visible to guest)</span>
                      <textarea id={`embedded-date-change-reason-${request.id}`} value={dateChangeDeclineReasons[request.id] ?? ''} onChange={(event) => setDateChangeDeclineReasons((current) => ({ ...current, [request.id]: event.target.value }))} minLength={5} maxLength={1000} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#E23E85] focus:outline-none focus:ring-2 focus:ring-[#E23E85]/20" />
                    </label>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={isUpdatingRequest || (dateChangeDeclineReasons[request.id] ?? '').trim().length < 5} onClick={() => handleRequestResponse(request.id, false, dateChangeDeclineReasons[request.id] ?? '')} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Decline</button>
                    <button type="button" disabled={isUpdatingRequest} onClick={() => handleRequestResponse(request.id, true)} className="rounded-md bg-[#12231d] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isUpdatingRequest ? "Saving…" : "Approve date change"}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                void load(true, f.value, false);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E23E85]/30 ${
                active
                  ? "bg-[#12231d] text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-[#12231d]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No bookings here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => {
            const isUpdating = updatingId === b.id;
            const latestDateChange = b.dateChangeHistory?.[0];
            const checkoutTime = formatCheckoutTime(b.listing?.check_out_time);
            const checkoutTimeReached = currentTime !== null && isCheckoutTimeReached(b.check_out, b.listing?.check_out_time, currentTime);
            const isCheckoutDateToday = currentTime !== null && b.check_out === todayISO(currentTime);
            const canMarkCompleted = b.status === "confirmed" && checkoutTimeReached;

            return (
              <div
                key={b.id}
                id={`host-booking-${b.id}`}
                className={`rounded-2xl bg-[#f5f5f7] p-4 shadow-[4px_4px_10px_rgba(27,26,46,0.08),-4px_-4px_10px_rgba(255,255,255,0.9)] transition-opacity sm:p-5 ${
                  isUpdating ? "opacity-70" : ""
                } ${
                  focusBookingId === b.id ? "outline outline-2 outline-offset-2 outline-[#E23E85]" : ""
                }`}
              >
                <header className="flex flex-col gap-2 border-b border-[#1B1A2E]/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Booking {b.booking_reference}</p>
                    <h3 className="mt-1 break-words text-lg font-semibold leading-snug text-[#12231d]">
                      {b.listing?.title ?? "Listing unavailable"}
                    </h3>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge status={b.status} />
                    {b.status === "completed" && b.completion_source && (
                      <span className="text-xs font-medium text-gray-500">
                        Completed {b.completion_source === "system" ? "automatically" : "by host"}
                      </span>
                    )}
                  </div>
                </header>

                <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_0.8fr] lg:gap-6">
                  <section aria-label="Stay dates" className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Stay</p>
                    <p className="mt-1 font-semibold text-[#1B1A2E]">{b.check_in} <span className="text-gray-400" aria-hidden="true">→</span> {b.check_out}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{b.nights} {b.nights === 1 ? "night" : "nights"}</p>
                  </section>

                  <section aria-label="Guest details" className="min-w-0 border-t border-[#1B1A2E]/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 lg:pl-6">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Guest</p>
                    <p className="mt-1 break-words font-semibold text-[#1B1A2E]">{b.guest_name ?? "Guest"}{b.guest_country ? ` · ${b.guest_country}` : ""}</p>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {b.adults_count} {b.adults_count === 1 ? "adult" : "adults"} · {b.children_count} {b.children_count === 1 ? "child" : "children"} · {b.pets_count} {b.pets_count === 1 ? "pet" : "pets"} · {b.rooms_count} {b.rooms_count === 1 ? "room" : "rooms"}
                    </p>
                  </section>

                  <section aria-label="Host payout" className="flex items-center justify-between gap-3 border-t border-[#1B1A2E]/10 pt-3 sm:col-span-2 lg:col-span-1 lg:block lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Host payout</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-[#12231d]">KES {b.host_payout_amount.toLocaleString()}</p>
                    </div>
                    <Link
                      href={`/account/support?booking=${b.id}&category=host_guest_concern`}
                      className="shrink-0 text-xs font-medium text-[#9C2454] underline underline-offset-2 lg:mt-2 lg:inline-block"
                    >
                      Report an issue
                    </Link>
                  </section>
                </div>

                {latestDateChange && (
                  <div className="mb-3 border-l-4 border-[#E23E85] bg-[#FCE8F0] px-3 py-2.5 sm:px-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#9C2454]">
                      Dates updated{(b.dateChangeHistory?.length ?? 0) > 1 ? ` · ${b.dateChangeHistory?.length} changes` : ""}
                    </p>
                    <p className="mt-1 text-sm text-[#5F2740]">
                      <span className="text-[#795365]">Previous: {latestDateChange.current_check_in} → {latestDateChange.current_check_out}</span>
                      <span className="px-1.5" aria-hidden="true">|</span>
                      <span className="font-semibold">Now: {latestDateChange.requested_check_in} → {latestDateChange.requested_check_out}</span>
                    </p>
                  </div>
                )}

                <RefundProgressPanel requests={b.refundRequests ?? []} audience="host" />

                {b.special_requests && (
                  <p className="mb-3 border-t border-[#1B1A2E]/10 pt-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Guest note: </span>{b.special_requests}
                  </p>
                )}

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1B1A2E]/10 pt-3">
                  <Link
                    href={`/host/bookings/${b.id}`}
                    className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-[#12231d] focus:outline-none focus:underline focus:underline-offset-2"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Booking support
                    {(b.unreadSupportReplyCount ?? 0) > 0 && (
                      <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454]">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E23E85]" />
                        {b.unreadSupportReplyCount === 1 ? "1 new reply" : `${b.unreadSupportReplyCount} new replies`}
                      </span>
                    )}
                  </Link>
                </footer>

                {/* Complete action */}
                {b.status === "confirmed" && (checkoutTimeReached || isCheckoutDateToday) && (
                  <p
                    role="status"
                    className={`mt-3 rounded-lg px-3 py-2 text-sm ${checkoutTimeReached ? "bg-emerald-50 font-medium text-emerald-800" : "bg-amber-50 text-amber-900"}`}
                  >
                    {checkoutTimeReached
                      ? `Scheduled check-out time (${checkoutTime} EAT) has passed. This stay is ready to complete.`
                      : `Scheduled check-out is ${checkoutTime} EAT. Completion becomes available after this time.`}
                  </p>
                )}

                {canMarkCompleted && (
                    <div className="mt-3">
                      {completingBookingId !== b.id ? (
                        <button
                          type="button"
                          disabled={Boolean(updatingId)}
                          onClick={() => setCompletingBookingId(b.id)}
                          className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#12231d]/25 px-4 py-2 text-sm font-medium text-[#12231d] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#12231d]/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Mark completed
                        </button>
                      ) : (
                        <div role="group" aria-labelledby={`complete-heading-${b.id}`} className="max-w-xl space-y-3 border-l-4 border-amber-500 bg-amber-50 p-4">
                          <div>
                            <h4 id={`complete-heading-${b.id}`} className="text-sm font-semibold text-amber-950">Confirm stay completion</h4>
                            <p className="mt-1 text-sm text-amber-900">
                              Mark {b.guest_name ?? "The guest"}&apos;s stay at {b.listing?.title ?? "this listing"} as completed? The scheduled check-out time ({checkoutTime} EAT) has passed. The payout remains on hold until 24 hours after check-out and while any support case or guest request is unresolved.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={isUpdating} onClick={() => setCompletingBookingId(null)} className="min-h-10 rounded-md border border-amber-900/20 bg-white px-3.5 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50">
                              Keep confirmed
                            </button>
                            <button type="button" disabled={isUpdating} onClick={() => void handleMarkCompleted(b.id)} className="min-h-10 rounded-md bg-[#12231d] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#294238] disabled:cursor-wait disabled:opacity-60">
                              {isUpdating && updatingStatus === "completed" ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Updating…</span> : "Yes, mark completed"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
