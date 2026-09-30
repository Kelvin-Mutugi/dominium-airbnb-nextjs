// app/host/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  Pencil,
  MapPin,
} from "lucide-react";
import { getHostOverviewData } from "@/app/lib/host/actions";
import type { HostArrivalGuideDetails, HostBookingChangeRequest, Booking } from "@/app/lib/host/types";
import StatusBadge from "@/components/host/StatusBadge";
import ArrivalGuideQuickEdit from "@/components/host/ArrivalGuideQuickEdit";

export default function HostDashboardPage() {
  const [hasActiveOrDraftListings, setHasActiveOrDraftListings] = useState<boolean | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [supportReplyBookings, setSupportReplyBookings] = useState<Booking[] | null>(null);
  const [changeRequests, setChangeRequests] = useState<HostBookingChangeRequest[] | null>(null);
  const [arrivalGuides, setArrivalGuides] = useState<Record<string, HostArrivalGuideDetails | null> | null>(null);
  const [arrivalGuideError, setArrivalGuideError] = useState(false);
  const [editingArrivalBookingId, setEditingArrivalBookingId] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<{
    kyc_status?: string | null;
    kyc_rejection_reason?: string | null;
    host_verified_at?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setError(null);
        const data = await getHostOverviewData();
        if (!active) return;
        setHasActiveOrDraftListings(data.hasActiveOrDraftListings);
        setUpcoming(data.upcoming);
        setOnboardingStatus(data.onboardingStatus);
        setSupportReplyBookings(data.supportReplyBookings);
        setChangeRequests(data.changeRequests);
        setArrivalGuides(data.arrivalGuides);
        setArrivalGuideError(data.arrivalGuides === null);
      } catch (loadError) {
        console.error("Failed to load host dashboard:", loadError);
        if (active) setError("We couldn't load your dashboard. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadToken]);

  function retryLoading() {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }

  function getCheckInUrgency(checkIn: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(`${checkIn}T00:00:00`);
    const daysUntil = Math.round((checkInDate.getTime() - today.getTime()) / 86_400_000);
    if (daysUntil <= 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 3) return `In ${daysUntil} days`;
    return null;
  }

  function formatStayDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  }

  if (loading) return <p className="text-gray-500">Loading your dashboard…</p>;

  if (error) {
    return (
      <div role="alert" className="max-w-xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        <p>{error}</p>
        <button onClick={retryLoading} className="mt-3 font-semibold underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }

  const isVerified = Boolean(onboardingStatus?.host_verified_at) || onboardingStatus?.kyc_status === "approved";
  const hasNoListings = hasActiveOrDraftListings === false;
  const unreadBookings = (supportReplyBookings ?? []).filter((booking) => (booking.unreadSupportReplyCount ?? 0) > 0);
  const pendingChanges = changeRequests ?? [];
  const verificationNeedsAction = Boolean(onboardingStatus && !isVerified && onboardingStatus.kyc_status !== "pending");
  const attentionCount = pendingChanges.length + unreadBookings.length + Number(verificationNeedsAction);
  const attentionDataUnavailable = supportReplyBookings === null || changeRequests === null;

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-4">
      <header className="flex flex-col justify-between gap-5 border-b border-[#12231d]/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase text-[#b30f4b]">Host overview</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#12231d]">Your stays, at a glance</h1>
          <p className="mt-1 text-sm text-[#656a65]">
            {new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/host/calendar" className="inline-flex items-center gap-2 rounded-md border border-[#12231d]/20 bg-white px-3.5 py-2.5 text-sm font-semibold text-[#12231d] transition hover:bg-[#f9f6f1]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Calendar
          </Link>
          <Link href="/host/listings" className="inline-flex items-center gap-2 rounded-md bg-[#12231d] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243c34]">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            My listings
          </Link>
        </div>
      </header>

      {onboardingStatus && !isVerified && onboardingStatus.kyc_status === "pending" && (
        <section className="flex flex-col gap-3 border-l-4 border-amber-500 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#12231d]">Host verification is under review</h2>
            <p className="mt-1 text-sm text-gray-600">
              You can keep managing your listings while we review your application.
            </p>
          </div>
          <Link
            href="/host/pending-review"
            className="shrink-0 text-sm font-semibold text-[#12231d] underline underline-offset-4"
          >
            View application
          </Link>
        </section>
      )}

      {hasNoListings && (
        <section className="flex flex-col gap-4 border border-[#12231d]/15 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#12231d]">Your hosting setup is just getting started</h2>
            <p className="mt-1 text-sm text-[#656a65]">Listing creation and publishing are currently managed by the admin team during verification.</p>
          </div>
          <Link href="/host/listings" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#b30f4b] hover:underline">
            Check listing status <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 border border-[#E9E6DD] bg-white shadow-[0_2px_12px_rgba(27,26,46,0.045)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#12231d]/10 px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase text-[#b30f4b]">Action needed</p>
              <h2 className="mt-1 text-lg font-semibold text-[#12231d]">Needs your attention</h2>
            </div>
            {attentionCount > 0 && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#fbe7ed] px-2 text-xs font-bold tabular-nums text-[#b30f4b]">{attentionCount}</span>}
          </div>
          {attentionCount === 0 && !attentionDataUnavailable ? (
            <div className="flex items-center gap-3 px-5 py-8">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#397653]" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-[#12231d]">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-[#747873]">New requests and customer support replies will show up here.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-[#12231d]/10">
              {verificationNeedsAction && onboardingStatus && (
                <li>
                  <Link href="/host/onboarding" className="flex items-center gap-3 px-4 py-4 transition hover:bg-[#fbf9f5] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ec1561]/40 sm:px-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff0d8] text-[#9a5b00]"><AlertTriangle className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#12231d]">{onboardingStatus.kyc_status === "rejected" ? "Update your host verification" : "Complete host verification"}</span>
                      <span className="mt-1 block truncate text-sm text-[#747873]">{onboardingStatus.kyc_rejection_reason ?? "Finish verification to keep bookings and payouts moving."}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#8a8f89]" aria-hidden="true" />
                  </Link>
                </li>
              )}
              {pendingChanges.slice(0, 2).map((request) => (
                <li key={`change-${request.id}`}>
                  <Link href={`/host/bookings?booking=${encodeURIComponent(request.booking_id)}`} className="flex items-center gap-3 px-4 py-4 transition hover:bg-[#fbf9f5] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ec1561]/40 sm:px-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff0d8] text-[#9a5b00]"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#12231d]">Guest {request.request_type === "cancellation" ? "cancellation" : "date change"} request</span>
                      <span className="mt-1 block truncate text-sm text-[#747873]">{request.booking.guest_name ?? "Guest"} · {request.booking.listing?.title ?? "Booking"}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#9a5b00]">Review</span>
                  </Link>
                </li>
              ))}
              {unreadBookings.slice(0, 2).map((booking) => (
                <li key={`message-${booking.id}`}>
                  <Link href={`/host/bookings/${encodeURIComponent(booking.id)}`} className="flex items-center gap-3 px-4 py-4 transition hover:bg-[#fbf9f5] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ec1561]/40 sm:px-5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf0f7] text-[#365d80]"><MessageCircle className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#12231d]">Booking message reply · {booking.listing?.title ?? "Booking"}</span>
                      <span className="mt-1 block truncate text-sm text-[#747873]">Booking {booking.booking_reference} · {booking.unreadSupportReplyCount} unread {booking.unreadSupportReplyCount === 1 ? "reply" : "replies"}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[#365d80]">Reply</span>
                  </Link>
                </li>
              ))}
              {attentionDataUnavailable && (
                <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-[#747873] sm:px-5">
                  <span>Some requests or messages could not be checked.</span>
                  <Link href="/host/bookings" className="shrink-0 font-semibold text-[#b30f4b] hover:underline">Open bookings</Link>
                </li>
              )}
              {(pendingChanges.length > 2 || unreadBookings.length > 2) && (
                <li className="px-5 py-3">
                  <Link href="/host/bookings" className="text-sm font-semibold text-[#9C2454] hover:underline">
                    View all {attentionCount} items needing attention
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="min-w-0 border border-[#E9E6DD] bg-white shadow-[0_2px_12px_rgba(27,26,46,0.045)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#12231d]/10 px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase text-[#365d80]">Coming up</p>
              <h2 className="mt-1 text-lg font-semibold text-[#12231d]">Next arrivals</h2>
            </div>
            <Link href="/host/calendar" aria-label="Open host calendar" title="Open calendar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#12231d] transition hover:bg-[#f3efe9] focus:outline-none focus:ring-2 focus:ring-[#ec1561]/40">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-8">
              <p className="text-sm font-semibold text-[#12231d]">No stays on the calendar yet</p>
              <p className="mt-1 text-sm text-[#747873]">Confirmed reservations will appear here with guest and check-in details.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#12231d]/10">
              {upcoming.slice(0, 3).map((booking) => {
                const urgency = getCheckInUrgency(booking.check_in);
                const guide = arrivalGuides?.[booking.listing_id];
                const hasArrivalLocation = Boolean(guide?.arrival_address?.trim() || guide?.arrival_directions?.trim());
                const hasCheckInSteps = Boolean(guide?.check_in_instructions?.trim());
                const guideReady = hasArrivalLocation && hasCheckInSteps;
                const guideEditing = editingArrivalBookingId === booking.id;
                return (
                  <li key={booking.id}>
                    <article className="px-4 py-4 sm:px-5">
                      <div className="flex gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center border border-[#12231d]/10 bg-[#faf8f4] text-center">
                          <span className="text-[10px] font-semibold uppercase text-[#b30f4b]">{formatStayDate(booking.check_in).split(" ")[1]}</span>
                          <span className="text-lg font-semibold leading-5 tabular-nums text-[#12231d]">{formatStayDate(booking.check_in).split(" ")[0]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#12231d]">{booking.listing?.title ?? "Stay booking"}</p>
                          <p className="mt-1 truncate text-sm text-[#747873]">
                            {booking.guest_name ?? "Guest"} · {booking.adults_count} adults · {booking.children_count} children · {formatStayDate(booking.check_in)}–{formatStayDate(booking.check_out)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={booking.status} />
                            {urgency && <span className="text-xs font-medium text-[#8a5a16]">Check-in {urgency.toLowerCase()}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 border-y border-[#12231d]/10 py-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 text-[#565c57]">
                            <MapPin className="h-4 w-4 shrink-0 text-[#747873]" aria-hidden="true" />
                            Arrival location &amp; check-in steps
                          </span>
                          {arrivalGuideError ? (
                            <span className="shrink-0 text-xs font-medium text-[#747873]">Unavailable</span>
                          ) : guideReady ? (
                            <span className="shrink-0 text-xs font-semibold text-[#397653]">Ready</span>
                          ) : (
                            <span className="shrink-0 text-xs font-semibold text-[#9a5b00]">Needs details</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {arrivalGuideError ? (
                          <Link href={`/host/listings/${encodeURIComponent(booking.listing_id)}`} className="text-xs font-medium text-[#365d80] underline decoration-[#365d80]/30 underline-offset-4">View listing details</Link>
                        ) : (
                          <button
                            type="button"
                            aria-expanded={guideEditing}
                            onClick={() => setEditingArrivalBookingId(guideEditing ? null : booking.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#315b47] hover:underline"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {guideEditing ? "Close arrival guide" : guideReady ? "Review arrival guide" : "Complete arrival guide"}
                          </button>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <Link href={`/host/bookings?status=confirmed&booking=${encodeURIComponent(booking.id)}`} className="text-xs font-semibold text-[#365d80] hover:underline">Review guest &amp; stay</Link>
                          <Link href={`/host/bookings/${encodeURIComponent(booking.id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#b30f4b] hover:underline">
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> Contact customer support
                          </Link>
                        </div>
                      </div>

                      {guideEditing && !arrivalGuideError && (
                        <ArrivalGuideQuickEdit
                          key={booking.listing_id}
                          listingId={booking.listing_id}
                          initialGuide={guide ?? null}
                          onSaved={(updatedGuide) => setArrivalGuides((current) => ({ ...current, [booking.listing_id]: updatedGuide }))}
                        />
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/host/bookings?status=confirmed" className="flex items-center justify-between border-t border-[#12231d]/10 px-5 py-3 text-sm font-semibold text-[#12231d] transition hover:bg-[#fbf9f5]">
            View confirmed bookings <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
