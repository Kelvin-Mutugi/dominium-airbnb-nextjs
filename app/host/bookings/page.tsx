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
import {
  getHostBookingChangeRequestsData,
  getHostBookingsData,
  respondToBookingChangeRequest,
  updateHostBookingStatus,
} from "@/app/lib/host/actions";
import type { Booking, BookingStatus, HostBookingChangeRequest } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

const FILTERS: { label: string; value: Exclude<BookingStatus, "pending"> }[] = [
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function HostBookingsPage() {
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

  // Error message shown to the host
  const [error, setError] = useState<string | null>(null);

  // Success message shown briefly after an action
  const [success, setSuccess] = useState<string | null>(null);

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
      setError(
        "We couldn't update this booking. Please try again."
      );
    } finally {
      setUpdatingId(null);
      setUpdatingStatus(null);
    }
  }

  async function handleRequestResponse(
    requestId: string,
    approve: boolean,
    requestType: "cancellation" | "date_change",
    estimatedRefundAmount: number,
  ) {
    if (
      approve &&
      requestType === "cancellation" &&
      !window.confirm(`Approve this cancellation? The booking will be cancelled now. The estimated KES ${estimatedRefundAmount.toLocaleString("en-KE")} refund will still need manual processing.`)
    ) return;

    if (updatingRequestId) return;
    setUpdatingRequestId(requestId);
    setError(null);
    setSuccess(null);
    try {
      await respondToBookingChangeRequest(requestId, approve);
      await load(false, filter);
      setSuccess(approve ? "Guest request approved." : "Guest request declined.");
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
            <h2 id="booking-change-requests-heading" className="text-lg font-semibold text-[#12231d]">Guest change requests</h2>
            <p className="text-sm text-gray-500">Review requested dates or cancellation before updating the booking.</p>
          </div>
          {changeRequests.map((request) => {
            const isUpdatingRequest = updatingRequestId === request.id;
            const listing = Array.isArray(request.booking.listing) ? request.booking.listing[0] : request.booking.listing;
            return (
              <article key={request.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#12231d]">{request.request_type === "cancellation" ? "Cancellation" : "Date change"} · {listing?.title ?? "Booking"}</p>
                    <p className="mt-1 text-sm text-gray-600">Guest: {request.booking.guest_name ?? "Guest"}</p>
                    <p className="mt-1 text-sm text-gray-600">Current: {request.current_check_in} to {request.current_check_out}</p>
                    {request.request_type === "date_change" && request.requested_check_in && request.requested_check_out && (
                      <p className="mt-1 text-sm font-medium text-[#12231d]">Requested: {request.requested_check_in} to {request.requested_check_out}</p>
                    )}
                    {request.request_type === "cancellation" && (
                      <p className="mt-1 text-sm text-gray-600">Estimated refund: KES {Number(request.estimated_refund_amount).toLocaleString("en-KE")} ({request.refund_percent}% of KES {Number(request.amount_paid).toLocaleString("en-KE")}); manual processing after approval.</p>
                    )}
                    {request.request_type === "date_change" && request.quoted_total_amount != null && (
                      <p className="mt-1 text-sm text-gray-600">Estimated revised total: KES {Number(request.quoted_total_amount).toLocaleString("en-KE")}. Approval is available only when the total is unchanged.</p>
                    )}
                    {request.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-500">Guest note: {request.reason}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={isUpdatingRequest} onClick={() => handleRequestResponse(request.id, false, request.request_type, Number(request.estimated_refund_amount ?? 0))} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Decline</button>
                    <button type="button" disabled={isUpdatingRequest} onClick={() => handleRequestResponse(request.id, true, request.request_type, Number(request.estimated_refund_amount ?? 0))} className="rounded-md bg-[#12231d] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isUpdatingRequest ? "Saving…" : request.request_type === "cancellation" ? "Approve cancellation" : "Approve date change"}</button>
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
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30 ${
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

            return (
              <div
                key={b.id}
                id={`host-booking-${b.id}`}
                className={`rounded-2xl bg-white p-4 shadow-sm transition-opacity ${
                  isUpdating ? "opacity-70" : ""
                } ${
                  focusBookingId === b.id ? "outline outline-2 outline-offset-2 outline-[#ec1561]" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#12231d]">
                        {b.listing?.title}
                      </h3>

                      <StatusBadge status={b.status} />
                    </div>

                    <p className="text-sm text-gray-500">
                      Booking reference: {b.booking_reference}
                    </p>

                    <p className="mt-1 text-sm text-gray-600">{b.check_in} → {b.check_out} · {b.nights} {b.nights === 1 ? "night" : "nights"}</p>
                    <p className="mt-1 text-sm text-gray-600">Guest: {b.guest_name ?? "Guest"}{b.guest_country ? ` · ${b.guest_country}` : ""}</p>
                    <p className="mt-1 text-sm text-gray-600">{b.adults_count} {b.adults_count === 1 ? "adult" : "adults"} · {b.children_count} {b.children_count === 1 ? "child" : "children"} · {b.rooms_count} {b.rooms_count === 1 ? "room" : "rooms"}</p>

                    {b.special_requests && (
                      <p className="mt-1 text-sm italic text-gray-500">
                        &quot;{b.special_requests}&quot;
                      </p>
                    )}
                    <Link
                      href={`/host/bookings/${b.id}`}
                      className="mt-2 inline-flex items-center gap-1.5 py-1 text-sm font-medium text-gray-600 transition hover:text-[#12231d] focus:outline-none focus:underline focus:underline-offset-2"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Chat with customer support
                      {(b.unreadSupportReplyCount ?? 0) > 0 && (
                        <span className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-[#9C2454]" aria-label={`${b.unreadSupportReplyCount} new customer support ${b.unreadSupportReplyCount === 1 ? 'reply' : 'replies'}`}>
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E23E85]" />
                          {b.unreadSupportReplyCount === 1 ? "New reply" : `${b.unreadSupportReplyCount} new replies`}
                        </span>
                      )}
                    </Link>
                  </div>

                  <div className="text-right text-sm">
                    <p className="text-xs text-gray-500">Host payout</p>
                    <p className="font-semibold text-[#12231d]">KES {b.host_payout_amount.toLocaleString()}</p>
                    <Link
                      href={`/account/support?booking=${b.id}&category=host_guest_concern`}
                      className="mt-2 inline-block text-xs font-medium text-[#ec1561] underline underline-offset-2"
                    >
                      Report a problem or dispute
                    </Link>
                  </div>
                </div>

                {/* Complete action */}
                {b.status === "confirmed" &&
                  new Date(b.check_out) < new Date() && (
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
                              Mark {b.guest_name ?? "The guest"}&apos;s stay at {b.listing?.title ?? "this listing"} as completed? Check-out was {new Date(`${b.check_out}T00:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}. Only continue if the guest has checked out and the stay has ended. This records the completed stay in your payout history.
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
