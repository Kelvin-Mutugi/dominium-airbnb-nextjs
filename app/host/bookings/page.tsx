// app/host/bookings/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import {
  getHostBookingsData,
  updateHostBookingStatus,
} from "@/app/lib/host/actions";
import type { Booking, BookingStatus } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";

const FILTERS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);

  // Initial page loading
  const [loading, setLoading] = useState(true);

  // ID of the booking currently being updated
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status being applied to the booking
  const [updatingStatus, setUpdatingStatus] =
    useState<BookingStatus | null>(null);

  // Error message shown to the host
  const [error, setError] = useState<string | null>(null);

  // Success message shown briefly after an action
  const [success, setSuccess] = useState<string | null>(null);

  async function load(showLoader = false) {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      const data = await getHostBookingsData();
      setBookings(data);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      setError("We couldn't load your bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
    const searchParams = new URLSearchParams(window.location.search);
    const requestedStatus = searchParams.get("status");
    const matchingFilter = FILTERS.find((item) => item.value === requestedStatus);
    if (matchingFilter && matchingFilter.value !== "all") {
      setFilter(matchingFilter.value);
    }
    setFocusBookingId(searchParams.get("booking"));
  }, []);

  useEffect(() => {
    if (loading || !focusBookingId) return;
    document
      .getElementById(`host-booking-${focusBookingId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, focusBookingId]);

  async function handleStatusChange(
    id: string,
    status: BookingStatus
  ) {
    // Prevent accidental double clicks
    if (updatingId) return;

    setUpdatingId(id);
    setUpdatingStatus(status);
    setError(null);
    setSuccess(null);

    try {
      await updateHostBookingStatus(id, status);

      // Refresh bookings after successful update
      await load();

      const message =
        status === "confirmed"
          ? "Booking confirmed successfully."
          : status === "cancelled"
            ? "Booking declined."
            : "Booking marked as completed.";

      setSuccess(message);

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

  const visible = bookings.filter(
    (b) => filter === "all" || b.status === filter
  );

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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
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
                      {b.check_in} → {b.check_out} ·{" "}
                      {b.guests_count} guests
                      {b.children_count > 0 &&
                        ` + ${b.children_count} children`}{" "}
                      · {b.rooms_count} room(s)
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Guest: {b.guest_name}
                      {b.guest_phone && ` · ${b.guest_phone}`}
                      {b.guest_email && ` · ${b.guest_email}`}
                    </p>

                    {b.special_requests && (
                      <p className="mt-1 text-sm italic text-gray-500">
                        &quot;{b.special_requests}&quot;
                      </p>
                    )}
                  </div>

                  <div className="text-right text-sm">
                    <p className="font-semibold text-[#12231d]">
                      KES {b.total_amount.toLocaleString()}
                    </p>

                    <p className="text-xs text-gray-400">
                      You get KES{" "}
                      {b.host_payout_amount.toLocaleString()}
                    </p>
                    <Link
                      href={`/account/support?booking=${b.id}&category=host_guest_concern`}
                      className="mt-2 inline-block text-xs font-medium text-[#ec1561] underline underline-offset-2"
                    >
                      Report a stay issue
                    </Link>
                  </div>
                </div>

                {/* Pending actions */}
                {b.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    {/* Confirm */}
                    <button
                      disabled={isUpdating}
                      onClick={() =>
                        handleStatusChange(b.id, "confirmed")
                      }
                      className="flex items-center justify-center gap-2 rounded-lg bg-[#ec1561] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#d91459] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating &&
                      updatingStatus === "confirmed" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirm
                        </>
                      )}
                    </button>

                    {/* Decline */}
                    <button
                      disabled={isUpdating}
                      onClick={() =>
                        handleStatusChange(b.id, "cancelled")
                      }
                      className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating &&
                      updatingStatus === "cancelled" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Declining...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Decline
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Complete action */}
                {b.status === "confirmed" &&
                  new Date(b.check_out) < new Date() && (
                    <div className="mt-3">
                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          handleStatusChange(
                            b.id,
                            "completed"
                          )
                        }
                        className="flex items-center justify-center gap-2 rounded-lg border px-4 py-1.5 text-sm font-medium text-[#12231d] transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#12231d]/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating &&
                        updatingStatus === "completed" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Mark completed
                          </>
                        )}
                      </button>
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
